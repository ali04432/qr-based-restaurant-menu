import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/api-response';
import { AppError } from '../middleware/error.middleware';
import { aiQuery, buildRestaurantContext, getAiRecommendations } from '../services/ai/ai.service';
import { z } from 'zod';

const router = Router();

const chatSchema = z.object({
  restaurantId: z.string().uuid(),
  sessionId: z.string().optional(),
  message: z.string().min(1)
});

/**
 * POST /api/ai/chat
 * Customer facing AI chat endpoint.
 * Creates or updates an AiConversation and AiMessage records.
 */
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError('Invalid request payload', 400, 'VALIDATION_ERROR'));
    }

    const { restaurantId, message, sessionId: providedSessionId } = parsed.data;

    // Call AI Service
    const { reply, provider, context } = await aiQuery(restaurantId, message);

    // AI Persistence
    const sessionId = providedSessionId || Math.random().toString(36).substring(2, 15);
    
    // Find or create conversation
    let conversation = await prisma.aiConversation.findFirst({
      where: { restaurantId, sessionId }
    });

    if (!conversation) {
      conversation = await prisma.aiConversation.create({
        data: { restaurantId, sessionId }
      });
    }

    // Save message
    await prisma.aiMessage.create({
      data: {
        aiConversationId: conversation.id,
        prompt: message,
        response: reply
      }
    });

    return sendSuccess(res, {
      reply,
      sessionId,
      provider,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return next(err);
  }
});

/**
 * GET /api/ai/recommendations
 * Get AI recommendations based on cart or generic menu
 */
router.get('/recommendations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { restaurantId, cartItemIds, sessionId } = req.query as { restaurantId?: string, cartItemIds?: string, sessionId?: string };
    
    if (!restaurantId) {
      return next(new AppError('restaurantId is required', 400, 'VALIDATION_ERROR'));
    }

    const cartArray = cartItemIds ? cartItemIds.split(',') : [];
    
    const recommendations = await getAiRecommendations(restaurantId, cartArray);

    // Save recommendations if sessionId is provided
    if (sessionId && recommendations.length > 0) {
      let conversation = await prisma.aiConversation.findFirst({
        where: { restaurantId, sessionId }
      });

      if (!conversation) {
        conversation = await prisma.aiConversation.create({
          data: { restaurantId, sessionId }
        });
      }

      for (const rec of recommendations) {
        await prisma.aiRecommendation.create({
          data: {
            aiConversationId: conversation.id,
            menuItemId: rec.id,
            score: rec.score,
            reason: rec.reason
          }
        });
      }
    }

    return sendSuccess(res, recommendations);
  } catch (err) {
    return next(err);
  }
});

export default router;
