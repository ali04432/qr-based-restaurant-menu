import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
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
// 3D Model File Upload — Configuration
// ============================================================

// Models are stored in <api-root>/public/models/
// Next.js web app also has its own public/models/ for static serving.
// The API static middleware (app.ts) serves files from this folder.
const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'public', 'models');

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Maximum allowed upload size in bytes (10 MB hard limit)
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Allowed MIME types (.glb and .usdz only — .gltf removed to prevent broken external assets)
const ALLOWED_MIME_TYPES = new Set([
  'model/gltf-binary',       // .glb
  'model/vnd.usdz+zip',     // .usdz
  'application/octet-stream', // Generic binary — then check magic bytes
  'application/zip',          // .usdz is a ZIP under the hood
]);

// Allowed file extensions (.glb and .usdz only)
const ALLOWED_EXTENSIONS = new Set(['.glb', '.usdz']);

// ── Magic-byte validators ──────────────────────────────────────
// GLB spec: first 4 bytes are ASCII "glTF" (0x67, 0x6C, 0x54, 0x46)
function isValidGlb(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x67 && // g
    buffer[1] === 0x6c && // l
    buffer[2] === 0x54 && // T
    buffer[3] === 0x46    // F
  );
}

// USDZ is a ZIP archive — first 4 bytes are PK signature (0x50, 0x4B, 0x03, 0x04)
function isValidUsdz(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 && // P
    buffer[1] === 0x4b && // K
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  );
}

// ── Filename sanitization ──────────────────────────────────────
// Returns a safe, unique filename: <uuid>.<ext>
function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const uuid = crypto.randomUUID();
  return `${uuid}${ext}`;
}

// ── Multer disk storage ──────────────────────────────────────
const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, UPLOAD_DIR);
  },
  filename(_req, file, cb) {
    cb(null, sanitizeFilename(file.originalname));
  },
});

// Pre-filter by MIME type and extension (.glb and .usdz only)
const multerUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return cb(new Error(
        `Invalid file extension "${ext}". Allowed: .glb, .usdz`
      ));
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(
        `Invalid MIME type "${file.mimetype}". Expected model/gltf-binary or model/vnd.usdz+zip`
      ));
    }
    cb(null, true);
  },
});

// ── Magic-byte post-upload validation ─────────────────────────
function validateMagicBytes(filePath: string, ext: string): boolean {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(16);
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);

  if (ext === '.glb') return isValidGlb(buf);
  if (ext === '.usdz') return isValidUsdz(buf);
  return false;
}

// ── Determine correct MIME type from extension ──────────────
function mimeForExt(ext: string): string {
  if (ext === '.glb') return 'model/gltf-binary';
  if (ext === '.usdz') return 'model/vnd.usdz+zip';
  return 'application/octet-stream';
}

// ── Validate modelUrl/iosModelUrl (must be relative /models/... or https://) ─
function isValidModelUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (trimmed.startsWith('/models/') || trimmed.startsWith('/api/models/')) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ── Orphan file cleanup ─────────────────────────────────────────
function safelyDeleteModelFile(url: string | null | undefined): void {
  if (!url || typeof url !== 'string') return;
  const match = url.trim().match(/^\/(?:api\/)?models\/([a-zA-Z0-9_\-\.]+)$/);
  if (!match) return;
  const filename = match[1];
  // NEVER delete sample/default models
  if (filename.toLowerCase() === 'avocado.glb') return;
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.warn(`[AR] Failed to delete orphaned model file ${filePath}:`, err);
  }
}

// ============================================================
// Admin AR Asset Management Routes
// GET    /api/admin/ar and /api/admin/ar/assets
// POST   /api/admin/ar and /api/admin/ar/assets
// POST   /api/admin/ar/upload       ← 3D model file upload
// GET    /api/admin/ar/analytics
// POST   /api/admin/ar/track        (public — also used by customer flow)
// GET    /api/admin/ar/:id and /api/admin/ar/assets/:id
// PUT    /api/admin/ar/:id and /api/admin/ar/assets/:id
// DELETE /api/admin/ar/:id and /api/admin/ar/assets/:id
// ============================================================

/**
 * GET /api/admin/ar and /api/admin/ar/assets
 * List all AR assets for the logged-in restaurant.
 */
