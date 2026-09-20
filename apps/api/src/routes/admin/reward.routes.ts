import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole, CreateRewardSchema, UpdateRewardSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/rewards
 * List all rewards for the restaurant.
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
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const rewards = await prisma.reward.findMany({
        where: { restaurantId },
        include: {
          menuItem: { select: { id: true, name: true, price: true, image: true } },
          _count: { select: { redemptions: true } },
        },
        orderBy: { pointsCost: 'asc' },
      });

      return sendSuccess(res, rewards);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/rewards
 * Create a new loyalty reward.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = CreateRewardSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR'));
      }

      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? parsed.data.restaurantId || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { name, description, rewardType, discountValue, menuItemId, pointsCost, minOrderAmount, isActive, expiryDays } =
        parsed.data;

      const reward = await prisma.reward.create({
        data: {
          restaurantId,
          name: name.trim(),
          description: description || null,
          rewardType: rewardType as any,
          discountValue: discountValue || 0,
          menuItemId: menuItemId || null,
          pointsCost,
          minOrderAmount: minOrderAmount || 0,
          isActive: isActive !== undefined ? isActive : true,
          expiryDays: expiryDays || 30,
        },
        include: {
          menuItem: { select: { id: true, name: true, price: true, image: true } },
        },
      });

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'REWARD_CREATED', `Created reward "${reward.name}" (${reward.pointsCost} pts)`);
      }

      return sendCreated(res, reward, 'Reward created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT /api/admin/rewards/:id
 * Update an existing reward.
 */
router.put(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = UpdateRewardSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR'));
      }

      const existing = await prisma.reward.findUnique({ where: { id } });
      if (!existing) {
        return next(new AppError('Reward not found', 404, 'NOT_FOUND'));
      }

      const updated = await prisma.reward.update({
        where: { id },
        data: {
          name: parsed.data.name?.trim(),
          description: parsed.data.description,
          rewardType: parsed.data.rewardType as any,
          discountValue: parsed.data.discountValue,
          menuItemId: parsed.data.menuItemId,
          pointsCost: parsed.data.pointsCost,
          minOrderAmount: parsed.data.minOrderAmount,
          isActive: parsed.data.isActive,
          expiryDays: parsed.data.expiryDays,
        },
        include: {
          menuItem: { select: { id: true, name: true, price: true, image: true } },
        },
      });

      if (req.user?.id) {
        await logStaffAction(existing.restaurantId, req.user.id, 'REWARD_UPDATED', `Updated reward "${updated.name}"`);
      }

      return sendSuccess(res, updated, { message: 'Reward updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/rewards/:id
 * Delete a reward.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const existing = await prisma.reward.findUnique({ where: { id } });
      if (!existing) {
        return next(new AppError('Reward not found', 404, 'NOT_FOUND'));
      }

      await prisma.reward.delete({ where: { id } });

      if (req.user?.id) {
        await logStaffAction(existing.restaurantId, req.user.id, 'REWARD_DELETED', `Deleted reward "${existing.name}"`);
      }

      return sendSuccess(res, { id }, { message: 'Reward deleted successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
