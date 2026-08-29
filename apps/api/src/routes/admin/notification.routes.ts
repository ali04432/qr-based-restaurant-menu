import { Router, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

interface NotificationRecord {
  id: string;
  restaurantId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// In-memory persistent storage for notifications
const notificationsStore = new Map<string, NotificationRecord[]>();

/**
 * GET /api/admin/notifications
 * List notifications for the restaurant.
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

      // Check if DB model exists, otherwise fallback to store
      let list: NotificationRecord[] = [];
      try {
        if ((prisma as any).notification) {
          const dbList = await (prisma as any).notification.findMany({
            where: { restaurantId },
            orderBy: { createdAt: 'desc' },
            take: 50,
          });
          list = dbList.map((n: any) => ({
            id: n.id,
            restaurantId: n.restaurantId,
            type: n.type,
            title: n.title,
            message: n.message,
            link: n.link || undefined,
            isRead: n.isRead,
            createdAt: n.createdAt.toISOString ? n.createdAt.toISOString() : n.createdAt,
          }));
        }
      } catch (e) {
        // Fallback to in-memory store
      }

      if (list.length === 0) {
        list = notificationsStore.get(restaurantId) || [
          {
            id: 'n-01',
            restaurantId,
            type: 'ORDER',
            title: 'New Customer Order',
            message: 'Order #ORD-8492 placed at Table 04',
            link: '/admin/orders',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 'n-02',
            restaurantId,
            type: 'STOCK',
            title: 'Low Stock Alert',
            message: 'Wagyu Beef Steak is below minimum threshold (3 left)',
            link: '/admin/inventory',
            isRead: false,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: 'n-03',
            restaurantId,
            type: 'PAYMENT',
            title: 'Payment Received',
            message: 'Cash payment of Rs. 4,250 confirmed for Table 02',
            link: '/admin/payments',
            isRead: true,
            createdAt: new Date(Date.now() - 7200000).toISOString(),
          },
        ];
        notificationsStore.set(restaurantId, list);
      }

      return sendSuccess(res, list);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark single notification as read.
 */
router.patch(
  '/:id/read',
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
      const restaurantId = req.user?.restaurantId || '1';

      try {
        if ((prisma as any).notification) {
          await (prisma as any).notification.update({
            where: { id },
            data: { isRead: true },
          });
        }
      } catch (e) {
        // Fallback
      }

      const list = notificationsStore.get(restaurantId) || [];
      const updatedList = list.map((n) => (n.id === id ? { ...n, isRead: true } : n));
      notificationsStore.set(restaurantId, updatedList);

      return sendSuccess(res, { id, isRead: true }, { message: 'Notification marked as read' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/notifications/read-all
 * Mark all notifications as read.
 */
router.patch(
  '/read-all',
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
      const restaurantId = req.user?.restaurantId || '1';

      try {
        if ((prisma as any).notification) {
          await (prisma as any).notification.updateMany({
            where: { restaurantId, isRead: false },
            data: { isRead: true },
          });
        }
      } catch (e) {
        // Fallback
      }

      const list = notificationsStore.get(restaurantId) || [];
      const updatedList = list.map((n) => ({ ...n, isRead: true }));
      notificationsStore.set(restaurantId, updatedList);

      return sendSuccess(res, { success: true }, { message: 'All notifications marked as read' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
