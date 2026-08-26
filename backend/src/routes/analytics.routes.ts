import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// All analytics routes require authentication as RESTAURANT_ADMIN or SUPER_ADMIN
router.use(authenticateToken, requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN));

// --- Helpers ---

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

// --- Revenue & Orders ---

/**
 * GET /api/analytics/revenue
 * Returns: today, thisWeek, thisMonth totals + 7-day daily chart + 12-month monthly chart
 */
router.get("/revenue", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const now = new Date();

  try {
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now);
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    const [todayOrders, weekOrders, monthOrders, yearOrders] = await Promise.all([
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: todayStart }, status: { notIn: ["CANCELLED"] } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: weekStart }, status: { notIn: ["CANCELLED"] } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: monthStart }, status: { notIn: ["CANCELLED"] } },
        select: { total: true, createdAt: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: yearStart }, status: { notIn: ["CANCELLED"] } },
        select: { total: true, createdAt: true },
      }),
    ]);

    const sum = (orders: { total: number }[]) => orders.reduce((acc, o) => acc + o.total, 0);

    // 7-day daily chart: last 7 days
    const dailyChart: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(addDays(now, -i));
      const dayEnd = addDays(dayStart, 1);
      const dayRevenue = weekOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return d >= dayStart && d < dayEnd;
        })
        .reduce((acc, o) => acc + o.total, 0);
      dailyChart.push({
        date: dayStart.toLocaleDateString("en-PK", { month: "short", day: "numeric" }),
        revenue: Math.round(dayRevenue),
      });
    }

    // 12-month monthly chart
    const monthlyChart: { month: string; revenue: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const mRevenue = yearOrders
        .filter((o) => {
          const d = new Date(o.createdAt);
          return d >= mStart && d < mEnd;
        })
        .reduce((acc, o) => acc + o.total, 0);
      monthlyChart.push({
        month: mStart.toLocaleDateString("en-PK", { month: "short", year: "2-digit" }),
        revenue: Math.round(mRevenue),
      });
    }

    res.json({
      today: Math.round(sum(todayOrders)),
      thisWeek: Math.round(sum(weekOrders)),
      thisMonth: Math.round(sum(monthOrders)),
      dailyChart,
      monthlyChart,
    });
  } catch (err) {
    console.error("GET /api/analytics/revenue error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/orders
 * Returns: count today, thisWeek, thisMonth
 */
router.get("/orders", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const now = new Date();

  try {
    const [today, thisWeek, thisMonth] = await Promise.all([
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: startOfDay(now) }, status: { notIn: ["CANCELLED"] } },
      }),
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: startOfWeek(now) }, status: { notIn: ["CANCELLED"] } },
      }),
      prisma.order.count({
        where: { restaurantId, createdAt: { gte: startOfMonth(now) }, status: { notIn: ["CANCELLED"] } },
      }),
    ]);

    res.json({ today, thisWeek, thisMonth });
  } catch (err) {
    console.error("GET /api/analytics/orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/profit
 * Profit = sum(priceAtOrder * qty) - sum(costPriceAtOrder * qty) for non-cancelled orders
 */
router.get("/profit", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const now = new Date();

  try {
    async function getPeriodProfit(since: Date): Promise<number> {
      const items = await prisma.orderItem.findMany({
        where: {
          order: {
            restaurantId,
            createdAt: { gte: since },
            status: { notIn: ["CANCELLED"] },
          },
        },
        select: { priceAtOrder: true, costPriceAtOrder: true, quantity: true },
      });
      return items.reduce((acc, i) => acc + (i.priceAtOrder - i.costPriceAtOrder) * i.quantity, 0);
    }

    const [today, thisWeek, thisMonth] = await Promise.all([
      getPeriodProfit(startOfDay(now)),
      getPeriodProfit(startOfWeek(now)),
      getPeriodProfit(startOfMonth(now)),
    ]);

    res.json({
      today: Math.round(today),
      thisWeek: Math.round(thisWeek),
      thisMonth: Math.round(thisMonth),
    });
  } catch (err) {
    console.error("GET /api/analytics/profit error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/best-sellers
 * Top 5 items by total quantity sold (all time)
 */
router.get("/best-sellers", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  try {
    const items = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { restaurantId, status: { notIn: ["CANCELLED"] } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    });

    const withNames = await Promise.all(
      items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true, category: true, price: true },
        });
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.name ?? "Unknown",
          category: menuItem?.category ?? "",
          price: menuItem?.price ?? 0,
          totalSold: item._sum.quantity ?? 0,
        };
      })
    );

    res.json(withNames);
  } catch (err) {
    console.error("GET /api/analytics/best-sellers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/least-sellers
 * Bottom 5 items by total quantity sold (all time), only items with at least 1 sale
 */
router.get("/least-sellers", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  try {
    const items = await prisma.orderItem.groupBy({
      by: ["menuItemId"],
      where: { order: { restaurantId, status: { notIn: ["CANCELLED"] } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "asc" } },
      take: 5,
    });

    const withNames = await Promise.all(
      items.map(async (item) => {
        const menuItem = await prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true, category: true, price: true },
        });
        return {
          menuItemId: item.menuItemId,
          name: menuItem?.name ?? "Unknown",
          category: menuItem?.category ?? "",
          price: menuItem?.price ?? 0,
          totalSold: item._sum.quantity ?? 0,
        };
      })
    );

    res.json(withNames);
  } catch (err) {
    console.error("GET /api/analytics/least-sellers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/stock
 * All menu items with stockCount, flagging low stock (stockCount < 10 and not null)
 */
router.get("/stock", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;

  try {
    const items = await prisma.menuItem.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        stockCount: true,
        isAvailable: true,
        costPrice: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    const LOW_STOCK_THRESHOLD = 10;
    const withAlerts = items.map((item) => ({
      ...item,
      isLowStock: item.stockCount !== null && item.stockCount < LOW_STOCK_THRESHOLD,
      isUnlimited: item.stockCount === null,
    }));

    res.json(withAlerts);
  } catch (err) {
    console.error("GET /api/analytics/stock error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/order-history
 * Filterable order history with pagination
 * Query: startDate, endDate, status, tableId, page (default 1), limit (default 20)
 */
router.get("/order-history", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const { startDate, endDate, status, tableId, page = "1", limit = "20" } = req.query;

  try {
    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, parseInt(limit as string, 10));
    const skip = (pageNum - 1) * limitNum;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { restaurantId };

    if (startDate && typeof startDate === "string") {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate && typeof endDate === "string") {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt = { ...where.createdAt, lte: end };
    }
    if (status && typeof status === "string") {
      where.status = { in: status.split(",") };
    }
    if (tableId && typeof tableId === "string") {
      where.tableId = tableId;
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: "desc" },
        include: {
          table: { select: { tableNumber: true } },
          orderItems: {
            include: {
              menuItem: { select: { name: true } },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("GET /api/analytics/order-history error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/analytics/staff
 * Returns staff list with salary, monthly payroll total, and audit logs
 */
router.get("/staff", async (req: Request, res: Response): Promise<void> => {
  const restaurantId = req.user!.restaurantId;
  const now = new Date();

  try {
    const staff = await prisma.user.findMany({
      where: { restaurantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        salary: true,
        createdAt: true,
        actionLogs: {
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            action: true,
            details: true,
            createdAt: true,
          },
        },
      },
      orderBy: { role: "asc" },
    });

    const monthStart = startOfMonth(now);
    const staffWithPayroll = staff.map((s) => ({
      ...s,
      monthlyPayroll: s.salary, // Monthly salary is a fixed field per user
    }));

    const totalMonthlyPayroll = staffWithPayroll.reduce((acc, s) => acc + s.salary, 0);

    // Recent logs across all staff (last 100 entries)
    const recentLogs = await prisma.staffActionLog.findMany({
      where: { user: { restaurantId } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { name: true, role: true } },
      },
    });

    res.json({
      staff: staffWithPayroll,
      totalMonthlyPayroll: Math.round(totalMonthlyPayroll),
      recentLogs,
      reportMonth: monthStart.toLocaleDateString("en-PK", { month: "long", year: "numeric" }),
    });
  } catch (err) {
    console.error("GET /api/analytics/staff error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
