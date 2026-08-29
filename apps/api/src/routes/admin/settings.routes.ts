import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { updateSettingsSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

// In-memory restaurant runtime configuration overrides
const runtimeSettingsMap = new Map<string, {
  currency: string;
  taxRate: number;
  serviceCharge: number;
  isOpen: boolean;
  openingHours: string;
}>();

/**
 * GET /api/admin/settings
 * Retrieve restaurant configuration and operating settings.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });

      if (!restaurant) {
        return next(new AppError('Restaurant not found', 404, 'NOT_FOUND'));
      }

      const runtime = runtimeSettingsMap.get(restaurantId) || {
        currency: 'PKR',
        taxRate: 8.0,
        serviceCharge: 5.0,
        isOpen: true,
        openingHours: '09:00 - 23:00',
      };

      return sendSuccess(res, {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        logo: restaurant.logo || '',
        address: restaurant.address || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        currency: runtime.currency,
        taxRate: runtime.taxRate,
        serviceCharge: runtime.serviceCharge,
        isOpen: runtime.isOpen,
        openingHours: runtime.openingHours,
        createdAt: restaurant.createdAt.toISOString(),
        updatedAt: restaurant.updatedAt.toISOString(),
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/settings
 * Update restaurant settings.
 */
router.patch(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = updateSettingsSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const updated = await prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          ...(parsed.data.name && { name: parsed.data.name }),
          ...(parsed.data.logo !== undefined && { logo: parsed.data.logo }),
          ...(parsed.data.address !== undefined && { address: parsed.data.address }),
          ...(parsed.data.phone !== undefined && { phone: parsed.data.phone }),
          ...(parsed.data.email !== undefined && { email: parsed.data.email }),
        },
      });

      // Update runtime store
      const currentRuntime = runtimeSettingsMap.get(restaurantId) || {
        currency: 'PKR',
        taxRate: 8.0,
        serviceCharge: 5.0,
        isOpen: true,
        openingHours: '09:00 - 23:00',
      };

      if (parsed.data.currency) currentRuntime.currency = parsed.data.currency;
      if (parsed.data.taxRate !== undefined) currentRuntime.taxRate = parsed.data.taxRate;
      if (parsed.data.serviceCharge !== undefined) currentRuntime.serviceCharge = parsed.data.serviceCharge;
      if (parsed.data.isOpen !== undefined) currentRuntime.isOpen = parsed.data.isOpen;
      if (parsed.data.openingHours !== undefined && parsed.data.openingHours !== null) currentRuntime.openingHours = parsed.data.openingHours;

      runtimeSettingsMap.set(restaurantId, currentRuntime);

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'SETTINGS_UPDATED', 'Updated restaurant settings and operating parameters');
      }

      return sendSuccess(res, {
        ...updated,
        ...currentRuntime,
      }, { message: 'Settings saved successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
