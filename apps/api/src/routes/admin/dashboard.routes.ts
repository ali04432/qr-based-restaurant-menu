import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

/**
 * GET /api/admin/dashboard/overview?restaurantId=<id>
 * Computes live, real database metrics for the restaurant admin overview.
 */
router.get(
  '/overview',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.query.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID context is missing', 400, 'VALIDATION_ERROR'));
      }

      // Today boundaries in UTC / server local
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      // 7 days ago boundary
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      // Run parallel DB queries
      const [
        todayOrders,
        allOrdersCount,
        pendingOrdersCount,
        completedOrdersCount,
        cancelledOrdersCount,
        tables,
        menuItems,
        inventoryItems,
        recentOrders,
        recentLogs,
        last7DaysOrders,
      ] = await Promise.all([
        // Orders placed today
        prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: startOfToday, lte: endOfToday },
          },
          include: { items: true },
        }),

        // Total orders all time
        prisma.order.count({ where: { restaurantId } }),

        // Pending / Received / In-Kitchen orders
        prisma.order.count({
          where: {
            restaurantId,
            status: { in: ['PENDING', 'RECEIVED', 'PREPARING', 'IN_KITCHEN', 'COOKING'] as any },
          },
        }),

        // Completed / Served orders today
        prisma.order.count({
          where: {
            restaurantId,
            status: { in: ['COMPLETED', 'SERVED'] as any },
          },
        }),

        // Cancelled orders today
        prisma.order.count({
          where: {
            restaurantId,
            status: 'CANCELLED' as any,
          },
        }),

        // Active tables
        prisma.table.findMany({
          where: { restaurantId, isActive: true },
          select: { id: true, tableNumber: true, status: true },
        }),

        // Menu items for low-stock and top-selling calculations
        prisma.menuItem.findMany({
          where: { restaurantId },
          include: {
            category: { select: { name: true } },
            inventory: true,
          },
        }),

        // Inventory table records
        prisma.inventory.findMany({
          where: { restaurantId },
        }),

        // Last 10 recent orders
        prisma.order.findMany({
          where: { restaurantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: true,
            table: { select: { tableNumber: true } },
          },
        }),

        // Recent staff activity logs
        prisma.staffActionLog.findMany({
          where: { restaurantId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { name: true, role: true } },
          },
        }),

        // Orders from last 7 days for trend line
        prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: sevenDaysAgo },
            status: { not: 'CANCELLED' as any },
          },
          select: {
            total: true,
            createdAt: true,
          },
        }),
      ]);

      // Calculate Today Financials
      const validTodayOrders = todayOrders.filter((o) => (o.status as string) !== 'CANCELLED');
      const todayRevenue = validTodayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      const averageOrderValue =
        validTodayOrders.length > 0 ? parseFloat((todayRevenue / validTodayOrders.length).toFixed(2)) : 0;

      // Calculate gross profit today using costPriceAtOrder or menuItem.costPrice
      const costMap = new Map<string, number>();
      menuItems.forEach((m) => {
        if (m.costPrice) costMap.set(m.id, m.costPrice);
      });

      let grossProfitToday = 0;
      validTodayOrders.forEach((o) => {
        let orderCost = 0;
        o.items.forEach((item) => {
          const unitCost = item.costPriceAtOrder ?? costMap.get(item.menuItemId) ?? 0;
          orderCost += unitCost * item.quantity;
        });
        grossProfitToday += (o.subtotal || o.total) - orderCost;
      });

      const profitMarginToday =
        todayRevenue > 0 ? parseFloat(((grossProfitToday / todayRevenue) * 100).toFixed(1)) : 0;

      // Calculate Active Tables Count (status !== AVAILABLE or has active orders)
      const occupiedTablesCount = tables.filter((t) => t.status !== 'AVAILABLE').length;

      // Low Stock Items Detection
      const lowStockAlerts = menuItems
        .filter((item) => {
          const stock = item.stockCount ?? item.inventory[0]?.stockCount ?? null;
          const threshold = item.inventory[0]?.lowStockThreshold ?? 10;
          return stock !== null && stock <= threshold;
        })
        .map((item) => ({
          id: item.id,
          name: item.name,
          categoryName: item.category?.name || 'General',
          stockCount: item.stockCount ?? item.inventory[0]?.stockCount ?? 0,
          lowStockThreshold: item.inventory[0]?.lowStockThreshold ?? 10,
          price: item.price,
          costPrice: item.costPrice ?? 0,
          isAvailable: item.isAvailable,
        }));

      // Top Selling Dishes Aggregation from OrderItem table
      const itemSalesMap = new Map<
        string,
        { name: string; quantity: number; revenue: number; cost: number; categoryName?: string; image?: string; price: number }
      >();

      todayOrders.forEach((order) => {
        if ((order.status as string) === 'CANCELLED') return;
        order.items.forEach((item) => {
          const existing = itemSalesMap.get(item.menuItemId) || {
            name: item.name,
            quantity: 0,
            revenue: 0,
            cost: (item.costPriceAtOrder ?? costMap.get(item.menuItemId) ?? 0) * item.quantity,
            price: item.unitPrice,
          };
          existing.quantity += item.quantity;
          existing.revenue += item.subtotal;
          itemSalesMap.set(item.menuItemId, existing);
        });
      });

      const topSellingItems = Array.from(itemSalesMap.entries())
        .map(([id, stats]) => {
          const menuItem = menuItems.find((m) => m.id === id);
          return {
            id,
            name: stats.name,
            categoryName: menuItem?.category?.name || 'General',
            price: stats.price,
            costPrice: menuItem?.costPrice ?? 0,
            totalQuantity: stats.quantity,
            totalRevenue: parseFloat(stats.revenue.toFixed(2)),
            totalProfit: parseFloat((stats.revenue - stats.cost).toFixed(2)),
            image: menuItem?.image || undefined,
          };
        })
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5);

      // 7-day Revenue Trend buckets
      const trendMap = new Map<string, { revenue: number; orders: number }>();
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        trendMap.set(key, { revenue: 0, orders: 0 });
      }

      last7DaysOrders.forEach((o) => {
        const key = o.createdAt.toISOString().split('T')[0];
        if (trendMap.has(key)) {
          const curr = trendMap.get(key)!;
          curr.revenue += o.total;
          curr.orders += 1;
        }
      });

      const revenueTrend = Array.from(trendMap.entries()).map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        revenue: parseFloat(data.revenue.toFixed(2)),
        orders: data.orders,
      }));

      // Format Recent Orders
      const formattedRecentOrders = recentOrders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        tableNumber: o.table?.tableNumber || o.tableId.replace(/^t-/, '') || '01',
        status: o.status,
        total: o.total,
        paymentStatus: o.paymentStatus as 'PENDING' | 'PAID' | 'FAILED',
        paymentMethod: o.paymentMethod,
        itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
        createdAt: o.createdAt.toISOString(),
      }));

      // Format Recent Staff Activity
      const formattedStaffActivity = recentLogs.map((log) => ({
        id: log.id,
        staffName: log.user?.name || 'Staff Member',
        staffRole: (log.user?.role as UserRole) || UserRole.WAITER,
        action: log.action,
        details: log.details || undefined,
        createdAt: log.createdAt.toISOString(),
      }));

      return sendSuccess(res, {
        metrics: {
          todayRevenue: parseFloat(todayRevenue.toFixed(2)),
          todayOrders: validTodayOrders.length,
          pendingOrders: pendingOrdersCount,
          completedOrders: completedOrdersCount,
          cancelledOrders: cancelledOrdersCount,
          averageOrderValue,
          activeTables: occupiedTablesCount > 0 ? occupiedTablesCount : tables.length > 0 ? 1 : 0,
          lowStockItemsCount: lowStockAlerts.length,
          grossProfitToday: parseFloat(grossProfitToday.toFixed(2)),
          profitMarginToday,
        },
        revenueTrend,
        topSellingItems,
        recentOrders: formattedRecentOrders,
        lowStockAlerts,
        recentStaffActivity: formattedStaffActivity,
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
