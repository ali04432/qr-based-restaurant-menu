
import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import {
  authMiddleware,
  AuthenticatedRequest,
} from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { jobQueue, JobType } from '../../services/job-queue.service';

const router = Router();

/**
 * GET /api/admin/jobs
 * List background jobs with status filter and pagination.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      const {
        status,
        jobType,
        limit = '50',
        offset = '0',
      } = req.query as Record<string, string>;

      const where: any = {};

      if (restaurantId) where.restaurantId = restaurantId;
      if (status) where.status = status;
      if (jobType) where.jobType = jobType;

      const [jobs, total] = await Promise.all([
        prisma.backgroundJobLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: parseInt(limit, 10),
          skip: parseInt(offset, 10),
        }),
        prisma.backgroundJobLog.count({ where }),
      ]);

      return sendSuccess(res, {
        jobs,
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/jobs/stats
 * Queue statistics summary.
 */
router.get(
  '/stats',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      const stats = await jobQueue.getStats(restaurantId || undefined);

      return sendSuccess(res, stats);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/jobs
 * Manually enqueue a background job.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      const {
        jobType,
        payload = {},
        scheduledFor,
        maxRetries = 3,
      } = req.body;

      const validJobTypes: JobType[] = [
        'SCHEDULED_REPORT_DISPATCH',
        'LOYALTY_POINTS_ACCRUE',
        'INVENTORY_REORDER_ALERT',
        'INVOICE_EMAIL',
        'WHATSAPP_NOTIFICATION',
        'SMS_NOTIFICATION',
      ];

      if (!jobType || !validJobTypes.includes(jobType)) {
        return next(
          new AppError(
            `jobType must be one of: ${validJobTypes.join(', ')}`,
            400,
            'VALIDATION_ERROR'
          )
        );
      }

      const job = await jobQueue.enqueue({
        restaurantId: restaurantId || undefined,
        jobType,
        payload,
        scheduledFor: scheduledFor
          ? new Date(scheduledFor)
          : new Date(),
        maxRetries,
      });

      return sendCreated(res, {
        jobId: job.id,
        message: 'Job enqueued successfully',
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/jobs/:id/retry
 * Retry an existing FAILED job.
 *
 * Important:
 * Reuses the existing job instead of creating a duplicate job.
 */
router.post(
  '/:id/retry',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const isSuperAdmin =
        req.user?.role === UserRole.SUPER_ADMIN;

      const job = await prisma.backgroundJobLog.findUnique({
        where: { id: req.params.id },
      });

      if (!job) {
        return next(
          new AppError('Job not found', 404, 'NOT_FOUND')
        );
      }

      // Prevent restaurant admins from retrying another restaurant's jobs.
      if (
        !isSuperAdmin &&
        job.restaurantId !== req.user?.restaurantId
      ) {
        return next(
          new AppError('Job not found', 404, 'NOT_FOUND')
        );
      }

      if (job.status !== 'FAILED') {
        return next(
          new AppError(
            'Only FAILED jobs can be retried',
            400,
            'VALIDATION_ERROR'
          )
        );
      }

      // Atomic update prevents two admins from retrying the same job.
      const updated = await prisma.backgroundJobLog.updateMany({
        where: {
          id: req.params.id,
          status: 'FAILED',
          ...(!isSuperAdmin && {
            restaurantId: req.user?.restaurantId,
          }),
        },
        data: {
          status: 'PENDING',
          retries: 0,
          error: null,
          scheduledFor: new Date(),
          startedAt: null,
          completedAt: null,
          lockedAt: null,
          lockedBy: null,
        },
      });

      if (updated.count === 0) {
        return next(
          new AppError(
            'Job status changed. Refresh and try again.',
            409,
            'CONFLICT'
          )
        );
      }

      // The existing queue worker will pick up this PENDING job.
      // No second enqueue is necessary.

      return sendSuccess(res, {
        message: 'Job reset to PENDING for retry',
        jobId: req.params.id,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/jobs/purge
 * Purge completed/failed jobs older than N days.
 */
router.delete(
  '/purge',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      const { olderThanDays = '7' } =
        req.query as Record<string, string>;

      const cutoff = new Date();
      cutoff.setDate(
        cutoff.getDate() - parseInt(olderThanDays, 10)
      );

      const deleted = await prisma.backgroundJobLog.deleteMany({
        where: {
          ...(restaurantId && { restaurantId }),
          status: {
            in: ['COMPLETED', 'FAILED'],
          },
          createdAt: {
            lt: cutoff,
          },
        },
      });

      return sendSuccess(res, {
        message: `Purged ${deleted.count} completed/failed jobs older than ${olderThanDays} days`,
        purgedCount: deleted.count,
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
