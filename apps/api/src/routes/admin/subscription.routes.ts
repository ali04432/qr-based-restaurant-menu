import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { getOrCreateDefaultPlan, getRestaurantSubscription } from '../../middleware/entitlement.middleware';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/subscriptions/plans
 * List all available SaaS subscription plans.
 */
router.get(
  '/plans',
  authMiddleware,
  async (_req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      await getOrCreateDefaultPlan(); // Ensure default plans are seeded

      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: { priceMonthly: 'asc' },
      });

      return sendSuccess(res, plans);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/subscriptions/current
 * Retrieve current restaurant's active subscription, plan details, and quota usage.
 */
router.get(
  '/current',
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

      const subscription = await getRestaurantSubscription(restaurantId);

      // Measure current tenant usage
      const [tableCount, staffCount, branchCount, monthlyOrdersCount] = await Promise.all([
        prisma.table.count({ where: { restaurantId, isActive: true } }),
        prisma.user.count({ where: { restaurantId, status: 'ACTIVE' } }),
        prisma.branch.count({ where: { restaurantId, isActive: true } }),
        prisma.order.count({
          where: {
            restaurantId,
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        }),
      ]);

      const plan = subscription.plan;

      const usage = {
        tables: { current: tableCount, limit: plan.maxTables, percent: Math.min(100, Math.round((tableCount / plan.maxTables) * 100)) },
        staff: { current: staffCount, limit: plan.maxStaff, percent: Math.min(100, Math.round((staffCount / plan.maxStaff) * 100)) },
        branches: { current: branchCount, limit: plan.maxBranches, percent: Math.min(100, Math.round((branchCount / plan.maxBranches) * 100)) },
        ordersThisMonth: { current: monthlyOrdersCount, limit: plan.maxOrdersPerMonth, percent: Math.min(100, Math.round((monthlyOrdersCount / plan.maxOrdersPerMonth) * 100)) },
        features: {
          hasAiFeatures: plan.hasAiFeatures,
          hasAdvancedAnalytics: plan.hasAdvancedAnalytics,
          hasIntegrations: plan.hasIntegrations,
          hasCustomBranding: plan.hasCustomBranding,
        },
      };

      return sendSuccess(res, {
        subscription,
        usage,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/subscriptions/upgrade
 * Upgrade or change restaurant plan tier.
 */
router.post(
  '/upgrade',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { planTier, billingCycle } = req.body;

      if (!planTier) {
        return next(new AppError('planTier is required (STARTER, PRO, BUSINESS, ENTERPRISE)', 400, 'VALIDATION_ERROR'));
      }

      const targetPlan = await prisma.subscriptionPlan.findUnique({
        where: { tier: planTier },
      });

      if (!targetPlan) {
        return next(new AppError(`Plan tier '${planTier}' does not exist`, 404, 'NOT_FOUND'));
      }

      const existingSub = await getRestaurantSubscription(restaurantId);

      const renewalDate = new Date();
      if (billingCycle === 'YEARLY') {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      } else {
        renewalDate.setDate(renewalDate.getDate() + 30);
      }

      const updated = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          planId: targetPlan.id,
          status: 'ACTIVE',
          billingCycle: billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
          renewalDate,
          cancelledAt: null,
        },
        include: { plan: true },
      });

      if (req.user?.id) {
        await logStaffAction(
          restaurantId,
          req.user.id,
          'SUBSCRIPTION_UPGRADED',
          `Upgraded subscription to ${targetPlan.tier} (${billingCycle || 'MONTHLY'})`
        );
      }

      return sendSuccess(res, updated, { message: `Successfully upgraded to ${targetPlan.name}` });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/subscriptions/cancel
 * Cancel active subscription.
 */
router.post(
  '/cancel',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const existingSub = await getRestaurantSubscription(restaurantId);

      const updated = await prisma.subscription.update({
        where: { id: existingSub.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
        include: { plan: true },
      });

      if (req.user?.id) {
        await logStaffAction(
          restaurantId,
          req.user.id,
          'SUBSCRIPTION_CANCELLED',
          `Cancelled subscription for restaurant ${restaurantId}`
        );
      }

      return sendSuccess(res, updated, { message: 'Subscription cancelled successfully' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
