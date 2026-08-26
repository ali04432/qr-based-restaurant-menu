import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

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

    res.json(tables);
  } catch (err) {
    console.error("GET /api/tables error:", err);
    res.status(500).json({ error: "Failed to fetch tables" });
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

      // Update table with customer QR Code URL
      const qrCodeUrl = `${FRONTEND_URL}/menu?restaurant=${restaurantId}&table=${table.id}`;
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
