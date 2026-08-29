import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole, AdjustLoyaltyPointsSchema } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';
import { calculateTier } from '../loyalty.routes';

const router = Router();

/**
 * GET /api/admin/loyalty/accounts
 * List all loyalty customer accounts for the restaurant with tier breakdown and search.
 */
router.get(
  '/accounts',
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

      const { search, tier } = req.query as { search?: string; tier?: string };

      const whereClause: any = { restaurantId };
      if (tier) {
        whereClause.tier = tier;
      }
      if (search) {
        whereClause.OR = [
          { phone: { contains: search, mode: 'insensitive' } },
          { customerName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [accounts, totalCount, tierAgg] = await Promise.all([
        prisma.loyaltyAccount.findMany({
          where: whereClause,
          include: {
            _count: { select: { transactions: true, redemptions: true, orders: true } },
          },
          orderBy: { pointsBalance: 'desc' },
          take: 100,
        }),
        prisma.loyaltyAccount.count({ where: { restaurantId } }),
        prisma.loyaltyAccount.groupBy({
          by: ['tier'],
          where: { restaurantId },
          _count: { _all: true },
          _sum: { pointsBalance: true },
        }),
      ]);

      const tierBreakdown = {
        BRONZE: 0,
        SILVER: 0,
        GOLD: 0,
        PLATINUM: 0,
      };

      let totalPointsCirculating = 0;
      tierAgg.forEach((t) => {
        if (t.tier in tierBreakdown) {
          (tierBreakdown as any)[t.tier] = t._count._all;
        }
        totalPointsCirculating += t._sum.pointsBalance || 0;
      });

      return sendSuccess(res, {
        accounts,
        summary: {
          totalMembers: totalCount,
          totalPointsCirculating,
          tierBreakdown,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/loyalty/accounts/:id/adjust
 * Manual point adjustment with staff audit logging
 */
router.post(
  '/accounts/:id/adjust',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const parsed = AdjustLoyaltyPointsSchema.safeParse(req.body);
      if (!parsed.success) {
        return next(new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR'));
      }

      const { points, description } = parsed.data;

      const account = await prisma.loyaltyAccount.findUnique({
        where: { id },
      });

      if (!account) {
        return next(new AppError('Loyalty account not found', 404, 'ACCOUNT_NOT_FOUND'));
      }

      const newBalance = Math.max(0, account.pointsBalance + points);
      const newLifetime = points > 0 ? account.lifetimePoints + points : account.lifetimePoints;
      const newTier = calculateTier(newLifetime);

      const updated = await prisma.$transaction(async (tx) => {
        const acc = await tx.loyaltyAccount.update({
          where: { id },
          data: {
            pointsBalance: newBalance,
            lifetimePoints: newLifetime,
            tier: newTier,
          },
        });

        await tx.loyaltyTransaction.create({
          data: {
            restaurantId: account.restaurantId,
            loyaltyAccountId: account.id,
            points,
            description: description || `Manual adjustment by staff`,
          },
        });

        return acc;
      });

      if (req.user?.id) {
        await logStaffAction(
          account.restaurantId,
          req.user.id,
          'LOYALTY_POINTS_ADJUSTED',
          `Adjusted ${points > 0 ? '+' : ''}${points} points for account ${account.phone}. Reason: ${description || 'N/A'}`
        );
      }

      return sendSuccess(res, updated, { message: `Successfully adjusted ${points > 0 ? '+' : ''}${points} points` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
