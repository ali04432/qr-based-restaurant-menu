import { Router, Response, NextFunction } from 'express';
import { prisma } from '../../config/database';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';

const router = Router();

/**
 * GET /api/admin/customers
 * Returns customer profiles aggregated from Orders and Loyalty Accounts with order count, total spending, and last visit.
 */
router.get(
  '/',
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

      const { search, tier, page = '1', limit = '20' } = req.query as Record<string, string>;
      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

      // Fetch loyalty accounts for restaurant
      const loyaltyAccounts = await prisma.loyaltyAccount.findMany({
        where: {
          restaurantId,
          ...(tier && tier !== 'ALL' ? { tier: tier as any } : {}),
          ...(search ? { phone: { contains: search, mode: 'insensitive' } } : {}),
        },
        include: {
          orders: {
            where: { status: { not: 'CANCELLED' as any } },
            select: {
              id: true,
              orderNumber: true,
              total: true,
              createdAt: true,
              table: { select: { tableNumber: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      // Also find orders with customer phones that might not be in loyalty accounts
      const allOrders = await prisma.order.findMany({
        where: {
          restaurantId,
          status: { not: 'CANCELLED' as any },
        },
        select: {
          id: true,
          orderNumber: true,
          total: true,
          createdAt: true,
          loyaltyAccountId: true,
          table: { select: { tableNumber: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Build customer aggregation map
      const customerMap = new Map<string, {
        id: string;
        phone: string;
        name: string;
        tier: string;
        pointsBalance: number;
        orderCount: number;
        totalSpent: number;
        averageOrderValue: number;
        lastOrderDate: string | null;
        lastOrderNumber: string | null;
        lastTable: string | null;
      }>();

      // Populate loyalty account customers
      loyaltyAccounts.forEach((acc) => {
        const orderCount = acc.orders.length;
        const totalSpent = acc.orders.reduce((sum, o) => sum + o.total, 0);
        const lastOrder = acc.orders[0] || null;

        customerMap.set(acc.phone, {
          id: acc.id,
          phone: acc.phone,
          name: `Guest (${acc.phone.slice(-4)})`,
          tier: acc.tier,
          pointsBalance: acc.pointsBalance,
          orderCount,
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          averageOrderValue: orderCount > 0 ? parseFloat((totalSpent / orderCount).toFixed(2)) : 0,
          lastOrderDate: lastOrder ? lastOrder.createdAt.toISOString() : null,
          lastOrderNumber: lastOrder ? lastOrder.orderNumber : null,
          lastTable: lastOrder?.table?.tableNumber || null,
        });
      });

      // Filter and paginate
      let customerList = Array.from(customerMap.values());

      if (search) {
        const queryLower = search.toLowerCase();
        customerList = customerList.filter(
          (c) => c.phone.toLowerCase().includes(queryLower) || c.name.toLowerCase().includes(queryLower)
        );
      }

      // Sort by lastOrderDate or totalSpent descending
      customerList.sort((a, b) => {
        if (!a.lastOrderDate) return 1;
        if (!b.lastOrderDate) return -1;
        return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
      });

      const total = customerList.length;
      const totalPages = Math.ceil(total / limitNum);
      const paginated = customerList.slice((pageNum - 1) * limitNum, pageNum * limitNum);

      // Aggregate high-level stats
      const totalCustomerSpend = customerList.reduce((sum, c) => sum + c.totalSpent, 0);
      const totalOrdersPlaced = customerList.reduce((sum, c) => sum + c.orderCount, 0);
      const activeMembers = customerList.length;

      return sendSuccess(res, {
        customers: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
        summary: {
          totalCustomers: activeMembers,
          totalSpend: parseFloat(totalCustomerSpend.toFixed(2)),
          totalOrders: totalOrdersPlaced,
          averageSpendPerCustomer: activeMembers > 0 ? parseFloat((totalCustomerSpend / activeMembers).toFixed(2)) : 0,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
