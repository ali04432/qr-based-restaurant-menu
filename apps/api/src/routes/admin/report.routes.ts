import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

/**
 * GET /api/admin/reports/sales
 * Generates itemized sales report.
 */
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

      const dateFilter: any = {};
      if (dateFrom) dateFilter.gte = new Date(dateFrom);
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }

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

/**
 * GET /api/admin/reports/profit
 * Detailed profit margin and cost analysis per menu item.
 */
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

/**
 * GET /api/admin/reports/inventory
 * Inventory valuation, stock counts, and replenishment status.
 */
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

/**
 * GET /api/admin/reports/export?type=sales|profit|inventory
 * Generates CSV string for one-click downloading.
 */
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

      // Default: Sales Report
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
