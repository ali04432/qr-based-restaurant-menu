import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { logStaffAction } from '../../utils/audit';

const router = Router();

/**
 * GET /api/admin/payments
 * List payment records with order and table information.
 */
router.get(
  '/',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER
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

      const { status, method, search } = req.query as Record<string, string>;

      const payments = await prisma.payment.findMany({
        where: {
          restaurantId,
          ...(status && status !== 'ALL' && { status: status as any }),
          ...(method && method !== 'ALL' && { method: method as any }),
          ...(search && {
            OR: [
              { transactionRef: { contains: search, mode: 'insensitive' } },
              { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
            ],
          }),
        },
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              tableId: true,
              table: { select: { tableNumber: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });

      const formatted = payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order.orderNumber,
        tableNumber: p.order.table?.tableNumber || p.order.tableId.replace(/^t-/, '') || '01',
        method: p.method,
        amount: p.amount,
        status: p.status,
        transactionRef: p.transactionRef || undefined,
        paidAt: p.paidAt?.toISOString() || undefined,
        createdAt: p.createdAt.toISOString(),
      }));

      return sendSuccess(res, formatted);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/payments/summary
 * Total volume metrics, payment method splits, and pending receipts.
 */
router.get(
  '/summary',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
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

      const payments = await prisma.payment.findMany({
        where: { restaurantId },
        select: { method: true, amount: true, status: true },
      });

      let totalCollected = 0;
      let pendingAmount = 0;
      let cashTotal = 0;
      let cardTotal = 0;
      let digitalTotal = 0;

      payments.forEach((p) => {
        if (p.status === 'COMPLETED') {
          totalCollected += p.amount;
          if (p.method === 'CASH') cashTotal += p.amount;
          else if (p.method === 'CARD') cardTotal += p.amount;
          else digitalTotal += p.amount;
        } else if (p.status === 'PENDING') {
          pendingAmount += p.amount;
        }
      });

      return sendSuccess(res, {
        totalCollected: parseFloat(totalCollected.toFixed(2)),
        pendingAmount: parseFloat(pendingAmount.toFixed(2)),
        cashTotal: parseFloat(cashTotal.toFixed(2)),
        cardTotal: parseFloat(cardTotal.toFixed(2)),
        digitalTotal: parseFloat(digitalTotal.toFixed(2)),
        paymentCount: payments.length,
      });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * PATCH /api/admin/payments/:id/status
 * Mark a payment status as COMPLETED / REFUNDED (e.g. cashier collects cash/card).
 */
router.patch(
  '/:id/status',
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER,
    UserRole.WAITER
  ),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status, transactionRef } = req.body;

      const validStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
      if (!status || !validStatuses.includes(status)) {
        return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400, 'VALIDATION_ERROR'));
      }

      const payment = await prisma.payment.findUnique({
        where: { id },
        include: { order: true },
      });

      if (!payment) {
        return next(new AppError('Payment record not found', 404, 'NOT_FOUND'));
      }

      if (req.user?.role !== UserRole.SUPER_ADMIN && payment.restaurantId !== req.user?.restaurantId) {
        return next(new AppError('Unauthorized', 403, 'FORBIDDEN'));
      }

      const updated = await prisma.$transaction(async (tx) => {
        const p = await tx.payment.update({
          where: { id },
          data: {
            status: status as any,
            ...(transactionRef && { transactionRef }),
            ...(status === 'COMPLETED' ? { paidAt: new Date() } : {}),
          },
        });

        // Also update order payment status
        if (status === 'COMPLETED') {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'COMPLETED' },
          });
        }

        return p;
      });

      if (req.user?.id) {
        await logStaffAction(
          payment.restaurantId,
          req.user.id,
          `PAYMENT_${status}`,
          `Payment for Order #${payment.order.orderNumber} marked as ${status} (Amount: Rs. ${payment.amount})`
        );
      }

      return sendSuccess(res, updated, { message: `Payment marked as ${status}` });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
