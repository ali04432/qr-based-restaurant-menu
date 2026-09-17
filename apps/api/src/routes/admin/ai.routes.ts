import { Router, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { requireEntitlement } from '../../middleware/entitlement.middleware';
import { UserRole } from '@qr-menu/shared';
import {
  aiQuery,
  runAssistantPillar,
  runOperationsPillar,
  runAnalyticsPillar,
  runOptimizationPillar,
} from '../../services/ai/ai.service';

const router = Router();

// ============================================================
// Phase 5: Admin AI Intelligence Engine Routes
//
// Pillar      Route               Allowed Roles
// ─────────────────────────────────────────────
// Assistant   POST /query         SUPER_ADMIN, ADMIN, MANAGER
// Assistant   POST /assistant     SUPER_ADMIN, ADMIN, MANAGER
// Operations  GET  /operations    SUPER_ADMIN, ADMIN, MANAGER
// Analytics   GET  /analytics     SUPER_ADMIN, ADMIN, MANAGER
// Optimization GET /optimization  SUPER_ADMIN, ADMIN, MANAGER
// All pillars GET /dashboard      SUPER_ADMIN, ADMIN, MANAGER
// ============================================================

/** Resolve restaurantId from request (SUPER_ADMIN can specify any restaurant) */
function resolveRestaurantId(req: AuthenticatedRequest): string | null {
  if (req.user?.role === UserRole.SUPER_ADMIN) {
    return (req.body?.restaurantId as string) || (req.query?.restaurantId as string) || req.user?.restaurantId || null;
  }
  return req.user?.restaurantId || null;
}

// ── Legacy route — kept for backwards compatibility ────────────

/**
 * POST /api/admin/ai/query
 * Dedicated Admin AI Business Assistant.
 * @deprecated Prefer POST /api/admin/ai/assistant
 */
router.post(
  '/query',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { query } = req.body as { query: string };
      if (!query || typeof query !== 'string') {
        return next(new AppError('Query string is required', 400, 'VALIDATION_ERROR'));
      }

      const { reply, provider, context } = await aiQuery(restaurantId, query);

      return sendSuccess(res, {
        reply,
        provider,
        timestamp: new Date().toISOString(),
        metricsSummary: {
          todayRevenue: context.todaySales,
          todayOrders: context.todayOrders,
          weekRevenue: context.weekSales,
          weekProfit: context.weekProfit,
          lowStockCount: context.lowStockItems.length,
        },
      });
    } catch (err) {
      return next(err);
    }
  }
);

// ── Pillar 1: AI Assistant ─────────────────────────────────────

/**
 * POST /api/admin/ai/assistant
 * Natural-language restaurant Q&A.
 * Returns standard Phase 5 envelope with intent detection and recommendations.
 */
router.post(
  '/assistant',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const { query } = req.body as { query: string };
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return next(new AppError('Query string is required (min 2 characters)', 400, 'VALIDATION_ERROR'));
      }

      const result = await runAssistantPillar(restaurantId, query.trim());
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── Pillar 2: Operations AI ───────────────────────────────────

/**
 * GET /api/admin/ai/operations
 * Table utilization, peak hours, order flow, and staffing alerts.
 * Pure DB-driven — always fast, no external AI dependency.
 */
router.get(
  '/operations',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const result = await runOperationsPillar(restaurantId);
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── Pillar 3: Analytics AI ────────────────────────────────────

/**
 * GET /api/admin/ai/analytics
 * Revenue breakdown, menu performance, customer insights, and revenue forecasting.
 */
router.get(
  '/analytics',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const result = await runAnalyticsPillar(restaurantId);
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── Pillar 4: Optimization AI ─────────────────────────────────

/**
 * GET /api/admin/ai/optimization
 * Inventory reorder, pricing opportunities, menu mix, and operational savings.
 */
router.get(
  '/optimization',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      const result = await runOptimizationPillar(restaurantId);
      return sendSuccess(res, result);
    } catch (err) {
      return next(err);
    }
  }
);

// ── All-in-one dashboard endpoint ─────────────────────────────

/**
 * GET /api/admin/ai/dashboard
 * Runs all three passive pillars (Operations, Analytics, Optimization) in parallel.
 * The Assistant pillar is query-driven and excluded from the dashboard fetch.
 * Highly efficient — all three run as concurrent DB queries.
 */
router.get(
  '/dashboard',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  requireEntitlement('AI'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = resolveRestaurantId(req);
      if (!restaurantId) {
        return next(new AppError('Restaurant ID is required', 400, 'VALIDATION_ERROR'));
      }

      // Run all three passive pillars concurrently
      const [operations, analytics, optimization] = await Promise.all([
        runOperationsPillar(restaurantId),
        runAnalyticsPillar(restaurantId),
        runOptimizationPillar(restaurantId),
      ]);

      // Aggregate all recommendations across pillars
      const allRecommendations = [
        ...(operations.recommendations ?? []),
        ...(analytics.recommendations ?? []),
        ...(optimization.recommendations ?? []),
      ].sort((a, b) => {
        const p = { critical: 0, high: 1, medium: 2, low: 3 };
        return p[a.priority] - p[b.priority];
      });

      return sendSuccess(res, {
        generatedAt: new Date().toISOString(),
        restaurantId,
        operations,
        analytics,
        optimization,
        topRecommendations: allRecommendations.slice(0, 5),
      });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
