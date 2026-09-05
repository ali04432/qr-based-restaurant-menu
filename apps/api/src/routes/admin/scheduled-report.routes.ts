import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { jobQueue } from '../../services/job-queue.service';

const router = Router();

// ──────────────────────────────────────────────
// Helper: compute next run time from frequency
// ──────────────────────────────────────────────
function computeNextRun(frequency: string, from: Date = new Date()): Date {
  const next = new Date(from);
  if (frequency === 'DAILY') {
    next.setDate(next.getDate() + 1);
    next.setHours(6, 0, 0, 0); // 6 AM daily
  } else if (frequency === 'WEEKLY') {
    next.setDate(next.getDate() + 7);
    next.setHours(6, 0, 0, 0);
  } else if (frequency === 'MONTHLY') {
    next.setMonth(next.getMonth() + 1, 1);
    next.setHours(6, 0, 0, 0);
  }
  return next;
}

/**
 * GET /api/admin/scheduled-reports
 * List all scheduled reports for a restaurant.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      }

      const reports = await prisma.scheduledReport.findMany({
        where: { restaurantId },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, reports);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/scheduled-reports
 * Create a new scheduled report configuration.
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

      if (!restaurantId) {
        return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      }

      const { reportType, frequency, recipients, format = 'CSV', isActive = true } = req.body;

      if (!reportType || !frequency || !recipients?.length) {
        return next(new AppError('reportType, frequency, and recipients are required', 400, 'VALIDATION_ERROR'));
      }

      const validReportTypes = ['SALES', 'PROFIT', 'INVENTORY', 'STAFF', 'LOYALTY', 'TAX'];
      if (!validReportTypes.includes(reportType)) {
        return next(new AppError(`reportType must be one of: ${validReportTypes.join(', ')}`, 400, 'VALIDATION_ERROR'));
      }

      const nextRunAt = computeNextRun(frequency);

      const report = await prisma.scheduledReport.create({
        data: {
          restaurantId,
          reportType,
          frequency,
          recipients: Array.isArray(recipients) ? recipients : [recipients],
          format,
          isActive,
          nextRunAt,
        },
      });

      return sendCreated(res, report, 'Scheduled report created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/scheduled-reports/:id
 * Update an existing scheduled report.
 */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      }

      const existing = await prisma.scheduledReport.findFirst({
        where: { id: req.params.id, restaurantId },
      });

      if (!existing) {
        return next(new AppError('Scheduled report not found', 404, 'NOT_FOUND'));
      }

      const { reportType, frequency, recipients, format, isActive } = req.body;

      const nextRunAt = frequency && frequency !== existing.frequency
        ? computeNextRun(frequency)
        : existing.nextRunAt;

      const updated = await prisma.scheduledReport.update({
        where: { id: req.params.id },
        data: {
          ...(reportType && { reportType }),
          ...(frequency && { frequency }),
          ...(recipients && { recipients: Array.isArray(recipients) ? recipients : [recipients] }),
          ...(format && { format }),
          ...(typeof isActive !== 'undefined' && { isActive }),
          nextRunAt,
          updatedAt: new Date(),
        },
      });

      return sendSuccess(res, updated);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/scheduled-reports/:id
 * Remove a scheduled report.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      }

      const existing = await prisma.scheduledReport.findFirst({
        where: { id: req.params.id, restaurantId },
      });

      if (!existing) {
        return next(new AppError('Scheduled report not found', 404, 'NOT_FOUND'));
      }

      await prisma.scheduledReport.delete({ where: { id: req.params.id } });

      return sendSuccess(res, { message: 'Scheduled report deleted successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/scheduled-reports/:id/run-now
 * Manually trigger immediate dispatch of a scheduled report.
 */
router.post(
  '/:id/run-now',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      }

      const report = await prisma.scheduledReport.findFirst({
        where: { id: req.params.id, restaurantId },
      });

      if (!report) {
        return next(new AppError('Scheduled report not found', 404, 'NOT_FOUND'));
      }

      // Enqueue a background job for immediate execution
      const job = await jobQueue.enqueue({
        restaurantId,
        jobType: 'SCHEDULED_REPORT_DISPATCH',
        payload: {
          scheduledReportId: report.id,
          reportType: report.reportType,
          recipients: report.recipients,
          format: report.format,
          triggeredBy: req.user?.id,
          triggeredManually: true,
        },
        scheduledFor: new Date(), // run immediately
      });

      // Update last run timestamp
      await prisma.scheduledReport.update({
        where: { id: report.id },
        data: {
          lastRunAt: new Date(),
          nextRunAt: computeNextRun(report.frequency),
        },
      });

      return sendSuccess(res, {
        message: `${report.reportType} report dispatched to ${report.recipients.length} recipient(s)`,
        jobId: job.id,
        reportType: report.reportType,
        recipients: report.recipients,
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
