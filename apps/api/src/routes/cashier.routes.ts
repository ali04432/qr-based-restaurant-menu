import { Router, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import { emitToRestaurant } from '../socket/socket.server';
import { SOCKET_EVENTS } from '../socket/events';
import { logStaffAction } from '../utils/audit';
import {
  paymentConfirmationSchema,
  paymentRefundSchema,
  operationalAiQuerySchema,
} from '@qr-menu/shared';

// ============================================================
// Phase 5: Cashier & POS Billing API Router
// Role-enforced: CASHIER, MANAGER, ADMIN, SUPER_ADMIN
// ============================================================

const router = Router();

// Apply auth & role checks across all cashier routes
router.use(
  authMiddleware,
  requireRole(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.CASHIER
  )
);

/** Helper to extract effective restaurantId */
function getRestaurantId(req: AuthenticatedRequest): string {
  const restId =
    req.user?.role === UserRole.SUPER_ADMIN
      ? (req.query.restaurantId as string) || req.user?.restaurantId
      : req.user?.restaurantId;

  if (!restId) {
    throw new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR');
  }
  return restId;
}

/**
 * GET /api/cashier/summary
 * Live register KPIs for Cashier Dashboard
 */
router.get('/summary', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayOrders, payments] = await Promise.all([
      prisma.order.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart },
        },
        select: {
          id: true,
          total: true,
          paymentStatus: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          restaurantId,
          createdAt: { gte: todayStart },
        },
        select: {
          amount: true,
          method: true,
          status: true,
        },
      }),
    ]);

    const totalOrders = todayOrders.length;
    const paidOrders = todayOrders.filter((o) => o.paymentStatus === 'COMPLETED').length;
    const pendingPayments = todayOrders.filter((o) => o.paymentStatus === 'PENDING').length;

    let todaySales = 0;
    let cashTotal = 0;
    let cardTotal = 0;
    let digitalTotal = 0;

    payments.forEach((p) => {
      if (p.status === 'COMPLETED') {
        todaySales += p.amount;
        if (p.method === 'CASH') cashTotal += p.amount;
        else if (p.method === 'CARD') cardTotal += p.amount;
        else digitalTotal += p.amount;
      }
    });

    return sendSuccess(res, {
      todaySales: parseFloat(todaySales.toFixed(2)),
      totalOrders,
      paidOrders,
      pendingPayments,
      cashTotal: parseFloat(cashTotal.toFixed(2)),
      cardTotal: parseFloat(cardTotal.toFixed(2)),
      digitalTotal: parseFloat(digitalTotal.toFixed(2)),
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cashier/orders
 * Filterable order ledger for Cashier Register
 */
router.get('/orders', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { status, paymentStatus, search, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      restaurantId,
      ...(status && status !== 'ALL' && { status: status as any }),
      ...(paymentStatus && paymentStatus !== 'ALL' && { paymentStatus: paymentStatus as any }),
      ...(search && {
        OR: [
          { orderNumber: { contains: search, mode: 'insensitive' } },
          { table: { tableNumber: { contains: search, mode: 'insensitive' } } },
          { customerNote: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        include: {
          items: true,
          table: { select: { tableNumber: true } },
          payments: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where: whereClause }),
    ]);

    const formatted = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      tableId: o.tableId,
      tableNumber: o.table?.tableNumber || '01',
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.payments[0]?.method || o.paymentMethod || 'CASH',
      total: o.total,
      itemsCount: o.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: o.createdAt.toISOString(),
      customerName: o.customerNote || undefined,
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cashier/orders/:id/bill
 * Itemized authoritative billing breakdown for an order
 */
router.get('/orders/:id/bill', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: { id, restaurantId },
      include: {
        items: true,
        table: true,
        payments: { orderBy: { createdAt: 'desc' } },
        restaurant: { select: { name: true, taxRate: true, serviceCharge: true } },
      },
    });

    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const paidAmount = order.payments
      .filter((p) => p.status === 'COMPLETED')
      .reduce((sum, p) => sum + p.amount, 0);

    const balanceDue = Math.max(0, parseFloat((order.total - paidAmount).toFixed(2)));

    const billDetail = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      tableId: order.tableId,
      tableNumber: order.table?.tableNumber || '01',
      createdAt: order.createdAt.toISOString(),
      items: order.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      serviceCharge: order.serviceCharge,
      tax: order.tax,
      taxRate: order.restaurant.taxRate || 8.0,
      discount: order.discount,
      total: order.total,
      paidAmount: parseFloat(paidAmount.toFixed(2)),
      balanceDue,
      paymentStatus: order.paymentStatus,
      existingPaymentId: order.payments[0]?.id,
    };

    return sendSuccess(res, billDetail);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/cashier/payments/confirm
 * Atomic payment confirmation & receipt issuance
 */
router.post('/payments/confirm', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const parsed = paymentConfirmationSchema.safeParse(req.body);

    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { orderId, method, receivedAmount, changeAmount, transactionRef, notes } = parsed.data;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { table: true, restaurant: true, items: true, payments: true },
    });

    if (!order) return next(new AppError('Order not found', 404, 'NOT_FOUND'));

    const amount = parsed.data.amount ?? order.total;

    if (order.paymentStatus === 'COMPLETED') {
      return next(new AppError('This order has already been paid in full', 400, 'ALREADY_PAID'));
    }

    // Validation for cash payment
    if (method === 'CASH') {
      if (receivedAmount !== undefined && receivedAmount < amount) {
        return next(
          new AppError(`Received amount (Rs. ${receivedAmount}) is less than total amount (Rs. ${amount})`, 400, 'INSUFFICIENT_AMOUNT')
        );
      }
    }

    const computedChange =
      method === 'CASH' && receivedAmount !== undefined
        ? Math.max(0, parseFloat((receivedAmount - amount).toFixed(2)))
        : changeAmount || 0;

    // Atomic transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          restaurantId,
          orderId,
          method: method as any,
          amount,
          receivedAmount: receivedAmount || amount,
          changeAmount: computedChange,
          status: 'COMPLETED',
          transactionRef: transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
          paidAt: new Date(),
          processedById: req.user!.id,
          notes,
        },
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: 'COMPLETED',
          paymentMethod: method as any,
          status: ['SERVED', 'READY'].includes(order.status) ? 'COMPLETED' : order.status,
        },
        include: { table: true },
      });

      return { payment, updatedOrder };
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'PAYMENT_CONFIRMED',
      `Payment of Rs. ${amount} (${method}) confirmed for Order #${order.orderNumber} (Cashier: ${req.user!.name})`
    );

    // Prepare thermal receipt payload
    const receipt: any = {
      restaurantName: order.restaurant.name || 'Silver Sapoon Restaurant',
      address: order.restaurant.address || 'Main Boulevard, Gulberg III, Lahore',
      phone: order.restaurant.phone || '+92 42 111 727 666',
      orderNumber: order.orderNumber,
      tableNumber: order.table?.tableNumber || '01',
      date: new Date().toLocaleDateString('en-GB'),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashierName: req.user!.name,
      items: order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: order.subtotal,
      serviceCharge: order.serviceCharge,
      tax: order.tax,
      discount: order.discount,
      total: order.total,
      paymentMethod: method,
      amountReceived: receivedAmount || amount,
      change: computedChange,
      transactionRef: result.payment.transactionRef,
    };

    emitToRestaurant(restaurantId, SOCKET_EVENTS.PAYMENT_COMPLETED, {
      payment: result.payment,
      order: result.updatedOrder,
    });

    return sendSuccess(res, {
      payment: result.payment,
      order: result.updatedOrder,
      receipt,
    }, { message: 'Payment confirmed successfully' });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cashier/payments/:id/receipt
 * Retrieve formatted thermal receipt data
 */
