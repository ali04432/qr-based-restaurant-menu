import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthenticatedRequest } from './auth.middleware';
import { AppError } from './error.middleware';
import { UserRole } from '@qr-menu/shared';

export type EntitlementFeature = 'TABLES' | 'STAFF' | 'BRANCHES' | 'AI' | 'INTEGRATIONS';

/**
 * Get or seed default subscription plan if none exist
 */
export async function getOrCreateDefaultPlan() {
  let defaultPlan = await prisma.subscriptionPlan.findUnique({
    where: { tier: 'STARTER' },
  });

  if (!defaultPlan) {
    defaultPlan = await prisma.subscriptionPlan.create({
      data: {
        tier: 'STARTER',
        name: 'Starter Plan',
        priceMonthly: 29.0,
        priceYearly: 290.0,
        maxStaff: 5,
        maxTables: 15,
        maxBranches: 1,
        maxOrdersPerMonth: 500,
        hasAiFeatures: false,
        hasAdvancedAnalytics: false,
        hasIntegrations: false,
        hasCustomBranding: false,
      },
    });

    // Also seed PRO, BUSINESS, and ENTERPRISE plans
    await prisma.subscriptionPlan.createMany({
      data: [
        {
          tier: 'PRO',
          name: 'Professional Plan',
          priceMonthly: 79.0,
          priceYearly: 790.0,
          maxStaff: 15,
          maxTables: 40,
          maxBranches: 3,
          maxOrdersPerMonth: 2500,
          hasAiFeatures: true,
          hasAdvancedAnalytics: true,
          hasIntegrations: true,
          hasCustomBranding: false,
        },
        {
          tier: 'BUSINESS',
          name: 'Business Enterprise',
          priceMonthly: 199.0,
          priceYearly: 1990.0,
          maxStaff: 50,
          maxTables: 120,
          maxBranches: 10,
          maxOrdersPerMonth: 10000,
          hasAiFeatures: true,
          hasAdvancedAnalytics: true,
          hasIntegrations: true,
          hasCustomBranding: true,
        },
        {
          tier: 'ENTERPRISE',
          name: 'Global Franchise Tier',
          priceMonthly: 499.0,
          priceYearly: 4990.0,
          maxStaff: 9999,
          maxTables: 9999,
          maxBranches: 9999,
          maxOrdersPerMonth: 999999,
          hasAiFeatures: true,
          hasAdvancedAnalytics: true,
          hasIntegrations: true,
          hasCustomBranding: true,
        },
      ],
      skipDuplicates: true,
    });
  }

  return defaultPlan;
}

/**
 * Fetch or initialize active subscription for a restaurant
 */
export async function getRestaurantSubscription(restaurantId: string) {
  let sub = await prisma.subscription.findUnique({
    where: { restaurantId },
    include: { plan: true },
  });

  if (!sub) {
    const defaultPlan = await getOrCreateDefaultPlan();
    const renewalDate = new Date();
    renewalDate.setDate(renewalDate.getDate() + 30);

    sub = await prisma.subscription.create({
      data: {
        restaurantId,
        planId: defaultPlan.id,
        status: 'ACTIVE',
        billingCycle: 'MONTHLY',
        renewalDate,
      },
      include: { plan: true },
    });
  }

  return sub;
}

/**
 * Express middleware to enforce feature usage limits according to tenant's active SaaS tier
 */
export function requireEntitlement(feature: EntitlementFeature) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Super Admin bypasses tenant limits
      if (req.user?.role === UserRole.SUPER_ADMIN) {
        return next();
      }

      const restaurantId = req.user?.restaurantId;
      if (!restaurantId) {
        return next(new AppError('Restaurant ID required for entitlement verification', 400, 'VALIDATION_ERROR'));
      }

      const sub = await getRestaurantSubscription(restaurantId);
      const plan = sub.plan;

      if (sub.status === 'EXPIRED' || sub.status === 'CANCELLED') {
        return next(
          new AppError(
            `Subscription status is ${sub.status}. Please reactivate your plan to access this feature.`,
            403,
            'SUBSCRIPTION_INACTIVE'
          )
        );
      }

      switch (feature) {
        case 'TABLES': {
          const currentCount = await prisma.table.count({
            where: { restaurantId, isActive: true },
          });
          if (currentCount >= plan.maxTables) {
            return next(
              new AppError(
                `Table limit reached (${currentCount}/${plan.maxTables}) on the ${plan.tier} plan. Please upgrade your plan to add more tables.`,
                403,
                'ENTITLEMENT_LIMIT_EXCEEDED'
              )
            );
          }
          break;
        }

        case 'STAFF': {
          const currentCount = await prisma.user.count({
            where: { restaurantId, status: 'ACTIVE' },
          });
          if (currentCount >= plan.maxStaff) {
            return next(
              new AppError(
                `Staff limit reached (${currentCount}/${plan.maxStaff}) on the ${plan.tier} plan. Please upgrade your plan to onboard more staff.`,
                403,
                'ENTITLEMENT_LIMIT_EXCEEDED'
              )
            );
          }
          break;
        }

        case 'BRANCHES': {
          const currentCount = await prisma.branch.count({
            where: { restaurantId, isActive: true },
          });
          if (currentCount >= plan.maxBranches) {
            return next(
              new AppError(
                `Branch location limit reached (${currentCount}/${plan.maxBranches}) on the ${plan.tier} plan. Upgrade to PRO or BUSINESS to unlock multi-location management.`,
                403,
                'ENTITLEMENT_LIMIT_EXCEEDED'
              )
            );
          }
          break;
        }

        case 'AI': {
          if (!plan.hasAiFeatures) {
            return next(
              new AppError(
                `AI recommendations and demand forecasting are not available on the ${plan.tier} plan. Please upgrade to PRO or higher to unlock AI features.`,
                403,
                'FEATURE_NOT_ENTITLED'
              )
            );
          }
          break;
        }

        case 'INTEGRATIONS': {
          if (!plan.hasIntegrations) {
            return next(
              new AppError(
                `Hardware printer and cloud integrations are not available on the ${plan.tier} plan. Please upgrade to PRO or higher to unlock integrations.`,
                403,
                'FEATURE_NOT_ENTITLED'
              )
            );
          }
          break;
        }
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
