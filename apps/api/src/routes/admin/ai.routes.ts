import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

/**
 * POST /api/admin/ai/query
 * Dedicated Admin AI Business Assistant that queries real restaurant database data.
 */
router.post(
  '/query',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId =
        req.user?.role === UserRole.SUPER_ADMIN
          ? (req.body.restaurantId as string) || req.user?.restaurantId
          : req.user?.restaurantId;

      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { query } = req.body as { query: string };
      if (!query || typeof query !== 'string') {
        return next(new AppError('Query string is required', 400, 'VALIDATION_ERROR'));
      }

      const normalized = query.toLowerCase().trim();

      // Gather live factual data from DB
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - 6);
      startOfWeek.setHours(0, 0, 0, 0);

      const [
        restaurant,
        todayOrders,
        weekOrders,
        menuItems,
        allTables,
      ] = await Promise.all([
        prisma.restaurant.findUnique({ where: { id: restaurantId } }),
        prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: startOfToday },
            status: { not: 'CANCELLED' as any },
          },
          include: { items: true },
        }),
        prisma.order.findMany({
          where: {
            restaurantId,
            createdAt: { gte: startOfWeek },
            status: { not: 'CANCELLED' as any },
          },
          include: { items: true },
        }),
        prisma.menuItem.findMany({
          where: { restaurantId },
          include: { category: { select: { name: true } }, inventory: true },
        }),
        prisma.table.findMany({ where: { restaurantId } }),
      ]);

      const costFallback = new Map<string, number>();
      menuItems.forEach((m) => costFallback.set(m.id, m.costPrice ?? 0));

      // Calculations: Today
      const todaySales = todayOrders.reduce((sum, o) => sum + o.total, 0);
      let todayCost = 0;
      todayOrders.forEach((o) => {
        o.items.forEach((i) => {
          todayCost += (i.costPriceAtOrder ?? costFallback.get(i.menuItemId) ?? 0) * i.quantity;
        });
      });
      const todayProfit = todaySales - todayCost;
      const todayMargin = todaySales > 0 ? (todayProfit / todaySales) * 100 : 0;

      // Calculations: Week
      const weekSales = weekOrders.reduce((sum, o) => sum + o.total, 0);
      let weekCost = 0;
      weekOrders.forEach((o) => {
        o.items.forEach((i) => {
          weekCost += (i.costPriceAtOrder ?? costFallback.get(i.menuItemId) ?? 0) * i.quantity;
        });
      });
      const weekProfit = weekSales - weekCost;
      const weekMargin = weekSales > 0 ? (weekProfit / weekSales) * 100 : 0;

      // Item Sales aggregation
      const itemSales = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>();
      weekOrders.forEach((o) => {
        o.items.forEach((i) => {
          const unitCost = i.costPriceAtOrder ?? costFallback.get(i.menuItemId) ?? 0;
          const curr = itemSales.get(i.menuItemId) || { name: i.name, quantity: 0, revenue: 0, profit: 0 };
          curr.quantity += i.quantity;
          curr.revenue += i.subtotal;
          curr.profit += i.subtotal - unitCost * i.quantity;
          itemSales.set(i.menuItemId, curr);
        });
      });

      const sortedBySales = Array.from(itemSales.values()).sort((a, b) => b.quantity - a.quantity);
      const sortedByProfit = Array.from(itemSales.values()).sort((a, b) => b.profit - a.profit);

      // Low stock items
      const lowStockList = menuItems.filter((i) => {
        const stock = i.stockCount ?? i.inventory[0]?.stockCount ?? null;
        const threshold = i.inventory[0]?.lowStockThreshold ?? 10;
        return stock !== null && stock <= threshold;
      });

      // Category breakdown
      const catMap = new Map<string, number>();
      weekOrders.forEach((o) => {
        o.items.forEach((i) => {
          const item = menuItems.find((m) => m.id === i.menuItemId);
          const cat = item?.category?.name || 'General';
          catMap.set(cat, (catMap.get(cat) || 0) + i.subtotal);
        });
      });
      const topCategory = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1])[0];

      // Format intelligent, exact responses based on query
      let answer = '';

      if (normalized.includes('today') && (normalized.includes('sale') || normalized.includes('revenue') || normalized.includes('order'))) {
        answer = `Today's revenue is **Rs. ${todaySales.toLocaleString()}** across **${todayOrders.length} order(s)**. Estimated gross profit today is **Rs. ${todayProfit.toLocaleString()}** (${todayMargin.toFixed(1)}% margin).`;
      } else if (normalized.includes('best') || normalized.includes('top') || normalized.includes('most sold') || normalized.includes('popular')) {
        if (sortedBySales.length > 0) {
          const topList = sortedBySales.slice(0, 3).map((i, idx) => `${idx + 1}. **${i.name}** (${i.quantity} sold — Rs. ${i.revenue.toLocaleString()})`).join('\n');
          answer = `Top selling dishes this week:\n${topList}`;
        } else {
          answer = 'No sales recorded yet this week to determine top-selling dishes.';
        }
      } else if (normalized.includes('underperforming') || normalized.includes('least') || normalized.includes('low sale') || normalized.includes('slow')) {
        const unsoldItems = menuItems.filter((m) => !itemSales.has(m.id)).slice(0, 4);
        if (unsoldItems.length > 0) {
          const list = unsoldItems.map((i) => `• **${i.name}** (Rs. ${i.price})`).join('\n');
          answer = `Underperforming items with 0 sales this week:\n${list}\n\n*Recommendation: Consider featuring them in a promotional combo or updating their pricing.*`;
        } else {
          answer = 'All menu items have recorded sales this week.';
        }
      } else if (normalized.includes('profit') || normalized.includes('margin') || normalized.includes('gross')) {
        answer = `This week's gross sales are **Rs. ${weekSales.toLocaleString()}** with a total cost of **Rs. ${weekCost.toLocaleString()}**, resulting in a gross profit of **Rs. ${weekProfit.toLocaleString()}** (${weekMargin.toFixed(1)}% profit margin).`;
      } else if (normalized.includes('stock') || normalized.includes('inventory') || normalized.includes('low')) {
        if (lowStockList.length > 0) {
          const list = lowStockList.map((i) => `• **${i.name}**: ${i.stockCount ?? i.inventory[0]?.stockCount ?? 0} portions left (Threshold: ${i.inventory[0]?.lowStockThreshold ?? 10})`).join('\n');
          answer = `Items currently requiring replenishment:\n${list}`;
        } else {
          answer = 'All menu items currently have healthy stock levels above their designated thresholds.';
        }
      } else if (normalized.includes('category') || normalized.includes('categories')) {
        if (topCategory) {
          answer = `The highest-grossing category this week is **${topCategory[0]}**, generating **Rs. ${topCategory[1].toLocaleString()}** in revenue.`;
        } else {
          answer = 'Insufficient order data to determine top category revenue.';
        }
      } else if (normalized.includes('busy') || normalized.includes('peak') || normalized.includes('period') || normalized.includes('hours')) {
        // Compute hour distribution
        const hourMap = new Array(24).fill(0);
        weekOrders.forEach((o) => {
          const hr = new Date(o.createdAt).getHours();
          hourMap[hr] += 1;
        });
        let peakHr = 20; // default 8pm
        let peakCount = 0;
        hourMap.forEach((cnt, hr) => {
          if (cnt > peakCount) {
            peakCount = cnt;
            peakHr = hr;
          }
        });
        const periodStr = `${peakHr % 12 || 12}:00 ${peakHr >= 12 ? 'PM' : 'AM'} – ${(peakHr + 1) % 12 || 12}:00 ${peakHr + 1 >= 12 ? 'PM' : 'AM'}`;
        answer = `Your busiest operational period is around **${periodStr}** with **${peakCount} order(s)** placed during this time slot this week.`;
      } else {
        answer = `Here is your current restaurant summary for **${restaurant?.name || 'Silver Sapoon'}**:\n\n• **Today's Revenue:** Rs. ${todaySales.toLocaleString()} (${todayOrders.length} orders)\n• **Weekly Gross Sales:** Rs. ${weekSales.toLocaleString()}\n• **Weekly Gross Profit:** Rs. ${weekProfit.toLocaleString()} (${weekMargin.toFixed(1)}% margin)\n• **Active Tables:** ${allTables.filter((t) => t.status !== 'AVAILABLE').length}/${allTables.length}\n• **Low Stock Items:** ${lowStockList.length} item(s)\n\nAsk me specific questions regarding sales trends, dish profitability, inventory alerts, or underperforming dishes.`;
      }

      return sendSuccess(res, {
        reply: answer,
        timestamp: new Date().toISOString(),
        metricsSummary: {
          todayRevenue: todaySales,
          todayOrders: todayOrders.length,
          weekRevenue: weekSales,
          weekProfit,
          lowStockCount: lowStockList.length,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
