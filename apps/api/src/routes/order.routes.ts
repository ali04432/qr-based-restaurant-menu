import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { customerOrderSchema } from '@qr-menu/shared';

// ============================================================
// Order Routes
//
// POST /api/orders                     — customer places order
// GET  /api/orders/:id                 — get order status (public by ID)
// GET  /api/orders?restaurantId=<id>   — list orders for restaurant (staff)
// PATCH /api/orders/:id/status         — update order status (kitchen staff)
// ============================================================

const router = Router();

/**
 * POST /api/orders
 * Customer places a new order from a QR-linked table.
 * Body: { restaurantId, tableId, items: [{ menuItemId, quantity, specialInstructions? }], paymentMethod? }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = customerOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }

  const { restaurantId, tableId, items, paymentMethod } = parsed.data;

  try {
    // Fetch all menu items in bulk to calculate totals
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: { id: { in: menuItemIds }, restaurantId, isAvailable: true },
    });

    if (menuItems.length !== menuItemIds.length) {
      return next(new AppError('One or more menu items are unavailable or do not belong to this restaurant', 400, 'INVALID_ITEMS'));
    }

    // Build a map for O(1) price lookups
    const priceMap = new Map<string, number>(
      menuItems.map((m: { id: string; price: number }): [string, number] => [m.id, m.price])
    );
    const nameMap = new Map<string, string>(
      menuItems.map((m: { id: string; name: string }): [string, string] => [m.id, m.name])
    );
    const subtotal = items.reduce((acc, item) => {
      return acc + (priceMap.get(item.menuItemId) ?? 0) * item.quantity;
    }, 0);

    const TAX_RATE = 0.08;        // 8%
    const SERVICE_CHARGE = 5.00; // flat rate
    const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((subtotal + tax + SERVICE_CHARGE).toFixed(2));

    // Create order in the database
    const orderNumber = `ORD-${Date.now()}`;
    const order = await prisma.order.create({
      data: {
        restaurantId,
        tableId,
        orderNumber,
        status: 'RECEIVED',
        subtotal,
        tax,
        serviceCharge: SERVICE_CHARGE,
        total,
        paymentMethod: paymentMethod ?? 'ONLINE',
        paymentStatus: 'PENDING',
        items: {
          create: items.map((i) => ({
            menuItemId: i.menuItemId,
            name: nameMap.get(i.menuItemId) ?? '',
            unitPrice: priceMap.get(i.menuItemId) ?? 0,
            quantity: i.quantity,
            subtotal: (priceMap.get(i.menuItemId) ?? 0) * i.quantity,
            specialInstructions: i.specialInstructions ?? null,
          })),
        },
      },
      include: {
        items: true,
        table: { select: { tableNumber: true } },
      },
    });

    return sendCreated(res, order, 'Order placed successfully');
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/orders/:id
 * Retrieve a single order by ID. Used for customer order tracking.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true,
        table: { select: { tableNumber: true } },
      },
    });

    if (!order) {
      return next(new AppError('Order not found', 404, 'NOT_FOUND'));
    }

    return sendSuccess(res, order);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/orders?restaurantId=<id>&status=<status>
 * List all orders for a restaurant. Requires staff authentication.
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
  async (req: Request, res: Response, next: NextFunction) => {
    const { restaurantId, status } = req.query as { restaurantId?: string; status?: string };

    if (!restaurantId) {
      return next(new AppError('restaurantId query parameter is required', 400, 'VALIDATION_ERROR'));
    }

    try {
      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          ...(status && { status: status as any }),
        },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      return sendSuccess(res, orders);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/orders/:id/status
 * Update order status (e.g. kitchen marks COOKING → READY).
 * Requires: CHEF, MANAGER, WAITER, CASHIER, ADMIN, SUPER_ADMIN
 */
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CHEF,
    UserRole.WAITER,
    UserRole.CASHIER
  ),
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['PENDING', 'RECEIVED', 'IN_KITCHEN', 'COOKING', 'READY', 'SERVED', 'CANCELLED'];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }

    try {
      const order = await prisma.order.update({
        where: { id },
        data: { status },
        include: { items: true },
      });

      return sendSuccess(res, order, { message: `Order status updated to ${status}` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
