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
 * GET /api/admin/kitchen/orders
 * Retrieve active kitchen orders in ascending chronological order.
 */
router.get(
  '/orders',
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

      const activeOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: {
            in: ['PENDING', 'RECEIVED', 'NEW', 'PREPARING', 'IN_KITCHEN', 'COOKING', 'READY'] as any,
          },
        },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
        orderBy: { createdAt: 'asc' },
      });

      const formatted = activeOrders.map((o) => ({
        id: o.id,
        restaurantId: o.restaurantId,
        orderNumber: o.orderNumber,
        tableId: o.tableId,
        tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
        status: o.status,
        customerNote: o.customerNote,
        items: o.items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          quantity: i.quantity,
          price: i.unitPrice,
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
 * PATCH /api/admin/kitchen/orders/:id/status
 * Advance kitchen order state (PREPARING -> READY -> COMPLETED)
 */
router.patch(
  '/orders/:id/status',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CHEF
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ['RECEIVED', 'PREPARING', 'COOKING', 'READY', 'COMPLETED'];
      if (!status || !validStatuses.includes(status)) {
        return next(new AppError(`Status must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
      }

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
        data: { status: status as any },
        include: {
          items: true,
          table: { select: { tableNumber: true } },
        },
      });

      // Log chef action
      if (req.user?.id) {
        await logStaffAction(
          order.restaurantId,
          req.user.id,
          `KITCHEN_${status}`,
          `Order #${order.orderNumber} advanced to ${status} by kitchen staff`
        );
      }

      // Real-time broadcast
      try {
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.KITCHEN_ORDER_UPDATED, updated);
        emitToRestaurant(order.restaurantId, SOCKET_EVENTS.ORDER_STATUS_CHANGED, updated);
      } catch (e) {
        console.warn('[Socket] Could not broadcast kitchen update', e);
      }

      return sendSuccess(res, updated, { message: `Order #${order.orderNumber} updated to ${status}` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
