import { Router, Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../server";
import { validate } from "../middleware/validate";

const router = Router();

const createFeedbackSchema = z.object({
  orderId: z.string().uuid("Invalid order ID format"),
  rating: z.number().int().min(1).max(5, "Rating must be between 1 and 5"),
  comment: z.string().max(1000).optional(),
});

/**
 * POST /api/feedback
 * Submit customer feedback for a completed or active order.
 */
router.post(
  "/",
  validate(createFeedbackSchema),
  async (req: Request, res: Response): Promise<void> => {
    const { orderId, rating, comment } = req.body;

    try {
      // Check if order exists
      const order = await prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        res.status(404).json({ error: "Order not found" });
        return;
      }

      // Upsert feedback so customer can update their rating if desired
      const feedback = await prisma.feedback.upsert({
        where: { orderId },
        update: {
          rating,
          comment: comment ? comment.trim() : null,
        },
        create: {
          orderId,
          rating,
          comment: comment ? comment.trim() : null,
        },
      });

      res.status(201).json({
        success: true,
        data: feedback,
        message: "Thank you for your feedback!",
      });
    } catch (err) {
      console.error("POST /api/feedback error:", err);
      res.status(500).json({ error: "Failed to submit feedback" });
    }
  }
);

/**
 * GET /api/feedback/:orderId
 * Fetch existing feedback for an order.
 */
router.get("/:orderId", async (req: Request, res: Response): Promise<void> => {
  const { orderId } = req.params;

  try {
    const feedback = await prisma.feedback.findUnique({
      where: { orderId },
    });

    if (!feedback) {
      res.status(404).json({ error: "Feedback not found" });
      return;
    }

    res.json({
      success: true,
      data: feedback,
    });
  } catch (err) {
    console.error("GET /api/feedback/:orderId error:", err);
    res.status(500).json({ error: "Failed to retrieve feedback" });
  }
});

export default router;
