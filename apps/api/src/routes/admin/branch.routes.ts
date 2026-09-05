import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { requireEntitlement } from '../../middleware/entitlement.middleware';
import { UserRole } from '@qr-menu/shared';
import { CreateBranchSchema, UpdateBranchSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/branches
 * List all branches for a restaurant with operational counts.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const branches = await prisma.branch.findMany({
        where: { restaurantId },
        include: {
          _count: {
            select: {
              tables: true,
              users: true,
              orders: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      return sendSuccess(res, branches);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/branches/analytics/consolidated
 * Multi-location aggregated analytics comparing revenue and order metrics across branches.
 */
router.get(
  '/analytics/consolidated',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { dateFrom, dateTo } = req.query as Record<string, string>;
      const dateFilter: Record<string, Date> = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) dateFilter.lte = new Date(dateTo);

      const [branches, allOrders] = await Promise.all([
        prisma.branch.findMany({
          where: { restaurantId },
          include: {
            _count: {
              select: { tables: true, users: true },
            },
          },
        }),
        prisma.order.findMany({
          where: {
            restaurantId,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            status: { not: 'CANCELLED' as any },
          },
          select: {
            id: true,
            branchId: true,
            total: true,
            status: true,
            createdAt: true,
          },
        }),
      ]);

      // Calculate aggregated metrics
      const branchStatsMap = new Map<string, {
        branchId: string;
        name: string;
        code: string;
        isActive: boolean;
        tablesCount: number;
        staffCount: number;
        totalOrders: number;
        completedOrders: number;
        totalRevenue: number;
        avgOrderValue: number;
      }>();

      // Initialize registered branches
      branches.forEach((b) => {
        branchStatsMap.set(b.id, {
          branchId: b.id,
          name: b.name,
          code: b.code,
          isActive: b.isActive,
          tablesCount: b._count.tables,
          staffCount: b._count.users,
          totalOrders: 0,
          completedOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
        });
      });

      // Default Main Branch bucket for unassigned orders
      const mainBranchKey = 'main-flagship';
      branchStatsMap.set(mainBranchKey, {
        branchId: mainBranchKey,
        name: 'Main / Flagship Location',
        code: 'MAIN',
        isActive: true,
        tablesCount: 0,
        staffCount: 0,
        totalOrders: 0,
        completedOrders: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
      });

      let grandTotalRevenue = 0;
      let grandTotalOrders = 0;

      allOrders.forEach((o) => {
        const key = o.branchId && branchStatsMap.has(o.branchId) ? o.branchId : mainBranchKey;
        const stat = branchStatsMap.get(key);
        if (!stat) return;

        stat.totalOrders += 1;
        stat.totalRevenue += o.total;
        grandTotalOrders += 1;
        grandTotalRevenue += o.total;

        if (o.status === 'COMPLETED') {
          stat.completedOrders += 1;
        }
      });

      // Calculate averages and revenue share
      const locations = Array.from(branchStatsMap.values())
        .filter((s) => s.branchId !== mainBranchKey || s.totalOrders > 0 || branches.length === 0)
        .map((s) => ({
          ...s,
          totalRevenue: parseFloat(s.totalRevenue.toFixed(2)),
          avgOrderValue: s.totalOrders > 0 ? parseFloat((s.totalRevenue / s.totalOrders).toFixed(2)) : 0,
          revenueSharePercent: grandTotalRevenue > 0 ? parseFloat(((s.totalRevenue / grandTotalRevenue) * 100).toFixed(1)) : 0,
        }));

      return sendSuccess(res, {
        summary: {
          totalLocations: branches.length,
          grandTotalRevenue: parseFloat(grandTotalRevenue.toFixed(2)),
          grandTotalOrders,
          avgRevenuePerLocation: branches.length > 0 ? parseFloat((grandTotalRevenue / Math.max(1, branches.length)).toFixed(2)) : grandTotalRevenue,
        },
        locations,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/branches
 * Create a new branch for the restaurant.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  requireEntitlement('BRANCHES'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const parsed = CreateBranchSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR'));
      }

      const { name, code, address, phone, email, isActive } = parsed.data;

      // Check unique code per restaurant
      const existing = await prisma.branch.findUnique({
        where: {
          restaurantId_code: {
            restaurantId,
            code: code.toUpperCase(),
          },
        },
      });

      if (existing) {
        return next(new AppError(`Branch with code '${code}' already exists`, 409, 'DUPLICATE_CODE'));
      }

      const branch = await prisma.branch.create({
        data: {
          restaurantId,
          name,
          code: code.toUpperCase(),
          address: address || null,
          phone: phone || null,
          email: email || null,
          isActive: isActive ?? true,
        },
      });

      if (req.user?.id) {
        await logStaffAction(
          restaurantId,
          req.user.id,
          'BRANCH_CREATED',
          `Created branch '${name}' with code '${code}'`
        );
      }

      return sendCreated(res, branch, 'Branch created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/branches/:id
 * Retrieve single branch with tables and assigned staff.
 */
router.get(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.user?.restaurantId;

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          tables: {
            select: { id: true, tableNumber: true, capacity: true, status: true, isActive: true },
            orderBy: { tableNumber: 'asc' },
          },
          users: {
            select: { id: true, name: true, email: true, role: true, status: true },
            orderBy: { name: 'asc' },
          },
          _count: {
            select: { orders: true },
          },
        },
      });

      if (!branch) {
        return next(new AppError('Branch not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && branch.restaurantId !== restaurantId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }

      return sendSuccess(res, branch);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PUT /api/admin/branches/:id
 * PATCH /api/admin/branches/:id
 * Update branch details.
 */
const updateHandler = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const restaurantId = req.user?.restaurantId;

    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) {
      return next(new AppError('Branch not found', 404, 'NOT_FOUND'));
    }

    if (req.user?.role !== UserRole.SUPER_ADMIN && branch.restaurantId !== restaurantId) {
      return next(new AppError('Access denied', 403, 'FORBIDDEN'));
    }

    const parsed = UpdateBranchSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message || 'Validation failed', 400, 'VALIDATION_ERROR'));
    }

    const { name, code, address, phone, email, isActive } = parsed.data;

    // Check code collision if code updated
    if (code && code.toUpperCase() !== branch.code) {
      const existing = await prisma.branch.findUnique({
        where: {
          restaurantId_code: {
            restaurantId: branch.restaurantId,
            code: code.toUpperCase(),
          },
        },
      });
      if (existing && existing.id !== id) {
        return next(new AppError(`Branch code '${code}' is already used by another branch`, 409, 'DUPLICATE_CODE'));
      }
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(address !== undefined && { address: address || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    if (req.user?.id) {
      await logStaffAction(
        branch.restaurantId,
        req.user.id,
        'BRANCH_UPDATED',
        `Updated branch '${updated.name}' (${updated.code})`
      );
    }

    return sendSuccess(res, updated, { message: 'Branch updated successfully' });
  } catch (err) {
    return next(err);
  }
};

router.put('/:id', authMiddleware, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), updateHandler);
router.patch('/:id', authMiddleware, requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN), updateHandler);

/**
 * DELETE /api/admin/branches/:id
 * Soft-deactivates or deletes branch.
 */
router.delete(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const restaurantId = req.user?.restaurantId;

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          _count: {
            select: { orders: true, tables: true, users: true },
          },
        },
      });

      if (!branch) {
        return next(new AppError('Branch not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && branch.restaurantId !== restaurantId) {
        return next(new AppError('Access denied', 403, 'FORBIDDEN'));
      }

      // If branch has historical orders, soft-deactivate to protect financial ledger integrity
      if (branch._count.orders > 0) {
        const deactivated = await prisma.branch.update({
          where: { id },
          data: { isActive: false },
        });

        if (req.user?.id) {
          await logStaffAction(
            branch.restaurantId,
            req.user.id,
            'BRANCH_DEACTIVATED',
            `Branch '${branch.name}' has ${branch._count.orders} orders and was deactivated rather than deleted.`
          );
        }

        return sendSuccess(res, {
          id: deactivated.id,
          deactivated: true,
          message: 'Branch has historical order records and was marked inactive.',
        });
      }

      // If no orders, unassign any tables/users and delete
      await prisma.$transaction([
        prisma.table.updateMany({ where: { branchId: id }, data: { branchId: null } }),
        prisma.user.updateMany({ where: { branchId: id }, data: { branchId: null } }),
        prisma.branch.delete({ where: { id } }),
      ]);

      if (req.user?.id) {
        await logStaffAction(
          branch.restaurantId,
          req.user.id,
          'BRANCH_DELETED',
          `Deleted branch '${branch.name}' (${branch.code})`
        );
      }

      return sendSuccess(res, { id, deleted: true, message: 'Branch deleted successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/branches/:id/assign-table
 * Assign or reassign a table to this branch.
 */
router.post(
  '/:id/assign-table',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { tableId } = req.body;

      if (!tableId) {
        return next(new AppError('tableId is required', 400, 'VALIDATION_ERROR'));
      }

      const table = await prisma.table.findUnique({ where: { id: tableId } });
      if (!table) {
        return next(new AppError('Table not found', 404, 'NOT_FOUND'));
      }

      const updated = await prisma.table.update({
        where: { id: tableId },
        data: { branchId: id },
      });

      return sendSuccess(res, updated, { message: `Table ${updated.tableNumber} assigned to branch` });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/branches/:id/assign-staff
 * Assign or transfer staff member to this branch.
 */
router.post(
  '/:id/assign-staff',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return next(new AppError('userId is required', 400, 'VALIDATION_ERROR'));
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return next(new AppError('Staff user not found', 404, 'NOT_FOUND'));
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { branchId: id },
      });

      return sendSuccess(res, { id: updated.id, name: updated.name, branchId: updated.branchId }, {
        message: `Staff member ${updated.name} assigned to branch`,
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
