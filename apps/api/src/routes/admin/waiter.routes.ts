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
 * GET /api/admin/waiter/tables
 * List dining tables with active order summary and current table status.
 */
router.get(
  '/tables',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
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

      const [tables, activeOrders] = await Promise.all([
        prisma.table.findMany({
          where: { restaurantId, isActive: true },
          orderBy: { tableNumber: 'asc' },
        }),
        prisma.order.findMany({
          where: {
            restaurantId,
            status: { in: ['PENDING', 'RECEIVED', 'NEW', 'PREPARING', 'IN_KITCHEN', 'COOKING', 'READY'] as any },
          },
          include: { items: true },
          orderBy: { createdAt: 'desc' },
        }),
      ]);

      const tableData = tables.map((t) => {
        const tableOrders = activeOrders.filter((o) => o.tableId === t.id);
        const hasReadyOrder = tableOrders.some((o) => (o.status as string) === 'READY');
        const hasPreparingOrder = tableOrders.some((o) => ['PREPARING', 'COOKING', 'IN_KITCHEN'].includes(o.status as string));

        let computedStatus: string = t.status;
        if (hasReadyOrder) computedStatus = 'READY_TO_SERVE';
        else if (hasPreparingOrder) computedStatus = 'PREPARING';
        else if (tableOrders.length > 0) computedStatus = 'ORDERING';

        return {
          id: t.id,
          tableNumber: t.tableNumber,
          capacity: t.capacity,
          status: computedStatus,
          activeOrdersCount: tableOrders.length,
          activeOrders: tableOrders.map((o) => ({
            id: o.id,
            orderNumber: o.orderNumber,
            status: o.status,
            total: o.total,
            itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
            createdAt: o.createdAt.toISOString(),
          })),
        };
      });

      return sendSuccess(res, tableData);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/waiter/ready-orders
 * List orders that are READY for the waiter to deliver to tables.
 */
router.get(
  '/ready-orders',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
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

      const readyOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: 'READY' as any,
        },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
        orderBy: { updatedAt: 'asc' },
      });

      const formatted = readyOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        tableId: o.tableId,
        tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
        status: o.status,
        customerNote: o.customerNote,
        items: o.items.map((i) => ({
          name: i.name,
          quantity: i.quantity,
          specialInstructions: i.specialInstructions,
        })),
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/waiter/orders/:id/serve
 * Waiter marks the order as SERVED to the customer table.
 */
router.patch(
  '/orders/:id/serve',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.WAITER,
    UserRole.CASHIER
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: { table: true, items: true },
      });

      if (!order) {
        return next(new AppError('Order not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && order.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: 'SERVED' as any },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
      });

      if (req.user?.id) {
        await logStaffAction(
          order.restaurantId,
          req.user.id,
          'ORDER_SERVED',
          `Order #${order.orderNumber} served to Table ${order.table?.tableNumber || order.tableId}`
        );
      }

      try {
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, updated);
      } catch (e) {
        console.warn('[Socket] Could not broadcast served status', e);
      }

      return sendSuccess(res, updated, { message: `Order #${order.orderNumber} marked as served` });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/waiter/tables/:id/open
 * Waiter marks a table as OCCUPIED for arriving guests.
 */
router.post(
  '/tables/:id/open',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.WAITER
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        return next(new AppError('Table not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && table.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updatedTable = await prisma.table.update({
        where: { id },
        data: { status: 'OCCUPIED' },
      });

      if (req.user?.id) {
        await logStaffAction(
          table.restaurantId,
          req.user.id,
          'TABLE_OCCUPIED',
          `Table ${table.tableNumber} opened/seated by waiter`
        );
      }

      return sendSuccess(res, updatedTable, { message: `Table ${table.tableNumber} is now active` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
