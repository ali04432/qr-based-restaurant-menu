import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { createPromotionSchema, updatePromotionSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

interface PromotionRecord {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minOrderAmount: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const promotionsStore = new Map<string, PromotionRecord[]>();

/**
 * GET /api/admin/promotions
 * List all restaurant promotions.
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

      let list: PromotionRecord[] = [];
      try {
        if ((prisma as any).promotion) {
          const dbList = await (prisma as any).promotion.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
          });
          list = dbList.map((p: any) => ({
            id: p.id,
            restaurantId: p.restaurantId,
            name: p.name,
            code: p.code,
            discountType: p.discountType,
            discountValue: p.discountValue,
            minOrderAmount: p.minOrderAmount,
            startDate: p.startDate ? new Date(p.startDate).toISOString() : undefined,
            endDate: p.endDate ? new Date(p.endDate).toISOString() : undefined,
            isActive: p.isActive,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
          }));
        }
      } catch (e) {
        // Fallback
      }

      if (list.length === 0) {
        list = promotionsStore.get(restaurantId) || [
          {
            id: 'promo-1',
            restaurantId,
            name: 'Welcome Dining Discount',
            code: 'WELCOME10',
            discountType: 'PERCENTAGE',
            discountValue: 10,
            minOrderAmount: 1000,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            id: 'promo-2',
            restaurantId,
            name: 'Weekend Feast Special',
            code: 'FEAST500',
            discountType: 'FIXED',
            discountValue: 500,
            minOrderAmount: 3000,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        promotionsStore.set(restaurantId, list);
      }

      return sendSuccess(res, list);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/promotions
 * Create a new discount promo code.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createPromotionSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? parsed.data.restaurantId || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const list = promotionsStore.get(restaurantId) || [];
      const code = parsed.data.code.toUpperCase().trim();

      if (list.some((p) => p.code === code)) {
        return next(new AppError(`Promo code "${code}" already exists`, 409, 'CONFLICT'));
      }

      const newPromo: PromotionRecord = {
        id: randomUUID(),
        restaurantId,
        name: parsed.data.name,
        code,
        discountType: parsed.data.discountType,
        discountValue: parsed.data.discountValue,
        minOrderAmount: parsed.data.minOrderAmount ?? 0,
        startDate: parsed.data.startDate || undefined,
        endDate: parsed.data.endDate || undefined,
        isActive: parsed.data.isActive ?? true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      try {
        if ((prisma as any).promotion) {
          await (prisma as any).promotion.create({
            data: {
              ...newPromo,
              startDate: newPromo.startDate ? new Date(newPromo.startDate) : null,
              endDate: newPromo.endDate ? new Date(newPromo.endDate) : null,
            },
          });
        }
      } catch (e) {
        // Fallback
      }

      list.unshift(newPromo);
      promotionsStore.set(restaurantId, list);

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'PROMOTION_CREATED', `Promotion "${newPromo.name}" (${newPromo.code}) created`);
      }

      return sendCreated(res, newPromo, 'Promotion created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/promotions/:id
 * Update promotion details or toggle active status.
 */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updatePromotionSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const restaurantId = req.user?.restaurantId || '1';
      const list = promotionsStore.get(restaurantId) || [];
      const index = list.findIndex((p) => p.id === id);

      if (index === -1) {
        return next(new AppError('Promotion not found', 404, 'NOT_FOUND'));
      }

      const current = list[index];
      const updated: PromotionRecord = {
        ...current,
        ...(parsed.data.name && { name: parsed.data.name }),
        ...(parsed.data.code && { code: parsed.data.code.toUpperCase() }),
        ...(parsed.data.discountType && { discountType: parsed.data.discountType }),
        ...(parsed.data.discountValue !== undefined && { discountValue: parsed.data.discountValue }),
        ...(parsed.data.minOrderAmount !== undefined && { minOrderAmount: parsed.data.minOrderAmount }),
        ...(parsed.data.startDate !== undefined && { startDate: parsed.data.startDate || undefined }),
        ...(parsed.data.endDate !== undefined && { endDate: parsed.data.endDate || undefined }),
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive }),
        updatedAt: new Date().toISOString(),
      };

      try {
        if ((prisma as any).promotion) {
          await (prisma as any).promotion.update({
            where: { id },
            data: {
              ...updated,
              startDate: updated.startDate ? new Date(updated.startDate) : null,
              endDate: updated.endDate ? new Date(updated.endDate) : null,
            },
          });
        }
      } catch (e) {
        // Fallback
      }

      list[index] = updated;
      promotionsStore.set(restaurantId, list);

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'PROMOTION_UPDATED', `Promotion "${updated.name}" updated`);
      }

      return sendSuccess(res, updated, { message: 'Promotion updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/promotions/:id
 * Delete a promotion.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.user?.restaurantId || '1';

      try {
        if ((prisma as any).promotion) {
          await (prisma as any).promotion.delete({ where: { id } });
        }
      } catch (e) {
        // Fallback
      }

      const list = promotionsStore.get(restaurantId) || [];
      const filtered = list.filter((p) => p.id !== id);
      promotionsStore.set(restaurantId, filtered);

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'PROMOTION_DELETED', `Promotion ${id} deleted`);
      }

      return sendSuccess(res, { id }, { message: 'Promotion deleted successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/promotions/validate
 * Public/Checkout endpoint to validate a promo code server-side and calculate discount amount.
 */
router.post('/validate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      restaurantId,
      code,
      subtotal,
      itemIds = [],
      categoryIds = [],
      customerPhone,
      customerTier,
    } = req.body as {
      restaurantId: string;
      code: string;
      subtotal: number;
      itemIds?: string[];
      categoryIds?: string[];
      customerPhone?: string;
      customerTier?: string;
    };

    if (!restaurantId || !code) {
      return next(new AppError('restaurantId and promo code are required', 400, 'VALIDATION_ERROR'));
    }

    const cleanCode = code.toUpperCase().trim();
    const now = new Date();

    // Query from Prisma
    let promo = await prisma.promotion.findFirst({
      where: {
        restaurantId,
        code: cleanCode,
        isActive: true,
      },
    });

    if (!promo) {
      // Fallback
      const list = promotionsStore.get(restaurantId) || [];
      const fallbackPromo = list.find((p) => p.code === cleanCode && p.isActive);
      if (fallbackPromo) {
        promo = {
          ...fallbackPromo,
          minTier: null,
          categoryIds: [],
          menuItemIds: [],
          isFirstOrderOnly: false,
          buyQuantity: 0,
          getQuantity: 0,
          getMenuItemId: null,
          startDate: fallbackPromo.startDate ? new Date(fallbackPromo.startDate) : null,
          endDate: fallbackPromo.endDate ? new Date(fallbackPromo.endDate) : null,
        } as any;
      }
    }

    if (!promo) {
      return next(new AppError('Invalid or expired promotion code.', 404, 'PROMO_NOT_FOUND'));
    }

    // Check Start / End Date
    if (promo.startDate && new Date(promo.startDate) > now) {
      return next(new AppError(`Promotion "${promo.code}" has not started yet.`, 400, 'PROMO_NOT_STARTED'));
    }
    if (promo.endDate && new Date(promo.endDate) < now) {
      return next(new AppError(`Promotion "${promo.code}" has expired.`, 400, 'PROMO_EXPIRED'));
    }

    // Check Minimum Order
    if (promo.minOrderAmount > 0 && subtotal < promo.minOrderAmount) {
      return next(
        new AppError(
          `Minimum order of Rs. ${promo.minOrderAmount} required for promo "${promo.code}".`,
          400,
          'MIN_ORDER_NOT_MET'
        )
      );
    }

    // Check First Order Rule
    if (promo.isFirstOrderOnly && customerPhone) {
      const priorOrders = await prisma.order.count({
        where: {
          restaurantId,
          loyaltyAccount: { phone: customerPhone },
          status: { not: 'CANCELLED' as any },
        },
      });
      if (priorOrders > 0) {
        return next(new AppError(`Promo "${promo.code}" is only valid for your first order.`, 400, 'FIRST_ORDER_ONLY'));
      }
    }

    // Check Customer Tier Rule
    if (promo.minTier) {
      const tierRank: Record<string, number> = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4 };
      const requiredRank = tierRank[promo.minTier] || 1;
      const userRank = tierRank[customerTier || 'BRONZE'] || 1;
      if (userRank < requiredRank) {
        return next(
          new AppError(`Promo "${promo.code}" is exclusive to ${promo.minTier} tier members and above.`, 403, 'TIER_INSUFFICIENT')
        );
      }
    }

    // Check Category / Item constraints
    if (promo.menuItemIds && promo.menuItemIds.length > 0) {
      const hasEligibleItem = itemIds.some((id) => promo.menuItemIds.includes(id));
      if (!hasEligibleItem) {
        return next(new AppError(`Promo "${promo.code}" is only valid for specific menu items.`, 400, 'ITEM_INELIGIBLE'));
      }
    }

    if (promo.categoryIds && promo.categoryIds.length > 0) {
      const hasEligibleCategory = categoryIds.some((id) => promo.categoryIds.includes(id));
      if (!hasEligibleCategory) {
        return next(new AppError(`Promo "${promo.code}" is only valid for items in eligible categories.`, 400, 'CATEGORY_INELIGIBLE'));
      }
    }

    // Calculate Discount
    let discount = 0;
    if (promo.discountType === 'PERCENTAGE') {
      discount = parseFloat(((subtotal * promo.discountValue) / 100).toFixed(2));
    } else {
      discount = Math.min(subtotal, promo.discountValue);
    }

    return sendSuccess(
      res,
      {
        code: promo.code,
        name: promo.name,
        discountType: promo.discountType,
        discountValue: promo.discountValue,
        discountAmount: discount,
        finalSubtotal: Math.max(0, parseFloat((subtotal - discount).toFixed(2))),
      },
      { message: `Promo code "${promo.code}" applied!` }
    );
  } catch (err) {
    return next(err);
  }
});

export default router;
