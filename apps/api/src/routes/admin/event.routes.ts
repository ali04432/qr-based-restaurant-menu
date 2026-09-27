import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated, sendNoContent } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { z } from 'zod';
import { logStaffAction } from '../../utils/audit';

const router = Router();

const eventSchema = z.object({
  name: z.string().min(1).max(150),
  description: z.string().optional().nullable(),
  eventType: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  isActive: z.boolean().optional(),
  branchId: z.string().uuid().optional().nullable()
});

/**
 * GET /api/admin/events
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user?.role === UserRole.SUPER_ADMIN
        ? (req.query.restaurantId as string) || req.user?.restaurantId
        : req.user?.restaurantId;

      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const events = await prisma.event.findMany({
        where: { restaurantId },
        include: { branch: { select: { name: true } } },
        orderBy: { startDate: 'desc' }
      });

      return sendSuccess(res, events);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/events
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = eventSchema.safeParse(req.body);
      if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));

      const restaurantId = req.user?.role === UserRole.SUPER_ADMIN
        ? (req.body.restaurantId as string) || req.user?.restaurantId
        : req.user?.restaurantId;

      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      if (new Date(parsed.data.endDate) <= new Date(parsed.data.startDate)) {
        return next(new AppError('End date must be after start date', 400, 'VALIDATION_ERROR'));
      }

      if (parsed.data.branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
        if (!branch || branch.restaurantId !== restaurantId) {
          return next(new AppError('Invalid branch ID for this restaurant', 400, 'VALIDATION_ERROR'));
        }
      }

      const event = await prisma.event.create({
        data: {
          restaurantId,
          name: parsed.data.name,
          description: parsed.data.description,
          eventType: parsed.data.eventType,
          startDate: new Date(parsed.data.startDate),
          endDate: new Date(parsed.data.endDate),
          isActive: parsed.data.isActive ?? true,
          branchId: parsed.data.branchId || null
        }
      });

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'EVENT_CREATED', `Created event: ${event.name}`);
      }

      return sendCreated(res, event);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT /api/admin/events/:id
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = eventSchema.safeParse(req.body);
      if (!parsed.success) return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));

      const { id } = req.params;
      const existing = await prisma.event.findUnique({ where: { id } });

      if (!existing) return next(new AppError('Event not found', 404, 'NOT_FOUND'));
      if (req.user?.role !== UserRole.SUPER_ADMIN && existing.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
      }

      if (new Date(parsed.data.endDate) <= new Date(parsed.data.startDate)) {
        return next(new AppError('End date must be after start date', 400, 'VALIDATION_ERROR'));
      }

      if (parsed.data.branchId) {
        const branch = await prisma.branch.findUnique({ where: { id: parsed.data.branchId } });
        if (!branch || branch.restaurantId !== existing.restaurantId) {
          return next(new AppError('Invalid branch ID for this restaurant', 400, 'VALIDATION_ERROR'));
        }
      }

      const event = await prisma.event.update({
        where: { id },
        data: {
          name: parsed.data.name,
          description: parsed.data.description,
          eventType: parsed.data.eventType,
          startDate: new Date(parsed.data.startDate),
          endDate: new Date(parsed.data.endDate),
          isActive: parsed.data.isActive,
          branchId: parsed.data.branchId || null
        }
      });

      if (req.user?.id) {
        await logStaffAction(existing.restaurantId, req.user.id, 'EVENT_UPDATED', `Updated event: ${event.name}`);
      }

      return sendSuccess(res, event);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/events/:id
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await prisma.event.findUnique({ where: { id } });

      if (!existing) return next(new AppError('Event not found', 404, 'NOT_FOUND'));
      if (req.user?.role !== UserRole.SUPER_ADMIN && existing.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
      }

      await prisma.event.delete({ where: { id } });

      if (req.user?.id) {
        await logStaffAction(existing.restaurantId, req.user.id, 'EVENT_DELETED', `Deleted event: ${existing.name}`);
      }

      return sendNoContent(res);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
