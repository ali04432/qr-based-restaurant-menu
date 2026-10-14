import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

/**
 * Build the customer-facing menu URL for a given table.
 * Uses the FRONTEND_URL env var so QR codes point to a reachable address
 * (LAN IP for local testing, HTTPS domain for production).
 */
function buildTableMenuUrl(restaurantId: string, tableId: string): string {
  const baseUrl = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${baseUrl}/menu?restaurant=${restaurantId}&table=${tableId}`;
}

/**
 * GET /api/tables
 * List tables for a restaurant. Can be queried publicly with `restaurantId` or via authenticated request.
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const queryRestaurantId = req.query.restaurantId as string | undefined;

  let restaurantId: string | undefined = queryRestaurantId;

  // If token is provided, fallback to token's restaurantId if query is omitted
  if (!restaurantId && req.headers.authorization) {
    try {
      // Use authenticateToken check logic if header present
      const token = req.headers.authorization.split(" ")[1];
      const jwt = require("jsonwebtoken");
      const JWT_SECRET = process.env.JWT_SECRET || "biteflow-super-secret-key-2026";
      const decoded = jwt.verify(token, JWT_SECRET) as { restaurantId: string };
      restaurantId = decoded.restaurantId;
    } catch (e) {
      // Ignore token error for public GET
    }
  }

  if (!restaurantId) {
    res.status(400).json({ error: "Missing restaurantId parameter" });
    return;
  }

  try {
    const tables = await prisma.table.findMany({
      where: { restaurantId },
      orderBy: { tableNumber: "asc" },
    });

    // Ensure every table has a current qrCodeUrl (auto-fix stale localhost URLs)
    const frontendBase = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    const tablesWithFixedQR = tables.map((table) => {
      const expectedUrl = buildTableMenuUrl(restaurantId!, table.id);
      if (table.qrCodeUrl !== expectedUrl) {
        // Fire-and-forget update for stale URLs
        prisma.table.update({
          where: { id: table.id },
          data: { qrCodeUrl: expectedUrl },
        }).catch(() => {});
      }
      return { ...table, qrCodeUrl: expectedUrl };
    });

    res.json(tablesWithFixedQR);
  } catch (err) {
    console.error("GET /api/tables error:", err);
    res.status(500).json({ error: "Failed to fetch tables" });
  }
});

/**
 * GET /api/tables/:id
 * Public endpoint — validate a table exists and belongs to a restaurant.
 * Used by the customer frontend when a QR code is scanned.
 */
router.get("/:id", async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const restaurantId = req.query.restaurantId as string | undefined;

  try {
    const whereClause: any = { id };
    if (restaurantId) {
      whereClause.restaurantId = restaurantId;
    }

    const table = await prisma.table.findFirst({
      where: whereClause,
      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
            logo: true,
            themeColor: true,
          },
        },
      },
    });

    if (!table) {
      res.status(404).json({ error: "Table not found" });
      return;
    }

    res.json({
      id: table.id,
      restaurantId: table.restaurantId,
      tableNumber: table.tableNumber,
      qrCodeUrl: buildTableMenuUrl(table.restaurantId, table.id),
      restaurant: table.restaurant,
    });
  } catch (err) {
    console.error("GET /api/tables/:id error:", err);
    res.status(500).json({ error: "Failed to fetch table" });
  }
});

/**
 * POST /api/tables
 * Create a new table and generate its QR Code URL.
 * Restricted to RESTAURANT_ADMIN, SUPER_ADMIN, and WAITER.
 */
router.post(
  "/",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.WAITER),
  async (req: Request, res: Response): Promise<void> => {
    const { tableNumber } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!tableNumber || typeof tableNumber !== "string" || !tableNumber.trim()) {
      res.status(400).json({ error: "Missing or invalid tableNumber" });
      return;
    }

    const cleanTableNumber = tableNumber.trim();

    try {
      // Check if table number already exists in this restaurant
      const existingTable = await prisma.table.findUnique({
        where: {
          restaurantId_tableNumber: {
            restaurantId,
            tableNumber: cleanTableNumber,
          },
        },
      });

      if (existingTable) {
        res.status(400).json({ error: `Table ${cleanTableNumber} already exists in this restaurant` });
        return;
      }

      // Create table first to get its UUID
      const table = await prisma.table.create({
        data: {
          restaurantId,
          tableNumber: cleanTableNumber,
        },
      });

      // Update table with customer QR Code URL using the configurable frontend URL
      const qrCodeUrl = buildTableMenuUrl(restaurantId, table.id);
      const updatedTable = await prisma.table.update({
        where: { id: table.id },
        data: { qrCodeUrl },
      });

      res.status(201).json(updatedTable);
    } catch (err) {
      console.error("POST /api/tables error:", err);
      res.status(500).json({ error: "Failed to create table" });
    }
  }
);

/**
 * PATCH /api/tables/:id
 * Update a table (e.g. table number).
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.patch(
  "/:id",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;
    const { tableNumber } = req.body;

    try {
      const table = await prisma.table.findFirst({
        where: { id, restaurantId },
      });

      if (!table) {
        res.status(404).json({ error: "Table not found" });
        return;
      }

      const updateData: any = {};
      if (tableNumber && typeof tableNumber === "string") {
        updateData.tableNumber = tableNumber.trim();
      }

      const updated = await prisma.table.update({
        where: { id },
        data: updateData,
      });

      // Return with current QR code URL
      res.json({ ...updated, qrCodeUrl: buildTableMenuUrl(restaurantId, id) });
    } catch (err) {
      console.error("PATCH /api/tables/:id error:", err);
      res.status(500).json({ error: "Failed to update table" });
    }
  }
);

/**
 * DELETE /api/tables/:id
 * Delete a table.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.delete(
  "/:id",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    try {
      const table = await prisma.table.findFirst({
        where: { id, restaurantId },
      });

      if (!table) {
        res.status(404).json({ error: "Table not found" });
        return;
      }

      await prisma.table.delete({
        where: { id },
      });

      res.json({ message: `Table ${table.tableNumber} deleted successfully` });
    } catch (err) {
      console.error("DELETE /api/tables/:id error:", err);
      res.status(500).json({ error: "Failed to delete table" });
    }
  }
);

export default router;
