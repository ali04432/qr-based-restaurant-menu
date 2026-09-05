import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { sendSuccess, sendCreated } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { getOrCreateDefaultPlan } from '../../middleware/entitlement.middleware';
import { logStaffAction } from '../../utils/audit';

const router = Router();

// Strict Super Admin Access Gate
router.use(authMiddleware, requireRole(UserRole.SUPER_ADMIN));

/**
 * GET /api/super-admin/overview
 * Platform-wide SaaS KPIs and executive overview.
 */
router.get('/overview', async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    await getOrCreateDefaultPlan();

    const [
      restaurantCount,
      userCount,
      orderCount,
      revenueAggregate,
      subscriptions,
    ] = await Promise.all([
      prisma.restaurant.count(),
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({
        _sum: { total: true },
        where: { status: { not: 'CANCELLED' as any } },
      }),
      prisma.subscription.findMany({
        include: { plan: true },
      }),
    ]);

    // Calculate Monthly Recurring Revenue (MRR)
    let mrr = 0;
    const planBreakdown: Record<string, number> = {
      STARTER: 0,
      PRO: 0,
      BUSINESS: 0,
      ENTERPRISE: 0,
    };

    subscriptions.forEach((sub) => {
      if (sub.status === 'ACTIVE' || sub.status === 'TRIALING') {
        const monthly = sub.billingCycle === 'YEARLY' ? sub.plan.priceYearly / 12 : sub.plan.priceMonthly;
        mrr += monthly;
        planBreakdown[sub.plan.tier] = (planBreakdown[sub.plan.tier] || 0) + 1;
      }
    });

    return sendSuccess(res, {
      totalRestaurants: restaurantCount,
      totalUsers: userCount,
      totalOrders: orderCount,
      platformGMV: parseFloat((revenueAggregate._sum.total || 0).toFixed(2)),
      mrr: parseFloat(mrr.toFixed(2)),
      arr: parseFloat((mrr * 12).toFixed(2)),
      activeSubscriptions: subscriptions.filter((s) => s.status === 'ACTIVE').length,
      planBreakdown,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/super-admin/restaurants
 * List all restaurant tenants with their subscription tier, order volume, and owner.
 */
router.get('/restaurants', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurants = await prisma.restaurant.findMany({
      include: {
        subscription: {
          include: { plan: true },
        },
        _count: {
          select: {
            branches: true,
            tables: true,
            users: true,
            orders: true,
          },
        },
        users: {
          where: { role: UserRole.ADMIN },
          select: { id: true, name: true, email: true },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      createdAt: r.createdAt,
      planTier: r.subscription?.plan?.tier || 'STARTER',
      subscriptionStatus: r.subscription?.status || 'ACTIVE',
      branchesCount: r._count.branches,
      tablesCount: r._count.tables,
      staffCount: r._count.users,
      ordersCount: r._count.orders,
      ownerEmail: r.users[0]?.email || 'N/A',
      ownerName: r.users[0]?.name || 'N/A',
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/super-admin/restaurants
 * Provision a new restaurant tenant with initial admin account and default subscription.
 */
router.post('/restaurants', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { name, slug, ownerName, ownerEmail, ownerPassword, planTier } = req.body;

    if (!name || !slug || !ownerEmail || !ownerPassword) {
      return next(new AppError('name, slug, ownerEmail, and ownerPassword are required', 400, 'VALIDATION_ERROR'));
    }

    const existingSlug = await prisma.restaurant.findUnique({ where: { slug } });
    if (existingSlug) {
      return next(new AppError(`Restaurant with slug '${slug}' already exists`, 409, 'DUPLICATE_SLUG'));
    }

    const existingEmail = await prisma.user.findUnique({ where: { email: ownerEmail } });
    if (existingEmail) {
      return next(new AppError(`User with email '${ownerEmail}' already exists`, 409, 'DUPLICATE_EMAIL'));
    }

    const targetPlan = planTier
      ? await prisma.subscriptionPlan.findUnique({ where: { tier: planTier } })
      : await getOrCreateDefaultPlan();

    const passwordHash = await bcrypt.hash(ownerPassword, 10);
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: { name, slug },
      });

      const adminUser = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          name: ownerName || name + ' Owner',
          email: ownerEmail,
          passwordHash,
          role: UserRole.ADMIN,
          status: 'ACTIVE',
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          restaurantId: restaurant.id,
          planId: targetPlan?.id || (await getOrCreateDefaultPlan()).id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          renewalDate,
        },
      });

      return { restaurant, adminUser, subscription };
    });

    if (req.user?.id) {
      await logStaffAction(
        result.restaurant.id,
        req.user.id,
        'TENANT_PROVISIONED',
        `Super Admin provisioned new tenant '${name}' (${slug}) with owner ${ownerEmail}`
      );
    }

    return sendCreated(res, result, 'Restaurant tenant provisioned successfully');
  } catch (err) {
    return next(err);
  }
});

/**
 * PATCH /api/super-admin/restaurants/:id/plan
 * Force assign or update a tenant's subscription plan.
 */
router.patch('/restaurants/:id/plan', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { planTier } = req.body;

    if (!planTier) {
      return next(new AppError('planTier is required', 400, 'VALIDATION_ERROR'));
    }

    const plan = await prisma.subscriptionPlan.findUnique({ where: { tier: planTier } });
    if (!plan) {
      return next(new AppError(`Plan tier '${planTier}' not found`, 404, 'NOT_FOUND'));
    }

    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    const sub = await prisma.subscription.upsert({
      where: { restaurantId: id },
      create: {
        restaurantId: id,
        planId: plan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate,
      },
      update: {
        planId: plan.id,
        status: 'ACTIVE',
        cancelledAt: null,
      },
      include: { plan: true },
    });

    return sendSuccess(res, sub, { message: `Tenant plan updated to ${plan.name}` });
  } catch (err) {
    return next(err);
  }
});

export default router;
