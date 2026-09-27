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
 * GET /api/menu?restaurant=<id>&table=<table>
 * Returns full grouped menu for customer scan session.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const restaurantParam = (req.query.restaurant || req.query.restaurantId) as string | undefined;
  const tableParam = (req.query.table || req.query.tableId) as string | undefined;

  try {
    // Find restaurant by ID or slug or fallback to first available restaurant
    let restaurant = restaurantParam
      ? await prisma.restaurant.findFirst({
          where: {
            OR: [{ id: restaurantParam }, { slug: restaurantParam }],
          },
        })
      : null;

    if (!restaurant) {
      restaurant = await prisma.restaurant.findFirst({
        orderBy: { createdAt: 'asc' },
      });
    }

    if (!restaurant) {
      return next(new AppError('No restaurant found', 404, 'NOT_FOUND'));
    }

    // Resolve table if provided
    let table = null;
    if (tableParam) {
      table = await prisma.table.findFirst({
        where: {
          restaurantId: restaurant.id,
          OR: [{ id: tableParam }, { tableNumber: tableParam }],
        },
        select: { id: true, tableNumber: true },
      });
    }

    // Fetch active categories and available items
    const [categories, items] = await Promise.all([
      prisma.menuCategory.findMany({
        where: { restaurantId: restaurant.id, isActive: true },
        orderBy: { order: 'asc' },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId: restaurant.id, isAvailable: true },
        include: { category: { select: { id: true, name: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Group items by category name
    const menu: Record<string, any[]> = {};
    for (const cat of categories) {
      menu[cat.name] = [];
    }

    for (const item of items) {
      const catName = item.category?.name || 'General';
      if (!menu[catName]) {
        menu[catName] = [];
      }
      menu[catName].push({
        id: item.id,
        restaurantId: item.restaurantId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.image,
        modelUrl: null,
        category: catName,
        isAvailable: item.isAvailable,
      });
    }

    return res.status(200).json({
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        logo: restaurant.logo,
        themeColor: '#d97706',
      },
      table: table ? { id: table.id, tableNumber: table.tableNumber } : null,
      menu,
    });
  } catch (err) {
    return next(err);
  }
});

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
 * GET /api/menu/recommendations?restaurantId=<id>&cartItemIds=<ids>&budget=<budget>
 * AI Customer Recommendation Engine (frequently bought together, popular upsells, budget filter).
 */
router.get('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  const { restaurantId, cartItemIds, budget } = req.query as {
    restaurantId?: string;
    cartItemIds?: string;
    budget?: string;
  };

  if (!restaurantId) {
    return next(new AppError('restaurantId query parameter is required', 400, 'VALIDATION_ERROR'));
  }

  try {
    const rawCartIds = cartItemIds ? cartItemIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
    const maxBudget = budget ? parseFloat(budget) : undefined;

    // Fetch candidate available menu items for this restaurant
    const allAvailable = await prisma.menuItem.findMany({
      where: {
        restaurantId,
        isAvailable: true,
        id: { notIn: rawCartIds },
        ...(maxBudget ? { price: { lte: maxBudget } } : {}),
      },
      include: { category: { select: { name: true } } },
    });

    if (allAvailable.length === 0) {
      return sendSuccess(res, []);
    }

    // If cart has items, find items frequently co-ordered with those in recent orders
    const coOccurrence = new Map<string, number>();
    if (rawCartIds.length > 0) {
      const relatedOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: { not: 'CANCELLED' as any },
          items: { some: { menuItemId: { in: rawCartIds } } },
        },
        include: { items: true },
        take: 50,
      });

      relatedOrders.forEach((o) => {
        o.items.forEach((i) => {
          if (!rawCartIds.includes(i.menuItemId)) {
            coOccurrence.set(i.menuItemId, (coOccurrence.get(i.menuItemId) || 0) + i.quantity);
          }
        });
      });
    }

    // Rank candidate items
    const ranked = allAvailable.map((item) => {
      let score = 0;
      let reason = 'Chef’s Special Recommendation';

      const coCount = coOccurrence.get(item.id) || 0;
      if (coCount > 0) {
        score += coCount * 10;
        reason = 'Frequently Ordered Together';
      }

      if (item.isFeatured) {
        score += 5;
        if (coCount === 0) reason = 'Restaurant Favorite';
      }

      if (item.badge === 'BESTSELLER') {
        score += 8;
        if (coCount === 0) reason = 'Bestselling Item';
      }

      // Bonus for sides & beverages if main dish in cart
      if (item.category?.name?.toLowerCase().includes('drink') || item.category?.name?.toLowerCase().includes('dessert') || item.category?.name?.toLowerCase().includes('side')) {
        score += 4;
        if (coCount === 0) reason = `Popular ${item.category.name} Pairing`;
      }

      return {
        ...item,
        recommendationScore: score,
        recommendationReason: reason,
      };
    });

    ranked.sort((a, b) => b.recommendationScore - a.recommendationScore);
    const topRecommendations = ranked.slice(0, 6);

    return sendSuccess(res, topRecommendations);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/menu/items/:id
 * Returns a single menu item by ID.
 */
router.get(['/items/:id', '/item/:id'], async (req: Request, res: Response, next: NextFunction) => {
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


/**
 * GET /api/menu/items/:id/ar-asset
 * Returns the AR asset linked to a menu item (if any).
 * Public endpoint — no auth required (accessible from customer QR scan session).
 */
router.get('/items/:id/ar-asset', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const asset = await prisma.arAsset.findUnique({
      where: { menuItemId: req.params.id },
      select: {
        id: true,
        name: true,
        assetType: true,
        modelUrl: true,
        iosModelUrl: true,
        previewImage: true,
        mimeType: true,
        scale: true,
        widthCm: true,
        heightCm: true,
        depthCm: true,
        portionLabel: true,
        status: true,
      },
    });

    if (!asset || asset.status !== 'ACTIVE') {
      return sendSuccess(res, null);
    }

    return sendSuccess(res, asset);
  } catch (err) {
    return next(err);
  }
});

export default router;
