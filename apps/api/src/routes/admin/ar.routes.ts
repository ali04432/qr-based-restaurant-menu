import { Router, Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../utils/api-response';
import { AppError } from '../../middleware/error.middleware';
import { authMiddleware, AuthenticatedRequest } from '../../middleware/auth.middleware';
import { requireRole } from '../../middleware/role.middleware';
import { UserRole } from '@qr-menu/shared';
import {
  listArAssets,
  getArAssetById,
  createArAsset,
  updateArAsset,
  deleteArAsset,
  trackVisualizationEvent,
  getVisualizationAnalytics,
} from '../../services/ar/ar-visualization.service';

const router = Router();

// ============================================================
// Admin AR Asset Management Routes
// POST /api/admin/ar/assets
// GET  /api/admin/ar/assets
// GET  /api/admin/ar/assets/:id
// PUT  /api/admin/ar/assets/:id
// DELETE /api/admin/ar/assets/:id
// GET  /api/admin/ar/analytics
// POST /api/admin/ar/track  (also used client-side via customer flow)
// ============================================================

/**
 * GET /api/admin/ar/assets
 * List all AR assets for the logged-in restaurant.
 */
router.get(
  '/assets',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const assets = await listArAssets(restaurantId);
      return sendSuccess(res, assets);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/ar/assets/:id
 */
router.get(
  '/assets/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const asset = await getArAssetById(req.params.id, restaurantId);
      if (!asset) return next(new AppError('AR asset not found', 404, 'NOT_FOUND'));

      return sendSuccess(res, asset);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/ar/assets
 * Create a new AR asset linked to a menu item.
 */
router.post(
  '/assets',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const { menuItemId, name, assetType, modelUrl, iosModelUrl, previewImage, mimeType, fileSize, scale, status, metadata } = req.body;

      if (!name || !modelUrl) {
        return next(new AppError('name and modelUrl are required', 400, 'VALIDATION_ERROR'));
      }

      const asset = await createArAsset(restaurantId, {
        menuItemId,
        name,
        assetType,
        modelUrl,
        iosModelUrl,
        previewImage,
        mimeType,
        fileSize,
        scale,
        status,
        metadata,
      });

      return sendSuccess(res, asset, { statusCode: 201 });
    } catch (err: any) {
      // Unique constraint — menuItemId already has an asset
      if (err?.code === 'P2002') {
        return next(new AppError('This menu item already has an AR asset. Update the existing one instead.', 409, 'CONFLICT'));
      }
      return next(err);
    }
  }
);

/**
 * PUT /api/admin/ar/assets/:id
 */
router.put(
  '/assets/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const updated = await updateArAsset(req.params.id, restaurantId, req.body);
      if (!updated) return next(new AppError('AR asset not found', 404, 'NOT_FOUND'));

      return sendSuccess(res, updated);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/ar/assets/:id
 */
router.delete(
  '/assets/:id',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const deleted = await deleteArAsset(req.params.id, restaurantId);
      if (!deleted) return next(new AppError('AR asset not found', 404, 'NOT_FOUND'));

      return sendSuccess(res, { message: 'AR asset deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * GET /api/admin/ar/analytics
 * Returns visualization event analytics for the last N days.
 */
router.get(
  '/analytics',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const days = Math.min(Number(req.query.days ?? 7), 90);
      const analytics = await getVisualizationAnalytics(restaurantId, days);
      return sendSuccess(res, analytics);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * POST /api/admin/ar/track
 * Record a visualization telemetry event from the customer frontend.
 * Auth-optional: works with or without token (public customer pages).
 */
router.post(
  '/track',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { restaurantId, menuItemId, assetId, sessionId, eventType, deviceType, arSupported, metadata } = req.body;
      if (!restaurantId || !eventType) {
        return next(new AppError('restaurantId and eventType are required', 400, 'VALIDATION_ERROR'));
      }

      await trackVisualizationEvent(restaurantId, {
        menuItemId,
        assetId,
        sessionId,
        eventType,
        deviceType,
        arSupported: arSupported ?? false,
        metadata,
      });

      return sendSuccess(res, { tracked: true });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