router.get('/payments/:id/receipt', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const payment = await prisma.payment.findFirst({
      where: { id, restaurantId },
      include: {
        order: {
          include: {
            items: true,
            table: true,
            restaurant: true,
          },
        },
        processedBy: { select: { name: true } },
      },
    });

    if (!payment) return next(new AppError('Payment not found', 404, 'NOT_FOUND'));

    const receipt = {
      restaurantName: payment.order.restaurant.name || 'Silver Sapoon Restaurant',
      address: payment.order.restaurant.address || 'Main Boulevard, Gulberg III, Lahore',
      phone: payment.order.restaurant.phone || '+92 42 111 727 666',
      orderNumber: payment.order.orderNumber,
      tableNumber: payment.order.table?.tableNumber || '01',
      date: payment.paidAt ? new Date(payment.paidAt).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'),
      time: payment.paidAt
        ? new Date(payment.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashierName: payment.processedBy?.name || 'Cashier',
      items: payment.order.items.map((i) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        subtotal: i.subtotal,
      })),
      subtotal: payment.order.subtotal,
      serviceCharge: payment.order.serviceCharge,
      tax: payment.order.tax,
      discount: payment.order.discount,
      total: payment.amount,
      paymentMethod: payment.method,
      amountReceived: payment.receivedAmount || payment.amount,
      change: payment.changeAmount || 0,
      transactionRef: payment.transactionRef || undefined,
    };

    return sendSuccess(res, receipt);
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cashier/transactions
 * Filterable payment transaction history
 */
