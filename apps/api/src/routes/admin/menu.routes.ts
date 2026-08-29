import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { createMenuItemAdminSchema, updateMenuItemAdminSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/menu/items
 * List all menu items for the restaurant with category details and stock levels.
 */
router.get(
  '/items',
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

      const { categoryId, isAvailable, search } = req.query as Record<string, string>;

      const items = await prisma.menuItem.findMany({
        where: {
          restaurantId,
          ...(categoryId && { categoryId }),
          ...(isAvailable !== undefined && { isAvailable: isAvailable === 'true' }),
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

      const formatted = items.map((item) => {
        const stock = item.stockCount ?? item.inventory[0]?.stockCount ?? null;
        const threshold = item.inventory[0]?.lowStockThreshold ?? 10;
        let stockStatus = 'IN_STOCK';
        if (stock !== null) {
          if (stock === 0) stockStatus = 'OUT_OF_STOCK';
          else if (stock <= threshold) stockStatus = 'LOW_STOCK';
        }

        return {
          id: item.id,
          restaurantId: item.restaurantId,
          categoryId: item.categoryId,
          categoryName: item.category?.name || 'General',
          name: item.name,
          description: item.description,
          price: item.price,
          costPrice: item.costPrice ?? 0,
          stockCount: stock,
          lowStockThreshold: threshold,
          stockStatus,
          isAvailable: item.isAvailable,
          isFeatured: item.isFeatured,
          isPopular: item.isPopular,
          prepTimeMin: item.prepTimeMin,
          prepTimeMax: item.prepTimeMax,
          badge: item.badge,
          tags: item.tags,
          image: item.image,
          createdAt: item.createdAt.toISOString(),
          updatedAt: item.updatedAt.toISOString(),
        };
      });

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/menu/items
 * Create a new menu item and initialize inventory record.
 */
router.post(
  '/items',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createMenuItemAdminSchema.safeParse(req.body);
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

      const newItem = await prisma.$transaction(async (tx) => {
        const item = await tx.menuItem.create({
          data: {
            restaurantId,
            categoryId: parsed.data.categoryId,
            name: parsed.data.name,
            description: parsed.data.description || null,
            price: parsed.data.price,
            costPrice: parsed.data.costPrice ?? 0,
            stockCount: parsed.data.stockCount ?? null,
            isAvailable: parsed.data.isAvailable,
            isFeatured: parsed.data.isFeatured,
            isPopular: parsed.data.isPopular,
            prepTimeMin: parsed.data.prepTimeMin,
            prepTimeMax: parsed.data.prepTimeMax,
            badge: parsed.data.badge || null,
            tags: parsed.data.tags || [],
            image: parsed.data.image || null,
          },
          include: { category: { select: { name: true } } },
        });

        // Initialize inventory record
        if (parsed.data.stockCount !== undefined && parsed.data.stockCount !== null) {
          await tx.inventory.create({
            data: {
              restaurantId,
              menuItemId: item.id,
              stockCount: parsed.data.stockCount,
              lowStockThreshold: parsed.data.lowStockThreshold ?? 10,
            },
          });
        }

        return item;
      });

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'MENU_ITEM_CREATED', `Dish "${newItem.name}" created`);
      }

      return sendCreated(res, newItem, 'Menu item created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/menu/items/:id
 * Update menu item details.
 */
router.patch(
  '/items/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updateMenuItemAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const item = await prisma.menuItem.findUnique({
        where: { id },
        include: { inventory: true },
      });

      if (!item) {
        return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && item.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updated = await prisma.$transaction(async (tx) => {
        const updatedItem = await tx.menuItem.update({
          where: { id },
          data: {
            ...(parsed.data.name !== undefined && { name: parsed.data.name }),
            ...(parsed.data.categoryId !== undefined && { categoryId: parsed.data.categoryId }),
            ...(parsed.data.description !== undefined && { description: parsed.data.description }),
            ...(parsed.data.price !== undefined && { price: parsed.data.price }),
            ...(parsed.data.costPrice !== undefined && { costPrice: parsed.data.costPrice }),
            ...(parsed.data.stockCount !== undefined && { stockCount: parsed.data.stockCount }),
            ...(parsed.data.isAvailable !== undefined && { isAvailable: parsed.data.isAvailable }),
            ...(parsed.data.isFeatured !== undefined && { isFeatured: parsed.data.isFeatured }),
            ...(parsed.data.isPopular !== undefined && { isPopular: parsed.data.isPopular }),
            ...(parsed.data.prepTimeMin !== undefined && { prepTimeMin: parsed.data.prepTimeMin }),
            ...(parsed.data.prepTimeMax !== undefined && { prepTimeMax: parsed.data.prepTimeMax }),
            ...(parsed.data.badge !== undefined && { badge: parsed.data.badge }),
            ...(parsed.data.tags !== undefined && { tags: parsed.data.tags }),
            ...(parsed.data.image !== undefined && { image: parsed.data.image }),
          },
          include: { category: { select: { name: true } } },
        });

        // Sync inventory table if stockCount or threshold was modified
        if (parsed.data.stockCount !== undefined || parsed.data.lowStockThreshold !== undefined) {
          const newThreshold = parsed.data.lowStockThreshold ?? item.inventory[0]?.lowStockThreshold ?? 10;
          await tx.inventory.upsert({
            where: { menuItemId: id },
            create: {
              restaurantId: item.restaurantId,
              menuItemId: id,
              stockCount: parsed.data.stockCount ?? item.stockCount ?? 0,
              lowStockThreshold: newThreshold,
            },
            update: {
              ...(parsed.data.stockCount !== undefined && { stockCount: parsed.data.stockCount ?? 0 }),
              ...(parsed.data.lowStockThreshold !== undefined && { lowStockThreshold: parsed.data.lowStockThreshold }),
            },
          });
        }

        return updatedItem;
      });

      if (req.user?.id) {
        await logStaffAction(item.restaurantId, req.user.id, 'MENU_ITEM_UPDATED', `Dish "${updated.name}" updated`);
      }

      return sendSuccess(res, updated, { message: 'Menu item updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/menu/items/:id
 * Safe delete or deactivate a menu item.
 */
router.delete(
  '/items/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const item = await prisma.menuItem.findUnique({
        where: { id },
        include: { _count: { select: { orderItems: true } } },
      });

      if (!item) {
        return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && item.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      // If historical orders reference this item, mark isAvailable = false to preserve order histories
      if (item._count.orderItems > 0) {
        await prisma.menuItem.update({
          where: { id },
          data: { isAvailable: false },
        });
        return sendSuccess(res, { id, status: 'DEACTIVATED' }, {
          message: `Dish "${item.name}" has historical order records, so it was deactivated from active menus instead of permanently deleted.`,
        });
      }

      await prisma.menuItem.delete({ where: { id } });

      if (req.user?.id) {
        await logStaffAction(item.restaurantId, req.user.id, 'MENU_ITEM_DELETED', `Dish "${item.name}" permanently deleted`);
      }

      return sendSuccess(res, { id }, { message: `Dish "${item.name}" deleted successfully` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
