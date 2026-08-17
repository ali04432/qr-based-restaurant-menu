import { Router, Request, Response } from 'express';
import { HealthResponse } from '@qr-menu/shared';
import { sendSuccess } from '../utils/api-response';

// ============================================================
// Health Check Route
// GET /api/health
// ============================================================

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const healthData: HealthResponse = {
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
  };

  return sendSuccess(res, healthData, { message: 'Server is healthy' });
});

export default router;
