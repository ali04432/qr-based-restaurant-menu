import { Router, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import os from 'os';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { requireEntitlement } from '../../middleware/entitlement.middleware';
import { UserRole } from '@qr-menu/shared';
import { createTableAdminSchema, updateTableAdminSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

function buildCustomerMenuUrl(baseUrl: string, restaurantId: string, tableNumber: string, tableId: string, token: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  return `${cleanBase}/menu?restaurant=${restaurantId}&table=${encodeURIComponent(tableNumber)}&tableId=${encodeURIComponent(tableId)}&token=${encodeURIComponent(token)}`;
}

/**
 * GET /api/admin/tables/network-info
 * Returns local machine LAN IP and base URL configuration for easy mobile testing.
 */
router.get(
  '/network-info',
  authMiddleware,
  async (_req: AuthenticatedRequest, res: Response) => {
    const lanIp = getLocalIpAddress();
    const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const lanUrl = lanIp !== 'localhost' ? `http://${lanIp}:3000` : configuredUrl;

    return sendSuccess(res, {
      lanIp,
      configuredUrl,
      lanUrl,
    });
  }
);

/**
 * GET /api/admin/tables
 * List all tables for the restaurant.
 */
router.get(
  '/',
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

      const clientBaseUrl = (req.query.baseUrl as string) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const [tables, restaurant] = await Promise.all([
        prisma.table.findMany({
          where: { restaurantId },
          include: {
            _count: {
              select: {
                orders: {
                  where: {
                    status: { in: ['PENDING', 'RECEIVED', 'PREPARING', 'IN_KITCHEN', 'COOKING', 'READY'] as any },
                  },
                },
              },
            },
          },
          orderBy: { tableNumber: 'asc' },
        }),
        prisma.restaurant.findUnique({
          where: { id: restaurantId },
          select: { id: true, name: true, logo: true, currency: true },
        }),
      ]);

      const formatted = tables.map((t) => ({
        id: t.id,
        restaurantId: t.restaurantId,
        restaurantName: restaurant?.name || 'Restaurant',
        tableNumber: t.tableNumber,
        qrToken: t.qrToken,
        qrUrl: buildCustomerMenuUrl(clientBaseUrl, t.restaurantId, t.tableNumber, t.id, t.qrToken),
        capacity: t.capacity,
        status: t.status,
        isActive: t.isActive,
        activeOrdersCount: t._count.orders,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/tables
 * Create a new dining table.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('TABLES'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createTableAdminSchema.safeParse(req.body);
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

      // Check duplicate tableNumber
      const existing = await prisma.table.findFirst({
        where: { restaurantId, tableNumber: parsed.data.tableNumber },
      });

      if (existing) {
        return next(new AppError(`Table ${parsed.data.tableNumber} already exists in this restaurant`, 409, 'CONFLICT'));
      }

      const table = await prisma.table.create({
        data: {
          restaurantId,
          tableNumber: parsed.data.tableNumber,
          capacity: parsed.data.capacity,
          status: parsed.data.status,
          isActive: parsed.data.isActive,
          qrToken: randomUUID(),
        },
      });

      if (req.user?.id) {
        await logStaffAction(restaurantId, req.user.id, 'TABLE_CREATED', `Table ${table.tableNumber} created`);
      }

      return sendCreated(res, table, 'Table created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/tables/:id
 * Update table details (tableNumber, capacity, status, isActive)
 */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updateTableAdminSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const table = await prisma.table.findUnique({ where: { id } });
      if (!table) {
        return next(new AppError('Table not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && table.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updateData = parsed.data;
      const updated = await prisma.table.update({
        where: { id },
        data: updateData as any,
      });

      if (req.user?.id) {
        await logStaffAction(table.restaurantId, req.user.id, 'TABLE_UPDATED', `Table ${updated.tableNumber} updated`);
      }

      return sendSuccess(res, updated, { message: 'Table updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/tables/:id/regenerate-qr
 * Regenerate table QR token.
 */
router.post(
  '/:id/regenerate-qr',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
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

      const newToken = randomUUID();
      const updated = await prisma.table.update({
        where: { id },
        data: { qrToken: newToken },
      });

      if (req.user?.id) {
        await logStaffAction(
          table.restaurantId,
          req.user.id,
          'QR_REGENERATED',
          `QR token regenerated for Table ${table.tableNumber}`
        );
      }

      const clientBaseUrl = (req.body?.baseUrl as string) || (req.query?.baseUrl as string) || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const qrUrl = buildCustomerMenuUrl(clientBaseUrl, table.restaurantId, updated.tableNumber, updated.id, updated.qrToken);

      return sendSuccess(res, { ...updated, qrUrl }, { message: 'QR Code regenerated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/tables/:id
 * Safe delete a dining table.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;

      const table = await prisma.table.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              orders: {
                where: {
                  status: { in: ['PENDING', 'RECEIVED', 'PREPARING', 'IN_KITCHEN', 'COOKING', 'READY'] as any },
                },
              },
            },
          },
        },
      });

      if (!table) {
        return next(new AppError('Table not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && table.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      if (table._count.orders > 0) {
        return next(
          new AppError(
            `Cannot delete Table ${table.tableNumber} because it currently has ${table._count.orders} active order(s). Please complete or cancel those orders first.`,
            400,
            'DEPENDENCY_EXISTS'
          )
        );
      }

      await prisma.table.delete({ where: { id } });

      if (req.user?.id) {
        await logStaffAction(table.restaurantId, req.user.id, 'TABLE_DELETED', `Table ${table.tableNumber} deleted`);
      }

      return sendSuccess(res, { id }, { message: `Table ${table.tableNumber} deleted successfully` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
