import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

// Strict Access Gate: Managers, Admins, and Super Admins only
router.use(authMiddleware, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER));

/**
 * GET /api/admin/audit
 * Paginated and filtered enterprise audit logs.
 */
router.get('/', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
    const effectiveRestaurantId = isSuperAdmin
      ? (req.query.restaurantId as string) || undefined
      : req.user?.restaurantId;

    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '25', 10)));
    const skip = (page - 1) * limit;

    const { entity, action, search, branchId, userId, startDate, endDate } = req.query;

    const where: any = {};

    if (effectiveRestaurantId) {
      where.restaurantId = effectiveRestaurantId;
    }

    if (branchId) {
      where.branchId = branchId as string;
    }

    if (userId) {
      where.userId = userId as string;
    }

    if (entity && entity !== 'ALL') {
      where.entity = entity as string;
    }

    if (action && action !== 'ALL') {
      where.action = action as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entity: { contains: q, mode: 'insensitive' } },
        { userEmail: { contains: q, mode: 'insensitive' } },
        { details: { contains: q, mode: 'insensitive' } },
        { ipAddress: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formatted = logs.map((l) => ({
      id: l.id,
      restaurantId: l.restaurantId,
      branchId: l.branchId,
      userId: l.userId,
      userEmail: l.userEmail,
      userRole: l.userRole,
      action: l.action,
      entity: l.entity,
      entityId: l.entityId,
      details: l.details,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    }));

    return sendSuccess(res, {
      data: formatted,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/audit/stats
 * Aggregate audit analytics, security alerts & entity breakdown.
 */
router.get('/stats', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
    const effectiveRestaurantId = isSuperAdmin
      ? (req.query.restaurantId as string) || undefined
      : req.user?.restaurantId;

    const where: any = effectiveRestaurantId ? { restaurantId: effectiveRestaurantId } : {};

    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const [totalEvents, past24hEvents, entityGroups, securityAlertCount] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.count({
        where: {
          ...where,
          createdAt: { gte: oneDayAgo },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['entity'],
        where,
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          action: {
            in: [
              'LOGIN_FAILED',
              'TENANT_DELETED',
              'BRANCH_DEACTIVATED',
              'STAFF_DELETED',
              'ORDER_VOID',
              'INTEGRATION_DISABLED',
            ],
          },
        },
      }),
    ]);

    const entityDistribution = entityGroups.reduce<Record<string, number>>((acc, g) => {
      acc[g.entity] = (g._count as any)?.id ?? 0;
      return acc;
    }, {});


    return sendSuccess(res, {
      totalEvents,
      past24hEvents,
      securityAlertCount,
      entityDistribution,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/admin/audit/export
 * Export audit events as CSV formatted compliance stream.
 */
router.get('/export', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const isSuperAdmin = req.user?.role === UserRole.SUPER_ADMIN;
    const effectiveRestaurantId = isSuperAdmin
      ? (req.query.restaurantId as string) || undefined
      : req.user?.restaurantId;

    const where: any = effectiveRestaurantId ? { restaurantId: effectiveRestaurantId } : {};

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 2000,
    });

    const headers = [
      'ID',
      'Timestamp',
      'RestaurantID',
      'BranchID',
      'UserEmail',
      'UserRole',
      'Entity',
      'Action',
      'EntityID',
      'IPAddress',
      'Details',
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (!val) return '""';
      const clean = String(val).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = logs.map((l) => [
      escapeCsv(l.id),
      escapeCsv(l.createdAt.toISOString()),
      escapeCsv(l.restaurantId),
      escapeCsv(l.branchId),
      escapeCsv(l.userEmail),
      escapeCsv(l.userRole),
      escapeCsv(l.entity),
      escapeCsv(l.action),
      escapeCsv(l.entityId),
      escapeCsv(l.ipAddress),
      escapeCsv(l.details),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
    return res.status(200).send(csvContent);
  } catch (err) {
    return next(err);
  }
});

export default router;
