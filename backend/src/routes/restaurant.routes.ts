import { Router, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../server";
import { authenticateToken, requireRole } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticateToken);

/**
 * PATCH /api/restaurant/settings
 * Update restaurant name, themeColor, or logo.
 * Restricted to RESTAURANT_ADMIN and SUPER_ADMIN.
 */
router.patch(
  "/settings",
  requireRole(Role.RESTAURANT_ADMIN, Role.SUPER_ADMIN),
  async (req: Request, res: Response): Promise<void> => {
    const { name, themeColor, logo } = req.body;
    const restaurantId = req.user!.restaurantId;

    try {
      const updatedRestaurant = await prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          ...(name && typeof name === "string" ? { name: name.trim() } : {}),
          ...(themeColor && typeof themeColor === "string" ? { themeColor: themeColor.trim() } : {}),
          ...(logo !== undefined ? { logo: logo || null } : {}),
        },
        select: {
          id: true,
          name: true,
          logo: true,
          themeColor: true,
          subscriptionPlan: true,
          updatedAt: true,
        },
      });

      res.json(updatedRestaurant);
    } catch (err) {
      console.error("PATCH /api/restaurant/settings error:", err);
      res.status(500).json({ error: "Failed to update restaurant settings" });
    }
  }
);

export default router;
