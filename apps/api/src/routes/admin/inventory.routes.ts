import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { stockAdjustmentSchema, lowStockThresholdSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/inventory
 * List all items with current stock, threshold, cost price, and stock status.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CHEF
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

      const { status, categoryId, search } = req.query as Record<string, string>;

      const menuItems = await prisma.menuItem.findMany({
        where: {
          restaurantId,
          ...(categoryId && { categoryId }),
          ...(search && {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }),
        },
        include: {
          category: { select: { id: true, name: true } },
          inventory: true,
        },
        orderBy: { name: 'asc' },
      });

      const inventoryList = menuItems.map((item) => {
        const stockCount = item.stockCount ?? item.inventory[0]?.stockCount ?? 0;
        const lowStockThreshold = item.inventory[0]?.lowStockThreshold ?? 10;
        
        let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK';
        if (stockCount <= 0) {
          stockStatus = 'OUT_OF_STOCK';
        } else if (stockCount <= lowStockThreshold) {
          stockStatus = 'LOW_STOCK';
        }

        return {
          id: item.inventory[0]?.id || item.id,
          menuItemId: item.id,
          name: item.name,
          categoryName: item.category?.name || 'General',
          categoryId: item.categoryId,
          price: item.price,
          costPrice: item.costPrice ?? 0,
          stockCount,
          lowStockThreshold,
          status: stockStatus,
          isAvailable: item.isAvailable,
          image: item.image,
          lastUpdated: item.updatedAt.toISOString(),
        };
      });

      // Filter by stock status if requested
      const filtered = status && status !== 'ALL'
        ? inventoryList.filter((i) => i.status === status)
        : inventoryList;

      return sendSuccess(res, filtered);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/inventory/:id/adjust
 * Transactional stock adjustment (SET, INCREASE, DECREASE)
 */
router.patch(
  '/:id/adjust',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params; // menuItemId or inventoryId
      const parsed = stockAdjustmentSchema.safeParse({ ...req.body, menuItemId: id });
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const { adjustmentType, quantity, reason } = parsed.data;

      // Find item
      const item = await prisma.menuItem.findFirst({
        where: {
          OR: [{ id }, { inventory: { some: { id } } }],
        },
        include: { inventory: true },
      });

      if (!item) {
        return next(new AppError('Item not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && item.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const currentStock = item.stockCount ?? item.inventory[0]?.stockCount ?? 0;
      let newStock = currentStock;

      if (adjustmentType === 'SET') {
        newStock = quantity;
      } else if (adjustmentType === 'INCREASE') {
        newStock = currentStock + quantity;
      } else if (adjustmentType === 'DECREASE') {
        newStock = currentStock - quantity;
        if (newStock < 0) {
          return next(new AppError(`Cannot decrease stock below zero. Current stock is ${currentStock}.`, 400, 'INVALID_QUANTITY'));
        }
      }

      // Atomic update
      const updated = await prisma.$transaction(async (tx) => {
        const updatedItem = await tx.menuItem.update({
          where: { id: item.id },
          data: { stockCount: newStock },
        });

        await tx.inventory.upsert({
          where: { menuItemId: item.id },
          create: {
            restaurantId: item.restaurantId,
            menuItemId: item.id,
            stockCount: newStock,
            lowStockThreshold: item.inventory[0]?.lowStockThreshold ?? 10,
          },
          update: {
            stockCount: newStock,
          },
        });

        return updatedItem;
      });

      // Log staff action
      if (req.user?.id) {
        await logStaffAction(
          item.restaurantId,
          req.user.id,
          'INVENTORY_ADJUSTED',
          `Stock for "${item.name}" changed from ${currentStock} to ${newStock} (${adjustmentType} ${quantity}). Reason: ${reason || 'Manual adjustment'}`
        );
      }

      return sendSuccess(res, {
        menuItemId: item.id,
        name: item.name,
        previousStock: currentStock,
        newStock,
        updatedAt: updated.updatedAt.toISOString(),
      }, { message: `Stock for "${item.name}" updated to ${newStock}` });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/inventory/:id/threshold
 * Update low-stock alert threshold.
 */
router.patch(
  '/:id/threshold',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = lowStockThresholdSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const item = await prisma.menuItem.findFirst({
        where: { OR: [{ id }, { inventory: { some: { id } } }] },
      });

      if (!item) {
        return next(new AppError('Item not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && item.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      await prisma.inventory.upsert({
        where: { menuItemId: item.id },
        create: {
          restaurantId: item.restaurantId,
          menuItemId: item.id,
          stockCount: item.stockCount ?? 0,
          lowStockThreshold: parsed.data.threshold,
        },
        update: { lowStockThreshold: parsed.data.threshold },
      });

      if (req.user?.id) {
        await logStaffAction(
          item.restaurantId,
          req.user.id,
          'THRESHOLD_UPDATED',
          `Low stock threshold for "${item.name}" set to ${parsed.data.threshold}`
        );
      }

      return sendSuccess(res, { threshold: parsed.data.threshold }, { message: 'Low stock threshold updated' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/inventory/intelligence
 * Phase 4 AI Inventory Intelligence & Stock Velocity Analytics.
 */
router.get(
  '/intelligence',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const lookbackDays = 30;
      const now = new Date();
      const lookbackStart = new Date(now);
      lookbackStart.setDate(now.getDate() - lookbackDays);
      lookbackStart.setHours(0, 0, 0, 0);

      const [menuItems, historicalOrders] = await Promise.all([
        prisma.menuItem.findMany({
          where: { restaurantId, isAvailable: true },
          include: { category: { select: { name: true } }, inventory: true },
        }),
        prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: lookbackStart },
            status: { not: 'CANCELLED' as any },
          },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      // Calculate consumption velocity per item
      const itemConsumption = new Map<string, { quantity: number; lastSoldDate: Date | null }>();
      menuItems.forEach((m) => {
        itemConsumption.set(m.id, { quantity: 0, lastSoldDate: null });
      });

      historicalOrders.forEach((order) => {
        order.items.forEach((item) => {
          const curr = itemConsumption.get(item.menuItemId);
          if (curr) {
            curr.quantity += item.quantity;
            if (!curr.lastSoldDate || order.createdAt > curr.lastSoldDate) {
              curr.lastSoldDate = order.createdAt;
            }
          }
        });
      });

      let totalInventoryValuation = 0;
      let deadStockValue = 0;

      const fastMovingItems: Array<{
        menuItemId: string;
        name: string;
        categoryName: string;
        dailyVelocity: number;
        currentStock: number;
        daysOfStockLeft: number;
      }> = [];

      const slowMovingItems: Array<{
        menuItemId: string;
        name: string;
        categoryName: string;
        daysWithoutSale: number;
        currentStock: number;
        tiedUpCapital: number;
      }> = [];

      const reorderRecommendations: Array<{
        menuItemId: string;
        name: string;
        currentStock: number;
        recommendedReorderQty: number;
        urgency: 'CRITICAL' | 'SOON' | 'OPTIMAL';
      }> = [];

      menuItems.forEach((item) => {
        const stock = item.stockCount ?? item.inventory[0]?.stockCount ?? 0;
        const threshold = item.inventory[0]?.lowStockThreshold ?? 10;
        const unitCost = item.costPrice || item.price * 0.4;
        const itemValuation = Math.round(stock * unitCost);
        totalInventoryValuation += itemValuation;

        const cons = itemConsumption.get(item.id) || { quantity: 0, lastSoldDate: null };
        const dailyVelocity = parseFloat((cons.quantity / lookbackDays).toFixed(2));
        const daysOfStock = dailyVelocity > 0 ? parseFloat((stock / dailyVelocity).toFixed(1)) : 99;

        // Days without sale
        let daysWithoutSale = lookbackDays;
        if (cons.lastSoldDate) {
          const diffMs = now.getTime() - cons.lastSoldDate.getTime();
          daysWithoutSale = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        if (dailyVelocity >= 1.0) {
          fastMovingItems.push({
            menuItemId: item.id,
            name: item.name,
            categoryName: item.category?.name || 'General',
            dailyVelocity,
            currentStock: stock,
            daysOfStockLeft: daysOfStock,
          });
        }

        if (cons.quantity <= 2 && stock > 0) {
          const tiedUp = Math.round(stock * unitCost);
          deadStockValue += tiedUp;
          slowMovingItems.push({
            menuItemId: item.id,
            name: item.name,
            categoryName: item.category?.name || 'General',
            daysWithoutSale,
            currentStock: stock,
            tiedUpCapital: tiedUp,
          });
        }

        // Reorder recommendation
        if (stock <= threshold || daysOfStock <= 4) {
          const recommendedQty = Math.max(15, Math.round(Math.max(dailyVelocity * 7, 10)));
          const urgency: 'CRITICAL' | 'SOON' | 'OPTIMAL' =
            stock <= 0 || daysOfStock <= 1 ? 'CRITICAL' : daysOfStock <= 3 ? 'SOON' : 'OPTIMAL';

          reorderRecommendations.push({
            menuItemId: item.id,
            name: item.name,
            currentStock: stock,
            recommendedReorderQty: recommendedQty,
            urgency,
          });
        }
      });

      fastMovingItems.sort((a, b) => b.dailyVelocity - a.dailyVelocity);
      slowMovingItems.sort((a, b) => b.tiedUpCapital - a.tiedUpCapital);
      reorderRecommendations.sort((a, b) => {
        const priority = { CRITICAL: 0, SOON: 1, OPTIMAL: 2 };
        return priority[a.urgency] - priority[b.urgency];
      });

      const result = {
        fastMovingItems: fastMovingItems.slice(0, 8),
        slowMovingItems: slowMovingItems.slice(0, 8),
        reorderRecommendations: reorderRecommendations.slice(0, 10),
        totalInventoryValuation,
        deadStockValue,
      };

      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/inventory/history
 * List historical inventory adjustments and audit logs.
 */
router.get(
  '/history',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const logs = await prisma.staffActionLog.findMany({
        where: {
          restaurantId,
          action: { in: ['INVENTORY_ADJUSTED', 'THRESHOLD_UPDATED', 'STOCK_DEDUCTION'] },
        },
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const formatted = logs.map((l) => ({
        id: l.id,
        staffName: l.user?.name || 'System / Staff',
        staffRole: l.user?.role,
        action: l.action,
        details: l.details,
        createdAt: l.createdAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;

