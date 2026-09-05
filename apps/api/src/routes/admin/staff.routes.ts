import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { requireEntitlement } from '../../middleware/entitlement.middleware';
import { UserRole } from '@qr-menu/shared';
import { createStaffSchema, updateStaffSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/staff
 * List all staff members for the restaurant.
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

      const staff = await prisma.user.findMany({
        where: { restaurantId },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          email: true,
          role: true,
          salary: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = staff.map((s) => ({
        id: s.id,
        restaurantId: s.restaurantId || '',
        name: s.name,
        email: s.email,
        role: s.role,
        salary: s.salary || 0,
        status: s.status,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/staff/payroll
 * Computes monthly payroll costs, active staff count, and salary distributions.
 */
router.get(
  '/payroll',
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

      const activeStaff = await prisma.user.findMany({
        where: { restaurantId, status: 'ACTIVE' },
        select: { id: true, name: true, role: true, salary: true },
      });

      let totalMonthlyPayroll = 0;
      const roleBreakdown: Record<string, { count: number; totalCost: number }> = {};

      activeStaff.forEach((s) => {
        const sal = s.salary || 0;
        totalMonthlyPayroll += sal;

        if (!roleBreakdown[s.role]) {
          roleBreakdown[s.role] = { count: 0, totalCost: 0 };
        }
        roleBreakdown[s.role].count += 1;
        roleBreakdown[s.role].totalCost += sal;
      });

      const averageSalary =
        activeStaff.length > 0 ? parseFloat((totalMonthlyPayroll / activeStaff.length).toFixed(2)) : 0;

      return sendSuccess(res, {
        totalActiveStaff: activeStaff.length,
        monthlyPayrollTotal: parseFloat(totalMonthlyPayroll.toFixed(2)),
        averageSalary,
        roleBreakdown,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/staff
 * Create a new staff account with hashed password.
 */
router.post(
  '/',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  requireEntitlement('STAFF'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const parsed = createStaffSchema.safeParse(req.body);
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

      // Check email uniqueness
      const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
      if (existing) {
        return next(new AppError('A user with this email address already exists.', 409, 'EMAIL_EXISTS'));
      }

      const passwordHash = await bcrypt.hash(parsed.data.password, 10);

      const user = await prisma.user.create({
        data: {
          restaurantId,
          name: parsed.data.name,
          email: parsed.data.email,
          passwordHash,
          role: parsed.data.role,
          salary: parsed.data.salary,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          email: true,
          role: true,
          salary: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (req.user?.id) {
        await logStaffAction(
          restaurantId,
          req.user.id,
          'STAFF_CREATED',
          `Created staff account for ${user.name} (${user.role}) with salary Rs. ${user.salary}`
        );
      }

      return sendCreated(res, user, 'Staff member created successfully');
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/staff/:id
 * Edit staff member attributes (name, email, role, salary, status).
 */
router.patch(
  '/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = updateStaffSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
      }

      const staff = await prisma.user.findUnique({ where: { id } });
      if (!staff) {
        return next(new AppError('Staff member not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && staff.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      let passwordHash: string | undefined = undefined;
      if (parsed.data.password) {
        passwordHash = await bcrypt.hash(parsed.data.password, 10);
      }

      const updated = await prisma.user.update({
        where: { id },
        data: {
          ...(parsed.data.name && { name: parsed.data.name }),
          ...(parsed.data.email && { email: parsed.data.email }),
          ...(parsed.data.role && { role: parsed.data.role }),
          ...(parsed.data.salary !== undefined && { salary: parsed.data.salary }),
          ...(parsed.data.status && { status: parsed.data.status }),
          ...(passwordHash && { passwordHash }),
        },
        select: {
          id: true,
          restaurantId: true,
          name: true,
          email: true,
          role: true,
          salary: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (req.user?.id && staff.restaurantId) {
        await logStaffAction(
          staff.restaurantId,
          req.user.id,
          'STAFF_UPDATED',
          `Updated staff details for ${updated.name} (${updated.role})`
        );
      }

      return sendSuccess(res, updated, { message: 'Staff member updated successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/staff/activity and /api/admin/staff/logs
 * Auditable staff action history.
 */
const handleGetStaffActivity = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId =
      req.user?.role === UserRole.SUPER_ADMIN
        ? (req.query.restaurantId as string) || req.user?.restaurantId
        : req.user?.restaurantId;

    if (!restaurantId) {
      return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
    }

    const logs = await prisma.staffActionLog.findMany({
      where: { restaurantId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = logs.map((l) => ({
      id: l.id,
      staffId: l.userId,
      staffName: l.user?.name || 'Staff Member',
      staffEmail: l.user?.email || '',
      staffRole: l.user?.role || UserRole.WAITER,
      action: l.action,
      details: l.details || '',
      createdAt: l.createdAt.toISOString(),
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
};

router.get(
  '/activity',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  handleGetStaffActivity
);

router.get(
  '/logs',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  handleGetStaffActivity
);

export default router;
