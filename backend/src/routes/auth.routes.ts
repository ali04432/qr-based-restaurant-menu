import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, JWT_SECRET } from "../middleware/auth.middleware";

const router = Router();

/**
 * POST /api/auth/signup
 * Register a new Restaurant and its primary RESTAURANT_ADMIN user.
 */
router.post("/signup", async (req: Request, res: Response): Promise<void> => {
  const { restaurantName, themeColor, logo, adminName, email, password, phone } = req.body;

  if (!restaurantName || !adminName || !email || !password) {
    res.status(400).json({ error: "Missing required fields: restaurantName, adminName, email, password" });
    return;
  }

  try {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(400).json({ error: "User with this email already exists" });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create Restaurant and Restaurant Admin User in transaction
    const result = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name: restaurantName.trim(),
          logo: logo || null,
          themeColor: themeColor || "#4F46E5",
          subscriptionPlan: "PRO",
        },
      });

      const user = await tx.user.create({
        data: {
          restaurantId: restaurant.id,
          name: adminName.trim(),
          email: email.toLowerCase().trim(),
          phone: phone || null,
          passwordHash,
          role: Role.RESTAURANT_ADMIN,
        },
      });

      return { restaurant, user };
    });

    // Sign JWT
    const token = jwt.sign(
      {
        userId: result.user.id,
        restaurantId: result.restaurant.id,
        role: result.user.role,
        email: result.user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      token,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        restaurantId: result.user.restaurantId,
      },
      restaurant: {
        id: result.restaurant.id,
        name: result.restaurant.name,
        logo: result.restaurant.logo,
        themeColor: result.restaurant.themeColor,
      },
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Failed to create restaurant and admin account" });
  }
});

/**
 * POST /api/auth/login
 * Log in for any role (RESTAURANT_ADMIN, CHEF, WAITER, CASHIER, SUPER_ADMIN).
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
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

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        restaurantId: user.restaurantId,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: user.restaurant,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Failed to authenticate" });
  }
});

/**
 * GET /api/auth/me
 * Get current authenticated user profile and restaurant metadata
 */
router.get("/me", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Unauthenticated" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        restaurantId: true,
        createdAt: true,
        restaurant: {
          select: {
            id: true,
            name: true,
            logo: true,
            themeColor: true,
            subscriptionPlan: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        restaurantId: user.restaurantId,
      },
      restaurant: user.restaurant,
    });
  } catch (err) {
    console.error("Auth /me error:", err);
    res.status(500).json({ error: "Failed to fetch user session" });
  }
});

export default router;