router.get('/transactions', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const {
      method,
      status,
      search,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const whereClause: any = {
      restaurantId,
      ...(method && method !== 'ALL' && { method: method as any }),
      ...(status && status !== 'ALL' && { status: status as any }),
      ...(search && {
        OR: [
          { transactionRef: { contains: search, mode: 'insensitive' } },
          { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
          { order: { table: { tableNumber: { contains: search, mode: 'insensitive' } } } },
        ],
      }),
      ...(startDate && {
        createdAt: {
          gte: new Date(startDate),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const [transactions, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: whereClause,
        include: {
          order: {
            select: {
              id: true,
              orderNumber: true,
              total: true,
              table: { select: { tableNumber: true } },
            },
          },
          processedBy: { select: { id: true, name: true } },
          refunds: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.payment.count({ where: whereClause }),
    ]);

    const formatted = transactions.map((t) => ({
      id: t.id,
      orderId: t.orderId,
      orderNumber: t.order.orderNumber,
      tableNumber: t.order.table?.tableNumber || '01',
      amount: t.amount,
      method: t.method,
      status: t.status,
      cashier: t.processedBy?.name || 'Staff',
      transactionRef: t.transactionRef || `TXN-${t.id.slice(0, 8)}`,
      paidAt: t.paidAt?.toISOString() || t.createdAt.toISOString(),
      createdAt: t.createdAt.toISOString(),
      isRefunded: t.refunds.length > 0 || t.status === 'REFUNDED',
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/cashier/payments/:id/refund
 * Process payment refund with audit log
 */
router.post('/payments/:id/refund', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { id } = req.params;

    const parsed = paymentRefundSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { reason, method = 'CASH' } = parsed.data;

    const payment = await prisma.payment.findFirst({
      where: { id, restaurantId },
      include: { order: true },
    });

    if (!payment) return next(new AppError('Payment not found', 404, 'NOT_FOUND'));

    if (payment.status === 'REFUNDED') {
      return next(new AppError('This payment has already been refunded', 400, 'ALREADY_REFUNDED'));
    }

    const amount = parsed.data.amount ?? payment.amount;

    if (amount > payment.amount) {
      return next(new AppError(`Refund amount cannot exceed original payment of Rs. ${payment.amount}`, 400, 'INVALID_AMOUNT'));
    }

    const refund = await prisma.$transaction(async (tx) => {
      const ref = await tx.paymentRefund.create({
        data: {
          restaurantId,
          paymentId: id,
          amount,
          reason: reason ?? '',
          method,
          staffId: req.user!.id,
        },
      });

      await tx.payment.update({
        where: { id },
        data: { status: 'REFUNDED' },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: { paymentStatus: 'PENDING' },
      });

      return ref;
    });

    await logStaffAction(
      restaurantId,
      req.user!.id,
      'PAYMENT_REFUNDED',
      `Refund of Rs. ${amount} processed for Order #${payment.order.orderNumber}. Reason: ${reason}`
    );

    emitToRestaurant(restaurantId, SOCKET_EVENTS.PAYMENT_REFUNDED, {
      paymentId: id,
      refund,
    });

    return sendSuccess(res, refund, { message: `Refund of Rs. ${amount} processed successfully` });
  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/cashier/analytics/payment-methods
 * Payment method breakdown with revenue percentages
 */
router.get('/analytics/payment-methods', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const { startDate, endDate } = req.query as Record<string, string>;

    const whereClause: any = {
      restaurantId,
      status: 'COMPLETED',
      ...(startDate && {
        createdAt: {
          gte: new Date(startDate),
          ...(endDate && { lte: new Date(endDate) }),
        },
      }),
    };

    const payments = await prisma.payment.findMany({
      where: whereClause,
      select: { method: true, amount: true },
    });

    const methodMap: Record<string, { amount: number; count: number }> = {
      CASH: { amount: 0, count: 0 },
      CARD: { amount: 0, count: 0 },
      JAZZCASH: { amount: 0, count: 0 },
      EASYPAISA: { amount: 0, count: 0 },
      ONLINE: { amount: 0, count: 0 },
      BANK_TRANSFER: { amount: 0, count: 0 },
      OTHER: { amount: 0, count: 0 },
    };

    let grandTotal = 0;

    payments.forEach((p) => {
      const key = p.method in methodMap ? p.method : 'OTHER';
      methodMap[key].amount += p.amount;
      methodMap[key].count += 1;
      grandTotal += p.amount;
    });

    const breakdown = Object.entries(methodMap).map(([method, data]) => ({
      method,
      amount: parseFloat(data.amount.toFixed(2)),
      count: data.count,
      percentage: grandTotal > 0 ? parseFloat(((data.amount / grandTotal) * 100).toFixed(1)) : 0,
    }));

    return sendSuccess(res, {
      totalRevenue: parseFloat(grandTotal.toFixed(2)),
      totalTransactions: payments.length,
      breakdown,
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * POST /api/cashier/ai/query
 * Cashier operational AI assistant answering billing & register questions
 */
router.post('/ai/query', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const restaurantId = getRestaurantId(req);
    const parsed = operationalAiQuerySchema.safeParse({ ...req.body, role: 'CASHIER' });

    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0].message, 400, 'VALIDATION_ERROR'));
    }

    const { query } = parsed.data;
    const lower = query.toLowerCase();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayPayments, pendingOrders] = await Promise.all([
      prisma.payment.findMany({
        where: { restaurantId, createdAt: { gte: todayStart } },
        include: { order: { include: { table: true } } },
      }),
      prisma.order.findMany({
        where: { restaurantId, paymentStatus: 'PENDING' },
        include: { table: true },
        orderBy: { total: 'desc' },
      }),
    ]);

    let answer = '';
    const suggestions: string[] = [
      'How much did we sell today?',
      'What is the current cash total?',
      'How many payments are pending?',
      'Which payment method generated the most revenue?',
      'Show today’s biggest order',
    ];

    const completedPayments = todayPayments.filter((p) => p.status === 'COMPLETED');
    const totalTodaySales = completedPayments.reduce((s, p) => s + p.amount, 0);
    const cashTotal = completedPayments.filter((p) => p.method === 'CASH').reduce((s, p) => s + p.amount, 0);

    if (lower.includes('sell') || lower.includes('sales') || lower.includes('revenue') || lower.includes('total today')) {
      answer = `Today's gross settled sales are PKR ${totalTodaySales.toLocaleString()} across ${completedPayments.length} transactions.`;
    } else if (lower.includes('cash') || lower.includes('drawer')) {
      answer = `Cash collected today is PKR ${cashTotal.toLocaleString()} (${completedPayments.length > 0 ? ((cashTotal / totalTodaySales) * 100).toFixed(0) : 0}% of settled revenue).`;
    } else if (lower.includes('pending') || lower.includes('unpaid')) {
      const pendingSum = pendingOrders.reduce((s, o) => s + o.total, 0);
      answer = `There are currently ${pendingOrders.length} pending order(s) awaiting payment, totaling PKR ${pendingSum.toLocaleString()}.`;
    } else if (lower.includes('method') || lower.includes('most revenue') || lower.includes('highest')) {
      const byMethod: Record<string, number> = {};
      completedPayments.forEach((p) => {
        byMethod[p.method] = (byMethod[p.method] || 0) + p.amount;
      });
      const topMethod = Object.entries(byMethod).sort((a, b) => b[1] - a[1])[0];
      if (topMethod) {
        answer = `${topMethod[0]} is your top payment method today, generating PKR ${topMethod[1].toLocaleString()}.`;
      } else {
        answer = 'No payment transactions have been recorded today yet.';
      }
    } else if (lower.includes('biggest') || lower.includes('largest')) {
      const sorted = [...completedPayments].sort((a, b) => b.amount - a.amount);
      if (sorted.length > 0) {
        const top = sorted[0];
        answer = `The largest transaction today is Order #${top.order.orderNumber} for Table ${top.order.table?.tableNumber || '01'} at PKR ${top.amount.toLocaleString()}.`;
      } else {
        answer = 'No completed orders found today.';
      }
    } else {
      answer = `Today: PKR ${totalTodaySales.toLocaleString()} settled across ${completedPayments.length} orders. Current pending: ${pendingOrders.length} orders. Cash in drawer: PKR ${cashTotal.toLocaleString()}.`;
    }

    return sendSuccess(res, {
      question: query,
      answer,
      suggestions,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
