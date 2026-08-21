import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

// ============================================================
// Menu Routes
// Public endpoints return menu data for customer-facing page.
// Staff endpoints require authentication.
//
// GET  /api/menu/categories               — list all categories for a restaurant
// GET  /api/menu/items                    — list menu items (filterable)
// GET  /api/menu/items/:id                — get a single menu item
// POST /api/menu/items         (staff)    — create a menu item
// PATCH /api/menu/items/:id    (staff)    — update a menu item
// DELETE /api/menu/items/:id   (staff)    — remove a menu item
// ============================================================

const router = Router();

/**
 * GET /api/menu/categories?restaurantId=<id>
 * Returns all active categories for the given restaurant.
 */
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId } = req.query as { restaurantId?: string };

  if (!restaurantId) {
    return next(new AppError('restaurantId query parameter is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const categories = await prisma.menuCategory.findMany({
      where: { restaurantId, isActive: true },
      orderBy: { order: 'asc' },
    });
    return sendSuccess(res, categories);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/menu/items?restaurantId=<id>&categoryId=<id>&q=<search>
 * Returns menu items for a restaurant, optionally filtered by category or search query.
 */
router.get('/items', async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId, categoryId, q } = req.query as {
    restaurantId?: string;
    categoryId?: string;
    q?: string;
  };

  if (!restaurantId) {
    return next(new AppError('restaurantId query parameter is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const items = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        ...(categoryId && { categoryId }),
        ...(q && {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      orderBy: { name: 'asc' },
    });
    return sendSuccess(res, items);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/menu/items/:id
 * Returns a single menu item by ID.
 */
router.get('/items/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const item = await prisma.menuItem.findUnique({ where: { id } });
    if (!item || !item.isAvailable) {
      return next(new AppError('Menu item not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, item);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/menu/items (MANAGER, ADMIN, SUPER_ADMIN)
 * Creates a new menu item.
 */
router.post(
  '/items',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const { restaurantId, categoryId, name, description, price, image, prepTimeMin, prepTimeMax, tags, badge } = req.body;

    if (!restaurantId || !categoryId || !name || price === undefined) {
      return next(new AppError('Missing required fields: restaurantId, categoryId, name, price', 400, 'VALIDATION_ERROR'));
    }

    try {
      const item = await prisma.menuItem.create({
        data: {
          restaurantId,
          categoryId,
          name,
          description: description ?? '',
          price: parseFloat(price),
          image: image ?? '',
          prepTimeMin: prepTimeMin ?? 10,
          prepTimeMax: prepTimeMax ?? 20,
          badge: badge ?? null,
          tags: tags ?? [],
          isAvailable: true,
        },
      });
      return sendSuccess(res, item, { message: 'Menu item created' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/menu/items/:id (MANAGER, ADMIN, SUPER_ADMIN)
 * Partially update a menu item (e.g. toggle availability, update price).
 */
router.patch(
  '/items/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, description, price, isAvailable, badge, tags, prepTimeMin, prepTimeMax, image } = req.body;

    try {
      const item = await prisma.menuItem.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: parseFloat(price) }),
          ...(isAvailable !== undefined && { isAvailable }),
          ...(badge !== undefined && { badge }),
          ...(tags !== undefined && { tags }),
          ...(prepTimeMin !== undefined && { prepTimeMin }),
          ...(prepTimeMax !== undefined && { prepTimeMax }),
          ...(image !== undefined && { image }),
        },
      });
      return sendSuccess(res, item, { message: 'Menu item updated' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/menu/items/:id (ADMIN, SUPER_ADMIN)
 * Soft-delete by marking as unavailable, or hard-delete.
 */
router.delete(
  '/items/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: false },
      });
      return sendSuccess(res, { id }, { message: 'Menu item removed from menu' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
