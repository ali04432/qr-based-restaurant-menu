import { Router, Request, Response } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma, io } from "../server";
import { validate } from "../middleware/validate";

const router = Router();

// --- Zod Schemas ---

const createOrderSchema = z.object({
  restaurantId: z.string().uuid(),
  tableId: z.string().uuid(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      })
    )
    .min(1, "Order must have at least one item"),
});

const updateStatusSchema = z.object({
  status: z.enum(["NEW", "PREPARING", "READY", "SERVED", "CANCELLED"]),
});

// --- Helpers ---

/** Fetch full order with items and menu item details */
async function getFullOrder(orderId: string) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      table: { select: { tableNumber: true } },
      orderItems: {
        include: {
          menuItem: { select: { name: true, imageUrl: true } },
        },
      },
    },
  });
}

// --- Routes ---

/**
 * POST /api/orders
 * Customer places a new order. Creates order + order items in a single transaction.
 * Emits 'new-order' to the restaurant's Socket.io room.
 */
router.post(
  "/",
  validate(createOrderSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { restaurantId, tableId, items } = req.body;

    try {
      // Verify restaurant exists
      const restaurant = await prisma.restaurant.findUnique({
        where: { id: restaurantId },
      });
      if (!restaurant) {
        res.status(404).json({ error: "Restaurant not found" });
        return;
      }

      // Verify table belongs to restaurant
      const table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId },
      });
      if (!table) {
        res.status(404).json({ error: "Table not found for this restaurant" });
        return;
      }

      // Fetch and validate all menu items exist, belong to restaurant, and are available
      const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
      const menuItems = await prisma.menuItem.findMany({
        where: {
          id: { in: menuItemIds },
          restaurantId,
          isAvailable: true,
        },
      });

      if (menuItems.length !== menuItemIds.length) {
        res.status(400).json({
          error: "One or more menu items are unavailable or not found",
        });
        return;
      }

      // Build a price lookup map
      // 'as [string, number]' preserves the tuple type so Map<string, number> is inferred correctly.
      const priceMap = new Map<string, number>(menuItems.map((m: { id: string; price: number }) => [m.id, m.price] as [string, number]));

      // Calculate total
      const total = items.reduce(
        (sum: number, item: { menuItemId: string; quantity: number }) => {
          return sum + (priceMap.get(item.menuItemId) ?? 0) * item.quantity;
        },
        0
      );

      // Create order + items in a transaction
      const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const newOrder = await tx.order.create({
          data: {
            restaurantId,
            tableId,
            total,
            status: "NEW",
            paymentStatus: "PENDING",
            orderItems: {
              create: items.map(
                (item: {
                  menuItemId: string;
                  quantity: number;
                  notes?: string;
                }) => ({
                  menuItemId: item.menuItemId,
                  quantity: item.quantity,
                  notes: item.notes ?? null,
                  priceAtOrder: priceMap.get(item.menuItemId) ?? 0,
                })
              ),
            },
          },
        });
        return newOrder;
      });

      // Fetch the full order to emit
      const fullOrder = await getFullOrder(order.id);

      // Emit new-order event to the restaurant's room
      io.to(restaurantId).emit("new-order", fullOrder);

      res.status(201).json(fullOrder);
    } catch (err) {
      console.error("POST /api/orders error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * GET /api/orders
 * Returns all active orders for a restaurant.
 * Query param: restaurantId
 * Used by KDS and waiter panel.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { restaurantId, status } = req.query;

  if (!restaurantId || typeof restaurantId !== "string") {
    res.status(400).json({ error: "Missing required query param: restaurantId" });
    return;
  }

  try {
    const whereClause: Record<string, unknown> = { restaurantId };

    // Optional status filter (can be comma-separated e.g. "NEW,PREPARING")
    if (status && typeof status === "string") {
      const statuses = status.split(",");
      whereClause.status = { in: statuses };
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      include: {
        table: { select: { tableNumber: true } },
        orderItems: {
          include: {
            menuItem: { select: { name: true, imageUrl: true } },
          },
        },
      },
    });

    res.json(orders);
  } catch (err) {
    console.error("GET /api/orders error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/orders/:id
 * Fetch a single order with all items.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  try {
    const order = await getFullOrder(id);

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.json(order);
  } catch (err) {
    console.error("GET /api/orders/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * PATCH /api/orders/:id/status
 * Update order status. Used by KDS (chef) and waiter panel.
 * Emits 'order-updated' to the restaurant's Socket.io room.
 */
router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { status } = req.body;

    try {
      const existing = await prisma.order.findUnique({
        where: { id },
        select: { id: true, restaurantId: true, status: true },
      });

      if (!existing) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status },
      });

      const fullOrder = await getFullOrder(updated.id);

      // Emit order-updated to the restaurant room
      io.to(existing.restaurantId).emit("order-updated", fullOrder);

      res.json(fullOrder);
    } catch (err) {
      console.error("PATCH /api/orders/:id/status error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
