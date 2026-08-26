import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

// Apply authentication to all user routes
router.use(authenticateToken);

/**
 * GET /api/users
 * List all staff members for the authenticated restaurant.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.get(
  "/",
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const restaurantId = req.user!.restaurantId;

      const users = await prisma.user.findMany({
        where: { restaurantId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      });

      res.json(users);
    } catch (err) {
      console.error("GET /api/users error:", err);
      res.status(500).json({ error: "Failed to fetch staff members" });
    }
  }
);

/**
 * POST /api/users
 * Create a new staff account (Chef, Waiter, Cashier, or secondary Admin).
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.post(
  "/",
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { name, email, password, phone, role } = req.body;
    const restaurantId = req.user!.restaurantId;

    if (!name || !email || !password || !role) {
      res.status(400).json({ error: "Missing required fields: name, email, password, role" });
      return;
    }

    const validRoles = [Role.RESTAURANT_ADMIN, Role.CHEF, Role.WAITER, Role.CASHIER];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Allowed roles: ${validRoles.join(", ")}` });
      return;
    }

    try {
      // Check for existing user email
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingUser) {
        res.status(400).json({ error: "User with this email already exists" });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          restaurantId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          phone: phone || null,
          passwordHash,
          role: role as Role,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(201).json(newUser);
    } catch (err) {
      console.error("POST /api/users error:", err);
      res.status(500).json({ error: "Failed to create staff account" });
    }
  }
);

/**
 * DELETE /api/users/:id
 * Delete a staff member from the restaurant.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.delete(
  "/:id",
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const restaurantId = req.user!.restaurantId;
    const currentUserId = req.user!.userId;

    if (id === currentUserId) {
      res.status(400).json({ error: "You cannot delete your own admin account" });
      return;
    }

    try {
      const user = await prisma.user.findFirst({
        where: { id, restaurantId },
      });

      if (!user) {
        res.status(404).json({ error: "Staff member not found" });
        return;
      }

      await prisma.user.delete({
        where: { id },
      });

      res.json({ message: "Staff account deleted successfully" });
    } catch (err) {
      console.error("DELETE /api/users/:id error:", err);
      res.status(500).json({ error: "Failed to delete staff account" });
    }
  }
);

export default router;
