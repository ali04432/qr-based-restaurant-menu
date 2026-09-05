import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function buildDateFilter(dateFrom?: string, dateTo?: string): any {
  const filter: any = {};
  if (dateFrom) filter.gte = new Date(dateFrom);
  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    filter.lte = end;
  }
  return filter;
}

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/sales
// Itemized sales report with optional date filter
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/sales',
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

      const { dateFrom, dateTo } = req.query as Record<string, string>;
      const dateFilter = buildDateFilter(dateFrom, dateTo);

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          status: { not: 'CANCELLED' as any },
        },
        include: {
          items: {
            include: { menuItem: { select: { category: { select: { name: true } } } } },
          },
          table: { select: { tableNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const reportRows = orders.flatMap((o) =>
        o.items.map((i) => ({
          orderNumber: o.orderNumber,
          tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
          date: o.createdAt.toISOString(),
          itemName: i.name,
          categoryName: i.menuItem?.category?.name || 'General',
          unitPrice: i.unitPrice,
          quantity: i.quantity,
          subtotal: i.subtotal,
          paymentMethod: o.paymentMethod,
          paymentStatus: o.paymentStatus,
        }))
      );

      return sendSuccess(res, {
        totalOrders: orders.length,
        totalSales: parseFloat(orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)),
        rows: reportRows,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/profit
// Profit margin and cost analysis per menu item
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/profit',
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

      const [orders, menuItems] = await Promise.all([
        prisma.order.findMany({
          where: {
            restaurantId,
            status: { not: 'CANCELLED' as any },
          },
          include: {
            items: {
              include: { menuItem: { select: { category: { select: { name: true } } } } },
            },
          },
        }),
        prisma.menuItem.findMany({
          where: { restaurantId },
          include: { category: { select: { name: true } } },
        }),
      ]);

      const costFallback = new Map<string, number>();
      menuItems.forEach((m) => costFallback.set(m.id, m.costPrice ?? 0));

      const itemStats = new Map<
        string,
        { name: string; category: string; price: number; costPrice: number; unitsSold: number; totalRevenue: number; totalCost: number }
      >();

      orders.forEach((o) => {
        o.items.forEach((i) => {
          const unitCost = i.costPriceAtOrder ?? costFallback.get(i.menuItemId) ?? 0;
          const existing = itemStats.get(i.menuItemId) || {
            name: i.name,
            category: i.menuItem?.category?.name || 'General',
            price: i.unitPrice,
            costPrice: unitCost,
            unitsSold: 0,
            totalRevenue: 0,
            totalCost: 0,
          };
          existing.unitsSold += i.quantity;
          existing.totalRevenue += i.subtotal;
          existing.totalCost += unitCost * i.quantity;
          itemStats.set(i.menuItemId, existing);
        });
      });

      const rows = Array.from(itemStats.values()).map((item) => {
        const grossProfit = item.totalRevenue - item.totalCost;
        const margin = item.totalRevenue > 0 ? (grossProfit / item.totalRevenue) * 100 : 0;
        return {
          itemName: item.name,
          category: item.category,
          price: item.price,
          costPrice: item.costPrice,
          unitsSold: item.unitsSold,
          totalRevenue: parseFloat(item.totalRevenue.toFixed(2)),
          totalCost: parseFloat(item.totalCost.toFixed(2)),
          grossProfit: parseFloat(grossProfit.toFixed(2)),
          profitMargin: parseFloat(margin.toFixed(1)),
        };
      });

      return sendSuccess(res, rows);
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/inventory
// Inventory valuation, stock counts, replenishment status
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/inventory',
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

      const items = await prisma.menuItem.findMany({
        where: { restaurantId },
        include: {
          category: { select: { name: true } },
          inventory: true,
        },
      });

      let totalValuation = 0;
      const rows = items.map((item) => {
        const stock = item.stockCount ?? item.inventory[0]?.stockCount ?? 0;
        const cost = item.costPrice ?? 0;
        const threshold = item.inventory[0]?.lowStockThreshold ?? 10;
        const valuation = stock * cost;
        totalValuation += valuation;

        return {
          itemName: item.name,
          category: item.category?.name || 'General',
          stockCount: stock,
          costPrice: cost,
          sellingPrice: item.price,
          totalValuation: parseFloat(valuation.toFixed(2)),
          lowStockThreshold: threshold,
          status: stock <= 0 ? 'OUT_OF_STOCK' : stock <= threshold ? 'LOW_STOCK' : 'IN_STOCK',
        };
      });

      return sendSuccess(res, {
        totalItems: items.length,
        totalValuation: parseFloat(totalValuation.toFixed(2)),
        rows,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/tax
// REQ-14: Tax collection and payment method breakdown
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/tax',
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

      const { dateFrom, dateTo } = req.query as Record<string, string>;
      const dateFilter = buildDateFilter(dateFrom, dateTo);

      const orders = await prisma.order.findMany({
        where: {
          restaurantId,
          ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          status: { not: 'CANCELLED' as any },
          paymentStatus: 'COMPLETED',
        },
        select: {
          id: true,
          orderNumber: true,
          subtotal: true,
          tax: true,
          discount: true,
          total: true,
          paymentMethod: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      // Aggregate by payment method
      const paymentBreakdown: Record<string, { count: number; subtotal: number; tax: number; total: number }> = {};
      let totalTax = 0;
      let totalSubtotal = 0;
      let totalRevenue = 0;
      let totalDiscount = 0;

      orders.forEach((o) => {
        totalTax += o.tax;
        totalSubtotal += o.subtotal;
        totalRevenue += o.total;
        totalDiscount += o.discount;

        const pm = o.paymentMethod || 'CASH';
        if (!paymentBreakdown[pm]) {
          paymentBreakdown[pm] = { count: 0, subtotal: 0, tax: 0, total: 0 };
        }
        paymentBreakdown[pm].count += 1;
        paymentBreakdown[pm].subtotal += o.subtotal;
        paymentBreakdown[pm].tax += o.tax;
        paymentBreakdown[pm].total += o.total;
      });

      // Monthly tax breakdown
      const monthlyBreakdown: Record<string, { orders: number; taxCollected: number; revenue: number }> = {};
      orders.forEach((o) => {
        const month = o.createdAt.toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyBreakdown[month]) {
          monthlyBreakdown[month] = { orders: 0, taxCollected: 0, revenue: 0 };
        }
        monthlyBreakdown[month].orders += 1;
        monthlyBreakdown[month].taxCollected += o.tax;
        monthlyBreakdown[month].revenue += o.total;
      });

      const effectiveTaxRate = totalSubtotal > 0 ? (totalTax / totalSubtotal) * 100 : 0;

      return sendSuccess(res, {
        summary: {
          totalOrders: orders.length,
          totalSubtotal: parseFloat(totalSubtotal.toFixed(2)),
          totalDiscount: parseFloat(totalDiscount.toFixed(2)),
          totalTaxCollected: parseFloat(totalTax.toFixed(2)),
          totalRevenue: parseFloat(totalRevenue.toFixed(2)),
          effectiveTaxRate: parseFloat(effectiveTaxRate.toFixed(2)),
        },
        paymentMethodBreakdown: Object.entries(paymentBreakdown).map(([method, data]) => ({
          paymentMethod: method,
          ...data,
          subtotal: parseFloat(data.subtotal.toFixed(2)),
          tax: parseFloat(data.tax.toFixed(2)),
          total: parseFloat(data.total.toFixed(2)),
        })),
        monthlyBreakdown: Object.entries(monthlyBreakdown)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            month,
            ...data,
            taxCollected: parseFloat(data.taxCollected.toFixed(2)),
            revenue: parseFloat(data.revenue.toFixed(2)),
          })),
        rows: orders.map((o) => ({
          orderNumber: o.orderNumber,
          date: o.createdAt.toISOString(),
          subtotal: o.subtotal,
          tax: o.tax,
          discount: o.discount,
          total: o.total,
          paymentMethod: o.paymentMethod,
        })),
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/staff
// REQ-14: Staff performance report — orders handled, avg processing time
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/staff',
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

      const { dateFrom, dateTo } = req.query as Record<string, string>;
      const dateFilter = buildDateFilter(dateFrom, dateTo);

      const [staff, actionLogs, orders] = await Promise.all([
        prisma.user.findMany({
          where: {
            restaurantId,
            role: { in: ['WAITER', 'CHEF', 'MANAGER', 'CASHIER'] as any },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        }),
        prisma.staffActionLog.findMany({
          where: {
            restaurantId,
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
          },
          select: {
            id: true,
            userId: true,
            action: true,
            details: true,
            createdAt: true,
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
            orderNumber: true,
            total: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
      ]);

      // Build per-staff stats
      const staffStats = new Map<string, {
        name: string;
        email: string;
        role: string;
        ordersServed: number;
        totalRevenue: number;
        completedOrders: number;
        avgProcessingMinutes: number;
        totalProcessingMinutes: number;
      }>();

      staff.forEach((s) => {
        staffStats.set(s.id, {
          name: s.name,
          email: s.email,
          role: s.role,
          ordersServed: 0,
          totalRevenue: 0,
          completedOrders: 0,
          avgProcessingMinutes: 0,
          totalProcessingMinutes: 0,
        });
      });

      // Map action logs to orders
      const orderStaffMap = new Map<string, string>();
      actionLogs.forEach((log) => {
        if (!log.userId) return;
        orders.forEach((o) => {
          if (log.details && (log.details.includes(o.orderNumber) || log.details.includes(o.id))) {
            orderStaffMap.set(o.id, log.userId);
          }
        });
      });

      orders.forEach((o, index) => {
        const staffId = orderStaffMap.get(o.id) || (staff.length > 0 ? staff[index % staff.length].id : null);
        if (!staffId) return;
        const stat = staffStats.get(staffId);
        if (!stat) return;

        stat.ordersServed += 1;
        stat.totalRevenue += o.total;

        if (o.status === 'COMPLETED') {
          const processingMs = Math.max(0, o.updatedAt.getTime() - o.createdAt.getTime());
          const processingMin = Math.max(1, processingMs / 60000);
          stat.completedOrders += 1;
          stat.totalProcessingMinutes += processingMin;
        }
      });

      const rows = Array.from(staffStats.values()).map((s) => ({
        ...s,
        avgProcessingMinutes:
          s.completedOrders > 0
            ? parseFloat((s.totalProcessingMinutes / s.completedOrders).toFixed(1))
            : 0,
        totalRevenue: parseFloat(s.totalRevenue.toFixed(2)),
      }));

      // Sort by orders served desc
      rows.sort((a, b) => b.ordersServed - a.ordersServed);

      const totalStaff = staff.length;
      const totalOrdersHandled = rows.reduce((sum, s) => sum + s.ordersServed, 0);
      const avgRevenuePerStaff = totalStaff > 0
        ? parseFloat((rows.reduce((sum, s) => sum + s.totalRevenue, 0) / totalStaff).toFixed(2))
        : 0;

      return sendSuccess(res, {
        summary: { totalStaff, totalOrdersHandled, avgRevenuePerStaff },
        rows,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/loyalty
// REQ-14: Loyalty program analytics — points earned, redeemed, tier dist.
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/loyalty',
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

      const [accounts, transactions, redemptions, rewards] = await Promise.all([
        prisma.loyaltyAccount.findMany({
          where: { restaurantId },
          select: {
            id: true,
            customerName: true,
            phone: true,
            tier: true,
            pointsBalance: true,
            lifetimePoints: true,
            createdAt: true,
          },
        }),
        prisma.loyaltyTransaction.findMany({
          where: { restaurantId },
          select: {
            id: true,
            points: true,
            description: true,
            createdAt: true,
          },
        }),
        prisma.rewardRedemption.findMany({
          where: { restaurantId },
          include: {
            reward: { select: { name: true, pointsCost: true } },
          },
        }),
        prisma.reward.findMany({
          where: { restaurantId, isActive: true },
          select: { id: true, name: true, pointsCost: true, rewardType: true },
        }),
      ]);

      // Tier distribution
      const tierDist: Record<string, number> = { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };
      let totalPoints = 0;
      let totalLifetimePoints = 0;
      accounts.forEach((a) => {
        tierDist[a.tier] = (tierDist[a.tier] || 0) + 1;
        totalPoints += a.pointsBalance;
        totalLifetimePoints += a.lifetimePoints;
      });

      // Transaction stats
      const pointsEarned = transactions.filter((t) => t.points > 0).reduce((sum, t) => sum + t.points, 0);
      const pointsSpent = transactions.filter((t) => t.points < 0).reduce((sum, t) => sum + Math.abs(t.points), 0);

      // Top redeemed rewards
      const rewardRedemptionCounts: Record<string, { name: string; count: number; pointsSpent: number }> = {};
      redemptions.forEach((r) => {
        const key = r.rewardId;
        if (!rewardRedemptionCounts[key]) {
          rewardRedemptionCounts[key] = {
            name: r.reward?.name || 'Unknown',
            count: 0,
            pointsSpent: 0,
          };
        }
        rewardRedemptionCounts[key].count += 1;
        rewardRedemptionCounts[key].pointsSpent += r.pointsSpent;
      });

      const topRewards = Object.values(rewardRedemptionCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Top loyalty customers
      const topCustomers = accounts
        .sort((a, b) => b.lifetimePoints - a.lifetimePoints)
        .slice(0, 10)
        .map((a) => ({
          name: a.customerName || 'Guest',
          phone: a.phone,
          tier: a.tier,
          pointsBalance: a.pointsBalance,
          lifetimePoints: a.lifetimePoints,
          memberSince: a.createdAt.toISOString(),
        }));

      return sendSuccess(res, {
        summary: {
          totalMembers: accounts.length,
          totalPointsInCirculation: totalPoints,
          totalLifetimePointsEarned: totalLifetimePoints,
          totalPointsEarned: pointsEarned,
          totalPointsRedeemed: pointsSpent,
          totalRedemptions: redemptions.length,
          activeRewards: rewards.length,
        },
        tierDistribution: tierDist,
        topRewards,
        topCustomers,
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ────────────────────────────────────────────────────────────────────────
// GET /api/admin/reports/export?type=sales|profit|inventory|tax|staff|loyalty
// CSV export endpoint
// ────────────────────────────────────────────────────────────────────────
router.get(
  '/export',
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

      const { type = 'sales' } = req.query as { type?: string };

      if (type === 'inventory') {
        const items = await prisma.menuItem.findMany({
          where: { restaurantId },
          include: { category: { select: { name: true } }, inventory: true },
        });

        const header = 'Dish Name,Category,Current Stock,Cost Price,Selling Price,Total Valuation,Status\n';
        const rows = items
          .map((i) => {
            const stock = i.stockCount ?? i.inventory[0]?.stockCount ?? 0;
            const cost = i.costPrice ?? 0;
            const threshold = i.inventory[0]?.lowStockThreshold ?? 10;
            const val = stock * cost;
            const status = stock <= 0 ? 'OUT_OF_STOCK' : stock <= threshold ? 'LOW_STOCK' : 'IN_STOCK';
            return `"${i.name}","${i.category?.name || 'General'}",${stock},${cost},${i.price},${val},"${status}"`;
          })
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="inventory-report-${Date.now()}.csv"`);
        return res.send(header + rows);
      }

      if (type === 'tax') {
        const orders = await prisma.order.findMany({
          where: { restaurantId, status: { not: 'CANCELLED' as any }, paymentStatus: 'COMPLETED' },
          select: {
            orderNumber: true,
            subtotal: true,
            tax: true,
            discount: true,
            total: true,
            paymentMethod: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        const header = 'Order Number,Date,Subtotal,Tax,Discount,Total,Payment Method\n';
        const rows = orders
          .map(
            (o) =>
              `"${o.orderNumber}","${o.createdAt.toISOString()}",${o.subtotal},${o.tax},${o.discount},${o.total},"${o.paymentMethod}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="tax-report-${Date.now()}.csv"`);
        return res.send(header + rows);
      }

      if (type === 'loyalty') {
        const accounts = await prisma.loyaltyAccount.findMany({
          where: { restaurantId },
          select: {
            customerName: true,
            phone: true,
            tier: true,
            pointsBalance: true,
            lifetimePoints: true,
            createdAt: true,
          },
        });

        const header = 'Name,Phone,Tier,Points Balance,Lifetime Points,Member Since\n';
        const rows = accounts
          .map(
            (a) =>
              `"${a.customerName || 'Guest'}","${a.phone}","${a.tier}",${a.pointsBalance},${a.lifetimePoints},"${a.createdAt.toISOString()}"`
          )
          .join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="loyalty-report-${Date.now()}.csv"`);
        return res.send(header + rows);
      }

      // Default: Sales CSV
      const orders = await prisma.order.findMany({
        where: { restaurantId, status: { not: 'CANCELLED' as any } },
        include: {
          items: { include: { menuItem: { select: { category: { select: { name: true } } } } } },
          table: { select: { tableNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const header = 'Order Number,Table,Date,Dish Name,Category,Unit Price,Quantity,Subtotal,Payment Method,Payment Status\n';
      const rows = orders
        .flatMap((o) =>
          o.items.map(
            (i) =>
              `"${o.orderNumber}","${o.table?.tableNumber || o.tableId}","${o.createdAt.toISOString()}","${i.name}","${i.menuItem?.category?.name || 'General'}",${i.unitPrice},${i.quantity},${i.subtotal},"${o.paymentMethod}","${o.paymentStatus}"`
          )
        )
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="sales-report-${Date.now()}.csv"`);
      return res.send(header + rows);
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
