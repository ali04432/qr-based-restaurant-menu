import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { emitToRestaurant } from '../../socket/socket.server';
import { SOCKET_EVENTS } from '../../socket/events';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/orders
 * List orders with advanced filtering (status, table, payment, date, search)
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

      const { status, tableId, paymentStatus, paymentMethod, dateFrom, dateTo, search, page = '1', limit = '50' } = req.query as Record<string, string>;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      // Status filters
      let statusFilter: any = undefined;
      if (status && status !== 'ALL') {
        if (status === 'NEW' || status === 'RECEIVED') {
          statusFilter = { in: ['NEW', 'RECEIVED', 'PENDING'] };
        } else if (status === 'PREPARING') {
          statusFilter = { in: ['PREPARING', 'IN_KITCHEN', 'COOKING'] };
        } else {
          statusFilter = status;
        }
      }

      // Date range filter
      let dateFilter: any = undefined;
      if (dateFrom || dateTo) {
        dateFilter = {};
        if (dateFrom) dateFilter.gte = new Date(dateFrom);
        if (dateTo) {
          const end = new Date(dateTo);
          end.setHours(23, 59, 59, 999);
          dateFilter.lte = end;
        }
      }

      const whereClause: any = {
        restaurantId,
        ...(statusFilter && { status: statusFilter }),
        ...(tableId && { tableId }),
        ...(paymentStatus && { paymentStatus }),
        ...(paymentMethod && { paymentMethod }),
        ...(dateFilter && { createdAt: dateFilter }),
        ...(search && {
          OR: [
            { orderNumber: { contains: search, mode: 'insensitive' } },
            { customerNote: { contains: search, mode: 'insensitive' } },
            { table: { tableNumber: { contains: search, mode: 'insensitive' } } },
          ],
        }),
      };

      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            items: true,
            table: { select: { id: true, tableNumber: true, status: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        prisma.order.count({ where: whereClause }),
      ]);

      const formattedOrders = orders.map((o) => ({
        id: o.id,
        restaurantId: o.restaurantId,
        orderNumber: o.orderNumber,
        tableId: o.tableId,
        tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
        status: o.status,
        subtotal: o.subtotal,
        tax: o.tax,
        serviceCharge: o.serviceCharge,
        discount: o.discount,
        total: o.total,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        customerNote: o.customerNote,
        itemsCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        items: o.items,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      }));

      return sendSuccess(res, {
        orders: formattedOrders,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limitNum),
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/orders/:id
 * Retrieve single order with itemized cost, profit, and audit history.
 */
router.get(
  '/:id',
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
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              menuItem: { select: { id: true, name: true, costPrice: true, image: true, categoryId: true } },
            },
          },
          table: true,
          payments: true,
        },
      });

      if (!order) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      // Check tenant isolation
      if (req.user?.role !== UserRole.SUPER_ADMIN && order.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('You do not have access to this order', 403, 'FORBIDDEN'));
      }

      // Calculate total cost and gross profit
      let totalCost = 0;
      const itemsWithCost = order.items.map((item) => {
        const unitCost = item.costPriceAtOrder ?? item.menuItem?.costPrice ?? 0;
        const itemCost = unitCost * item.quantity;
        totalCost += itemCost;
        const itemGrossProfit = item.subtotal - itemCost;
        return {
          id: item.id,
          menuItemId: item.menuItemId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          unitCost,
          subtotal: item.subtotal,
          grossProfit: parseFloat(itemGrossProfit.toFixed(2)),
          specialInstructions: item.specialInstructions,
          image: item.menuItem?.image || null,
        };
      });

      const grossProfit = parseFloat((order.total - totalCost).toFixed(2));
      const profitMargin = order.total > 0 ? parseFloat(((grossProfit / order.total) * 100).toFixed(1)) : 0;

      // Fetch related staff action logs
      const staffLogs = await prisma.staffActionLog.findMany({
        where: {
          restaurantId: order.restaurantId,
          details: { contains: order.orderNumber },
        },
        include: { user: { select: { name: true, role: true } } },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, {
        id: order.id,
        restaurantId: order.restaurantId,
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        tableNumber: order.table?.tableNumber || order.tableId.replace(/^t-/, '') || '01',
        status: order.status,
        subtotal: order.subtotal,
        tax: order.tax,
        serviceCharge: order.serviceCharge,
        discount: order.discount,
        total: order.total,
        totalCost: parseFloat(totalCost.toFixed(2)),
        grossProfit,
        profitMargin,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        customerNote: order.customerNote,
        items: itemsWithCost,
        payments: order.payments,
        auditLogs: staffLogs.map((l) => ({
          id: l.id,
          staffName: l.user?.name || 'Staff',
          staffRole: l.user?.role,
          action: l.action,
          createdAt: l.createdAt.toISOString(),
        })),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/orders/:id/status
 * Update order status (RECEIVED -> PREPARING -> READY -> SERVED -> COMPLETED)
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
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
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
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
      }

      const existingOrder = await prisma.order.findUnique({
        where: { id },
        include: { table: true, items: true },
      });

      if (!existingOrder) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      // Check tenant isolation
      if (req.user?.role !== UserRole.SUPER_ADMIN && existingOrder.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('You do not have access to this order', 403, 'FORBIDDEN'));
      }

      const updatedOrder = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
      });

      // If status is COMPLETED or CANCELLED, set table status back to AVAILABLE if no other active orders exist
      if (status === 'COMPLETED' || status === 'CANCELLED') {
        const remainingActive = await prisma.order.count({
          where: {
            tableId: existingOrder.tableId,
            status: { in: ['PENDING', 'RECEIVED', 'PREPARING', 'IN_KITCHEN', 'COOKING', 'READY'] as any },
            id: { not: id },
          },
        });
        if (remainingActive === 0) {
          await prisma.table.update({
            where: { id: existingOrder.tableId },
            data: { status: 'AVAILABLE' },
          });
        }
      } else if (status === 'PREPARING' || status === 'COOKING' || status === 'IN_KITCHEN') {
        await prisma.table.update({
          where: { id: existingOrder.tableId },
          data: { status: 'OCCUPIED' },
        });
      }

      // ── Loyalty Points Accrual on Completion
      if (status === 'COMPLETED' && existingOrder.loyaltyAccountId) {
        try {
          const account = await prisma.loyaltyAccount.findUnique({
            where: { id: existingOrder.loyaltyAccountId },
          });
          if (account) {
            const existingTx = await prisma.loyaltyTransaction.findFirst({
              where: { orderId: existingOrder.id, points: { gt: 0 } },
            });
            if (!existingTx) {
              const basePoints = Math.floor(existingOrder.total / 100);
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
                    restaurantId: existingOrder.restaurantId,
                    loyaltyAccountId: account.id,
                    orderId: existingOrder.id,
                    points: pointsEarned,
                    description: `Earned ${pointsEarned} points from Order #${existingOrder.orderNumber}`,
                  },
                }),
              ]);
            }
          }
        } catch (loyaltyErr) {
          console.warn('[Loyalty] Could not accrue points for completed order in admin:', loyaltyErr);
        }
      }

      // Log staff action
      if (req.user?.id) {
        await logStaffAction(
          existingOrder.restaurantId,
          req.user.id,
          `ORDER_STATUS_${status}`,
          `Order #${existingOrder.orderNumber} changed from ${existingOrder.status} to ${status}`
        );
      }

      // Real-time broadcast
      try {
        emitToRestaurant(existingOrder.restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, updatedOrder);
        emitToRestaurant(existingOrder.restaurantId, SOCKET_EVENTS.KITCHEN_ORDER_UPDATED, updatedOrder);
      } catch (e) {
        console.warn('[Socket] Could not broadcast status update', e);
      }

      return sendSuccess(res, updatedOrder, { message: `Order #${existingOrder.orderNumber} marked as ${status}` });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/orders/:id/cancel
 * Cancel order, log reason, and restore inventory stock.
 */
