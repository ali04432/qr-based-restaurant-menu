import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

/**
 * GET /api/menu
 * Public endpoint for customers — returns restaurant branding + grouped menu items.
 * Query params: restaurant (UUID), table (UUID)
 */
router.get("/", async (req: Request, res: Response): Promise<void> => {
  const { restaurant: restaurantId, table: tableId } = req.query;

  if (!restaurantId || typeof restaurantId !== "string") {
    res.status(400).json({ error: "Missing required query param: restaurant" });
    return;
  }

  try {
    // Fetch restaurant branding
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: {
        id: true,
        name: true,
        logo: true,
        themeColor: true,
      },
    });

    if (!restaurant) {
      res.status(404).json({ error: "Restaurant not found" });
      return;
    }

    // Optionally validate table belongs to this restaurant
    let table = null;
    if (tableId && typeof tableId === "string") {
      table = await prisma.table.findFirst({
        where: { id: tableId, restaurantId },
        select: { id: true, tableNumber: true },
      });
    }

    // Fetch all available menu items for this restaurant
    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId, isAvailable: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        imageUrl: true,
        modelUrl: true,
        category: true,
        isAvailable: true,
      },
    });

    // Group items by category
    const groupedMenu = menuItems.reduce(
      (acc: Record<string, typeof menuItems>, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
      },
      {}
    );

    res.json({
      restaurant,
      table,
      menu: groupedMenu,
    });
  } catch (err) {
    console.error("GET /api/menu error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/menu/admin
 * Admin endpoint — returns ALL menu items (including unavailable) flat or grouped for authenticated restaurant.
 */
router.get(
  "/admin",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.CHEF, Role.WAITER),
  async (req: Request, res: Response): Promise<void> => {
    const restaurantId = req.user!.restaurantId;

    try {
      const items = await prisma.menuItem.findMany({
        where: { restaurantId },
        orderBy: [{ category: "asc" }, { name: "asc" }],
      });

      res.json(items);
    } catch (err) {
      console.error("GET /api/menu/admin error:", err);
      res.status(500).json({ error: "Failed to fetch admin menu" });
    }
  }
);

/**
 * POST /api/menu
 * Create a new menu item.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.post(
  "/",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { name, description, price, category, imageUrl, modelUrl, isAvailable } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!name || price === undefined || !category) {
      res.status(400).json({ error: "Missing required fields: name, price, category" });
      return;
    }

    const numericPrice = Number(price);
    if (isNaN(numericPrice) || numericPrice < 0) {
      res.status(400).json({ error: "Price must be a valid positive number" });
      return;
    }

    try {
      const item = await prisma.menuItem.create({
        data: {
          restaurantId,
          name: name.trim(),
          description: description ? description.trim() : null,
          price: numericPrice,
          category: category.trim(),
          imageUrl: imageUrl ? imageUrl.trim() : null,
          modelUrl: modelUrl ? modelUrl.trim() : null,
          isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
        },
      });

      res.status(201).json(item);
    } catch (err) {
      console.error("POST /api/menu error:", err);
      res.status(500).json({ error: "Failed to create menu item" });
    }
  }
);

/**
 * PUT /api/menu/:id
 * Update an existing menu item.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.put(
  "/:id",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { name, description, price, category, imageUrl, modelUrl, isAvailable } = req.body;
    const restaurantId = req.user!.restaurantId;

    try {
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId },
      });

      if (!existing) {
        res.status(404).json({ error: "Menu item not found" });
        return;
      }

      const updated = await prisma.menuItem.update({
        where: { id },
        data: {
          ...(name ? { name: name.trim() } : {}),
          ...(description !== undefined ? { description: description ? description.trim() : null } : {}),
          ...(price !== undefined ? { price: Number(price) } : {}),
          ...(category ? { category: category.trim() } : {}),
          ...(imageUrl !== undefined ? { imageUrl: imageUrl ? imageUrl.trim() : null } : {}),
          ...(modelUrl !== undefined ? { modelUrl: modelUrl ? modelUrl.trim() : null } : {}),
          ...(isAvailable !== undefined ? { isAvailable: Boolean(isAvailable) } : {}),
        },
      });

      res.json(updated);
    } catch (err) {
      console.error("PUT /api/menu/:id error:", err);
      res.status(500).json({ error: "Failed to update menu item" });
    }
  }
);

/**
 * PATCH /api/menu/:id/toggle
 * Toggle availability of a menu item.
 * Restricted to RESTAURANT_ADMIN, SUPER_ADMIN, and CHEF.
 */
router.patch(
  "/:id/toggle",
  authenticateToken,
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN, Role.CHEF),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;

    try {
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId },
      });

      if (!existing) {
        res.status(404).json({ error: "Menu item not found" });
        return;
      }

      const updated = await prisma.menuItem.update({
        where: { id },
        data: { isAvailable: !existing.isAvailable },
      });

      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/menu/:id/toggle error:", err);
      res.status(500).json({ error: "Failed to toggle menu item availability" });
    }
  }
);

/**
 * DELETE /api/menu/:id
 * Delete a menu item.
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
      const existing = await prisma.menuItem.findFirst({
        where: { id, restaurantId },
      });

      if (!existing) {
        res.status(404).json({ error: "Menu item not found" });
        return;
      }

      await prisma.menuItem.delete({
        where: { id },
      });

      res.json({ message: "Menu item deleted successfully" });
    } catch (err) {
      console.error("DELETE /api/menu/:id error:", err);
      res.status(500).json({ error: "Failed to delete menu item" });
    }
  }
);

export default router;
