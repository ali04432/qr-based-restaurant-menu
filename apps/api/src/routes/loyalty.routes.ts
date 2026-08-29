import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { CreateLoyaltyAccountSchema, RedeemRewardSchema } from '@qr-menu/shared';

const router = Router();

// Helper to determine customer tier from lifetime points
export function calculateTier(lifetimePoints: number): 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' {
  if (lifetimePoints >= 4000) return 'PLATINUM';
  if (lifetimePoints >= 1500) return 'GOLD';
  if (lifetimePoints >= 500) return 'SILVER';
  return 'BRONZE';
}

/**
 * GET /api/loyalty/account
 * Public / Customer lookup by phone and restaurantId
 */
router.get('/account', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId, phone } = req.query as { restaurantId: string; phone: string };

    if (!restaurantId || !phone) {
      return next(new AppError('restaurantId and phone are required', 400, 'VALIDATION_ERROR'));
    }

    const cleanPhone = phone.trim();

    let account = await prisma.loyaltyAccount.findUnique({
      where: {
        restaurantId_phone: {
          restaurantId,
          phone: cleanPhone,
        },
      },
      include: {
        redemptions: {
          where: { status: 'ACTIVE', expiresAt: { gt: new Date() } },
          include: { reward: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!account) {
      return sendSuccess(res, null, { message: 'Loyalty account not found' });
    }

    return sendSuccess(res, account);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/loyalty/register
 * Customer enrollment / profile update
 */
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = CreateLoyaltyAccountSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR'));
    }

    const { restaurantId, phone, email, customerName } = parsed.data;

    if (!restaurantId) {
      return next(new AppError('restaurantId is required', 400, 'VALIDATION_ERROR'));
    }

    const cleanPhone = phone.trim();

    // Upsert customer loyalty account
    const account = await prisma.loyaltyAccount.upsert({
      where: {
        restaurantId_phone: {
          restaurantId,
          phone: cleanPhone,
        },
      },
      update: {
        customerName: customerName || undefined,
        email: email || undefined,
      },
      create: {
        restaurantId,
        phone: cleanPhone,
        customerName: customerName || null,
        email: email || null,
        pointsBalance: 50, // Welcome bonus points
        lifetimePoints: 50,
        tier: 'BRONZE',
      },
    });

    return sendCreated(res, account, 'Loyalty account registered successfully! 50 welcome points credited.');
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/loyalty/rewards
 * Public / Customer view of available rewards for a restaurant
 */
router.get('/rewards', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId } = req.query as { restaurantId: string };
    if (!restaurantId) {
      return next(new AppError('restaurantId is required', 400, 'VALIDATION_ERROR'));
    }

    const rewards = await prisma.reward.findMany({
      where: {
        restaurantId,
        isActive: true,
      },
      include: {
        menuItem: {
          select: { id: true, name: true, image: true, price: true },
        },
      },
      orderBy: { pointsCost: 'asc' },
    });

    return sendSuccess(res, rewards);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/loyalty/redeem
 * Customer redeems loyalty points for a reward voucher
 */
router.post('/redeem', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = RedeemRewardSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message || 'Invalid input', 400, 'VALIDATION_ERROR'));
    }

    const { loyaltyAccountId, rewardId, orderId } = parsed.data;

    // Execute atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      const account = await tx.loyaltyAccount.findUnique({
        where: { id: loyaltyAccountId },
      });

      if (!account) {
        throw new AppError('Loyalty account not found', 404, 'ACCOUNT_NOT_FOUND');
      }

      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward || !reward.isActive) {
        throw new AppError('Reward is not active or available', 400, 'REWARD_UNAVAILABLE');
      }

      if (account.restaurantId !== reward.restaurantId) {
        throw new AppError('Cross-restaurant reward redemption is not permitted', 403, 'CROSS_RESTAURANT_DENIED');
      }

      if (account.pointsBalance < reward.pointsCost) {
        throw new AppError(
          `Insufficient points balance. You have ${account.pointsBalance} points, but ${reward.pointsCost} are required.`,
          400,
          'INSUFFICIENT_POINTS'
        );
      }

      // Deduct points
      const updatedAccount = await tx.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          pointsBalance: account.pointsBalance - reward.pointsCost,
        },
      });

      // Log transaction
      await tx.loyaltyTransaction.create({
        data: {
          restaurantId: account.restaurantId,
          loyaltyAccountId: account.id,
          orderId: orderId || null,
          points: -reward.pointsCost,
          description: `Redeemed for ${reward.name}`,
        },
      });

      // Generate voucher
      const voucherCode = `RWD-${randomUUID().substring(0, 6).toUpperCase()}`;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (reward.expiryDays || 30));

      const redemption = await tx.rewardRedemption.create({
        data: {
          restaurantId: account.restaurantId,
          loyaltyAccountId: account.id,
          rewardId: reward.id,
          orderId: orderId || null,
          pointsSpent: reward.pointsCost,
          status: 'ACTIVE',
          code: voucherCode,
          expiresAt,
        },
        include: {
          reward: true,
        },
      });

      return {
        redemption,
        remainingPoints: updatedAccount.pointsBalance,
      };
    });

    return sendCreated(res, result, `Reward "${result.redemption.reward.name}" redeemed successfully!`);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/loyalty/transactions
 * Customer points history
 */
router.get('/transactions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { loyaltyAccountId } = req.query as { loyaltyAccountId: string };
    if (!loyaltyAccountId) {
      return next(new AppError('loyaltyAccountId is required', 400, 'VALIDATION_ERROR'));
    }

    const transactions = await prisma.loyaltyTransaction.findMany({
      where: { loyaltyAccountId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return sendSuccess(res, transactions);
  } catch (err) {
    return next(err);
  }
});

export default router;