router.get(
  ['/', '/assets'],
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
 * POST /api/admin/ar and /api/admin/ar/assets
 * Create a new AR asset linked to a menu item (URL-based, no file upload).
 */
router.post(
  ['/', '/assets'],
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));
      const { menuItemId, name, assetType, modelUrl, iosModelUrl, previewImage, mimeType, fileSize, scale, widthCm, heightCm, depthCm, portionLabel, status, metadata } = req.body;

      if (!name || !modelUrl) {
        return next(new AppError('name and modelUrl are required', 400, 'VALIDATION_ERROR'));
      }

      if (!isValidModelUrl(modelUrl)) {
        return next(new AppError('modelUrl must be a relative /models/... path or an https:// URL', 400, 'VALIDATION_ERROR'));
      }

      if (iosModelUrl && !isValidModelUrl(iosModelUrl)) {
        return next(new AppError('iosModelUrl must be a relative /models/... path or an https:// URL', 400, 'VALIDATION_ERROR'));
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
        widthCm: widthCm !== undefined ? Number(widthCm) : undefined,
        heightCm: heightCm !== undefined ? Number(heightCm) : undefined,
        depthCm: depthCm !== undefined ? Number(depthCm) : undefined,
        portionLabel,
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
 * POST /api/admin/ar/upload
 * Upload a .glb, .gltf, or .usdz file for use as a 3D/AR model.
 * Accepts multipart/form-data with field name "file" or "model".
 */
router.post(
  '/upload',
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  (req: Request, res: Response, next: NextFunction) => {
    multerUpload.fields([{ name: 'file', maxCount: 1 }, { name: 'model', maxCount: 1 }])(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new AppError(
            `File too large. Maximum allowed size is 10 MB. ` +
            `Tip: compress with gltf-transform: npx gltf-transform optimize input.glb output.glb`,
            413,
            'FILE_TOO_LARGE'
          ));
        }
        return next(new AppError(`Upload error: ${err.message}`, 400, 'UPLOAD_ERROR'));
      }
      if (err) return next(err);
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      req.file = files?.['file']?.[0] || files?.['model']?.[0];
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return next(new AppError('No file uploaded. Send a multipart/form-data request with field "file" or "model".', 400, 'VALIDATION_ERROR'));
      }

      const { path: filePath, filename, size } = req.file;
      const ext = path.extname(filename).toLowerCase();

      // ── Magic-byte validation (second defense after MIME filter) ──
      let magicValid = false;
      try {
        magicValid = validateMagicBytes(filePath, ext);
      } catch {
        magicValid = false;
      }

      if (!magicValid) {
        // Delete the uploaded file — it failed validation
        fs.unlink(filePath, () => {});
        const hints: Record<string, string> = {
          '.glb': 'A valid GLB file must start with the 4-byte magic "glTF". Ensure the file is a real GLB export, not a renamed file.',
          '.usdz': 'A valid USDZ file is a ZIP archive. Ensure the file was exported from Reality Composer, Xcode, or similar.',
          '.gltf': 'A valid GLTF file must be a JSON object starting with "{". Ensure the file is a text-based glTF export.',
        };
        return next(new AppError(
          `File signature validation failed for "${ext}". ${hints[ext] ?? ''}`,
          400,
          'INVALID_FILE_CONTENT'
        ));
      }

      // ── Build public URL ──────────────────────────────────────────
      const modelsBaseUrl = process.env.MODELS_BASE_URL ?? '';
      const publicUrl = modelsBaseUrl
        ? `${modelsBaseUrl}/models/${filename}`
        : `/models/${filename}`;

      return sendSuccess(res, {
        url: publicUrl,
        filename,
        mimeType: mimeForExt(ext),
        fileSizeBytes: size,
        note: 'Model uploaded. If this is a sample/placeholder, label it as "Sample model – not the actual dish" in the admin AR form.',
      }, { statusCode: 201 });
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

/**
 * GET /api/admin/ar/:id and /api/admin/ar/assets/:id
 */
router.get(
  ['/assets/:id', '/:id'],
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
 * PUT /api/admin/ar/:id and /api/admin/ar/assets/:id
 */
router.put(
  ['/assets/:id', '/:id'],
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const { modelUrl, iosModelUrl } = req.body;
      if (modelUrl && !isValidModelUrl(modelUrl)) {
        return next(new AppError('modelUrl must be a relative /models/... path or an https:// URL', 400, 'VALIDATION_ERROR'));
      }
      if (iosModelUrl && !isValidModelUrl(iosModelUrl)) {
        return next(new AppError('iosModelUrl must be a relative /models/... path or an https:// URL', 400, 'VALIDATION_ERROR'));
      }

      const existing = await getArAssetById(req.params.id, restaurantId);
      if (!existing) return next(new AppError('AR asset not found', 404, 'NOT_FOUND'));

      // If model file URLs have changed, remove previous files from disk to prevent orphans
      if (modelUrl && modelUrl !== existing.modelUrl) {
        safelyDeleteModelFile(existing.modelUrl);
      }
      if (iosModelUrl && iosModelUrl !== existing.iosModelUrl) {
        safelyDeleteModelFile(existing.iosModelUrl);
      }

      const updated = await updateArAsset(req.params.id, restaurantId, req.body);
      return sendSuccess(res, updated);
    } catch (err) {
      return next(err);
    }
  }
);

/**
 * DELETE /api/admin/ar/:id and /api/admin/ar/assets/:id
 */
router.delete(
  ['/assets/:id', '/:id'],
  authMiddleware,
  requireRole(UserRole.SUPER_ADMIN, UserRole.ADMIN),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const restaurantId = req.user!.restaurantId;
      if (!restaurantId) return next(new AppError('Restaurant ID required', 400, 'VALIDATION_ERROR'));

      const existing = await getArAssetById(req.params.id, restaurantId);
      if (!existing) return next(new AppError('AR asset not found', 404, 'NOT_FOUND'));

      // Clean up local files from disk (unless sample/default)
      safelyDeleteModelFile(existing.modelUrl);
      safelyDeleteModelFile(existing.iosModelUrl);

      const deleted = await deleteArAsset(req.params.id, restaurantId);
      return sendSuccess(res, { message: 'AR asset deleted' });
    } catch (err) {
      return next(err);
    }
  }
);

export default router;
