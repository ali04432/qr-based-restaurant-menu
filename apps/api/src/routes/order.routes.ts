import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { customerOrderSchema } from '@qr-menu/shared';
import { emitToRestaurant } from '../socket/socket.server';
import { SOCKET_EVENTS } from '../socket/events';

// ============================================================
// Order Routes
//
// POST /api/orders                     — customer places order (with inventory deduction)
// GET  /api/orders/:id                 — get order status (public by ID)
// GET  /api/orders?restaurantId=<id>   — list orders for restaurant (staff)
// PATCH /api/orders/:id/status         — update order status (kitchen/waiter staff)
// ============================================================

const router = Router();

/**
 * POST /api/orders
 * Customer places a new order with server-side stock validation & atomic inventory deduction.
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const parsed = customerOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
  }

  const {
    restaurantId,
    tableId,
    branchId,
    customerPhone,
    loyaltyAccountId: providedLoyaltyId,
    rewardCode,
    promoCode,
    items,
    paymentMethod,
  } = parsed.data;

  try {
    const menuItemIds = items.map((i) => i.menuItemId);

    const TAX_RATE = 0.08; // 8%
    const SERVICE_CHARGE = 5.0; // flat 5.00

    // Validate table existence
    const tableExists = await prisma.table.findUnique({
      where: { id: tableId, restaurantId },
    });
    if (!tableExists) {
      return next(new AppError('The selected table is invalid or does not belong to this restaurant.', 400, 'INVALID_TABLE'));
    }

    // Fetch authoritative menu items from database
    const dbMenuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
      },
      include: { inventory: true, category: true },
    });

    const dbItemMap = new Map(dbMenuItems.map((m) => [m.id, m]));

    // Validation 1: Ensure all items exist in the database
    for (const reqItem of items) {
      const dbItem = dbItemMap.get(reqItem.menuItemId);
      if (!dbItem) {
        return next(
          new AppError(`Menu item "${reqItem.menuItemId}" was not found or is unavailable.`, 404, 'ITEM_NOT_FOUND')
        );
      }

      // Validation 2: Ensure item is available
      if (!dbItem.isAvailable) {
        return next(
          new AppError(`"${dbItem.name}" is currently unavailable. Please remove it from your cart.`, 400, 'ITEM_UNAVAILABLE')
        );
      }

      // Validation 3: Check stock count (if finite)
      const currentStock = dbItem.stockCount ?? dbItem.inventory[0]?.stockCount ?? null;
      if (currentStock !== null && currentStock < reqItem.quantity) {
        return next(
          new AppError(
            `Insufficient stock for "${dbItem.name}". Only ${currentStock} portion(s) remaining, but ${reqItem.quantity} requested.`,
            400,
            'INSUFFICIENT_STOCK'
          )
        );
      }
    }

    // Server-side authoritative price calculation
    let subtotal = 0;
    const orderItemsData = items.map((reqItem) => {
      const dbItem = dbItemMap.get(reqItem.menuItemId)!;
      const unitPrice = dbItem.price;
      const costPriceAtOrder = dbItem.costPrice ?? 0;
      const itemSubtotal = unitPrice * reqItem.quantity;
      subtotal += itemSubtotal;

      return {
        menuItemId: dbItem.id,
        name: dbItem.name,
        unitPrice,
        costPriceAtOrder,
        quantity: reqItem.quantity,
        subtotal: itemSubtotal,
        specialInstructions: reqItem.specialInstructions ?? null,
      };
    });

    // ── Loyalty Account Resolution
    let resolvedLoyaltyAccountId: string | null = providedLoyaltyId || null;
    let customerTier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' = 'BRONZE';

    if (customerPhone) {
      const cleanPhone = customerPhone.trim();
      const account = await prisma.loyaltyAccount.upsert({
        where: {
          restaurantId_phone: {
            restaurantId,
            phone: cleanPhone,
          },
        },
        update: {},
        create: {
          restaurantId,
          phone: cleanPhone,
          pointsBalance: 0,
          lifetimePoints: 0,
          tier: 'BRONZE',
        },
      });
      resolvedLoyaltyAccountId = account.id;
      customerTier = account.tier;
    } else if (resolvedLoyaltyAccountId) {
      const acc = await prisma.loyaltyAccount.findUnique({ where: { id: resolvedLoyaltyAccountId } });
      if (acc) customerTier = acc.tier;
    }

    // ── Promotional Discount Calculation
    let discount = 0;
    if (promoCode) {
      const cleanPromo = promoCode.toUpperCase().trim();
      const promo = await prisma.promotion.findFirst({
        where: { restaurantId, code: cleanPromo, isActive: true },
      });
      if (promo && (!promo.minOrderAmount || subtotal >= promo.minOrderAmount)) {
        if (promo.discountType === 'PERCENTAGE') {
          discount += parseFloat(((subtotal * promo.discountValue) / 100).toFixed(2));
        } else {
          discount += Math.min(subtotal, promo.discountValue);
        }
      }
    }

    // ── Reward Voucher Calculation
    let appliedRewardRedemptionId: string | null = null;
    if (rewardCode) {
      const cleanReward = rewardCode.toUpperCase().trim();
      const redemption = await prisma.rewardRedemption.findFirst({
        where: {
          restaurantId,
          code: cleanReward,
          status: 'ACTIVE',
          expiresAt: { gt: new Date() },
        },
        include: { reward: true },
      });

      if (redemption) {
        appliedRewardRedemptionId = redemption.id;
        if (redemption.reward.rewardType === 'DISCOUNT_PERCENT') {
          discount += parseFloat(((subtotal * redemption.reward.discountValue) / 100).toFixed(2));
        } else if (redemption.reward.rewardType === 'DISCOUNT_FIXED') {
          discount += Math.min(subtotal, redemption.reward.discountValue);
        } else if (redemption.reward.rewardType === 'FREE_ITEM' && redemption.reward.menuItemId) {
          const freeItem = dbItemMap.get(redemption.reward.menuItemId);
          if (freeItem) {
            discount += freeItem.price;
          }
        }
      }
    }

    discount = Math.min(subtotal, parseFloat(discount.toFixed(2)));
    const discountedSubtotal = Math.max(0, subtotal - discount);
    const tax = parseFloat((discountedSubtotal * TAX_RATE).toFixed(2));
    const total = parseFloat((discountedSubtotal + tax + SERVICE_CHARGE).toFixed(2));
    const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;

    // Execute atomic transaction: Create order + decrement inventory + mark redemption + update table
    const finalOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          restaurantId,
          branchId: branchId || null,
          tableId,
          loyaltyAccountId: resolvedLoyaltyAccountId,
          rewardRedemptionId: appliedRewardRedemptionId,
          orderNumber,
          status: 'RECEIVED' as any,
          subtotal,
          discount,
          tax,
          serviceCharge: SERVICE_CHARGE,
          total,
          paymentMethod: paymentMethod ?? 'ONLINE',
          paymentStatus: 'PENDING',
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
      });

      // Record Order Creation Event
      await (tx as any).orderEvent.create({
        data: {
          restaurantId,
          orderId: order.id,
          userId: req.user?.id || null,
          statusFrom: null,
          statusTo: 'RECEIVED',
          eventType: 'ORDER_CREATED',
          metadata: JSON.stringify({ paymentMethod, platform: 'CUSTOMER_APP' })
        }
      });

      // If reward voucher was applied, mark it as REDEEMED
      if (appliedRewardRedemptionId) {
        await tx.rewardRedemption.update({
          where: { id: appliedRewardRedemptionId },
          data: {
            status: 'REDEEMED',
            orderId: order.id,
            redeemedAt: new Date(),
          },
        });
      }

      // Deduct stock for each finite inventory item
      for (const reqItem of items) {
        const dbItem = dbItemMap.get(reqItem.menuItemId)!;
        if (dbItem.stockCount !== null) {
          await tx.menuItem.update({
            where: { id: dbItem.id },
            data: {
              stockCount: { decrement: reqItem.quantity },
            },
          });

          await tx.inventory.updateMany({
            where: { menuItemId: dbItem.id },
            data: {
              stockCount: { decrement: reqItem.quantity },
            },
          });
        }
      }

      // Mark table status as OCCUPIED
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      }).catch(() => {
        // Table ID might be custom string or UUID
      });

      return order;
    });

    // Attach tableNumber for KDS display
    const enrichedOrder: any = {
      ...finalOrder,
      tableNumber: finalOrder.table?.tableNumber || tableId.replace(/^t-/, '') || '01',
    };

    // Emit real-time WebSocket event to kitchen and staff
    try {
      emitToRestaurant(restaurantId, SOCKET_EVENTS.ORDER_CREATED, enrichedOrder);
      console.log(`[Socket] Emitted ${SOCKET_EVENTS.ORDER_CREATED} for order ${finalOrder.id} to restaurant ${restaurantId}`);
    } catch (e) {
      console.warn('[Socket] Could not broadcast order.created', e);
    }

    return sendCreated(res, enrichedOrder, 'Order placed successfully');
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

    return sendSuccess(res, {
      ...order,
      tableNumber: order.table?.tableNumber || order.tableId.replace(/^t-/, '') || '01',
    });
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

      const formatted = orders.map((o) => ({
        ...o,
        tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/orders/:id/status
 * Update order status (e.g. kitchen marks COOKING → READY).
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

    const validStatuses = [
      'PENDING',
      'RECEIVED',
      'NEW',
      'IN_KITCHEN',
      'COOKING',
      'PREPARING',
      'READY',
      'SERVED',
      'COMPLETED',
      'CANCELLED',
    ];
    if (!status || !validStatuses.includes(status)) {
      return next(new AppError(`status must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
    }

    try {
      const existingOrder = await prisma.order.findUnique({ where: { id } });
      if (!existingOrder) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      const order = await prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id },
          data: { status },
          include: { items: true, table: { select: { tableNumber: true } } },
        });

        // Record status change event
        if (existingOrder.status !== status) {
          await (tx as any).orderEvent.create({
            data: {
              restaurantId: existingOrder.restaurantId,
              orderId: existingOrder.id,
              userId: req.user?.id || null,
              statusFrom: existingOrder.status,
              statusTo: status,
              eventType: 'STATUS_CHANGED',
              metadata: JSON.stringify({ actorRole: req.user?.role || 'SYSTEM' })
            }
          });
        }
        
        return updated;
      });

      // ── Loyalty Points Accrual on Completion
      if (status === 'COMPLETED' && order.loyaltyAccountId) {
        try {
          const account = await prisma.loyaltyAccount.findUnique({
            where: { id: order.loyaltyAccountId },
          });
          if (account) {
            const existingTx = await prisma.loyaltyTransaction.findFirst({
              where: { orderId: order.id, points: { gt: 0 } },
            });
            if (!existingTx) {
              const basePoints = Math.floor(order.total / 100);
              const multipliers: Record<string, number> = { BRONZE: 1.0, SILVER: 1.2, GOLD: 1.5, PLATINUM: 2.0 };
              const multiplier = multipliers[account.tier] || 1.0;
              const pointsEarned = Math.max(1, Math.round(basePoints * multiplier));
              const newLifetime = account.lifetimePoints + pointsEarned;
              const newTier = newLifetime >= 4000 ? 'PLATINUM' : newLifetime >= 1500 ? 'GOLD' : newLifetime >= 500 ? 'SILVER' : 'BRONZE';

              await prisma.$transaction([
                prisma.loyaltyAccount.update({
                  where: { id: account.id },
                  data: {
                    pointsBalance: { increment: pointsEarned },
                    lifetimePoints: { increment: pointsEarned },
                    tier: newTier as any,
                  },
                }),
                prisma.loyaltyTransaction.create({
                  data: {
                    restaurantId: order.restaurantId,
                    loyaltyAccountId: account.id,
                    orderId: order.id,
                    points: pointsEarned,
                    description: `Earned ${pointsEarned} points from Order #${order.orderNumber}`,
                  },
                }),
              ]);
            }
          }
        } catch (loyaltyErr) {
          console.warn('[Loyalty] Could not accrue points for completed order:', loyaltyErr);
        }
      }

      const enriched = {
        ...order,
        tableNumber: order.table?.tableNumber || order.tableId.replace(/^t-/, '') || '01',
      };

      try {
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, enriched);
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.KITCHEN_ORDER_UPDATED, enriched);
      } catch (e) {
        console.warn('[Socket] Could not broadcast status update', e);
      }

      return sendSuccess(res, enriched, { message: `Order status updated to ${status}` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