router.patch(
  '/:id/cancel',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { items: true, table: true },
      });

      if (!order) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && order.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      if ((order.status as string) === 'COMPLETED') {
        return next(new AppError('Cannot cancel an already completed order', 400, 'INVALID_OPERATION'));
      }

      // Transaction: update order to CANCELLED and restore stock
      const result = await prisma.$transaction(async (tx) => {
        const cancelled = await tx.order.update({
          where: { id },
          data: { status: 'CANCELLED' as any },
          include: { items: true, table: { select: { tableNumber: true } } },
        });

        // Restore stock
        for (const item of order.items) {
          await tx.menuItem.update({
            where: { id: item.menuItemId },
            data: {
              stockCount: { increment: item.quantity },
            },
          });

          await tx.inventory.updateMany({
            where: { menuItemId: item.menuItemId },
            data: {
              stockCount: { increment: item.quantity },
            },
          });
        }

        return cancelled;
      });

      if (req.user?.id) {
        await logStaffAction(
          order.restaurantId,
          req.user.id,
          'ORDER_CANCELLED',
          `Order #${order.orderNumber} cancelled. Reason: ${reason || 'Admin cancelled'}`
        );
      }

      try {
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_CANCELLED, result);
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, result);
      } catch (e) {
        console.warn('[Socket] Could not broadcast cancel', e);
      }

      return sendSuccess(res, result, { message: `Order #${order.orderNumber} has been cancelled and stock restored` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
