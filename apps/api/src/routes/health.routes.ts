import { Router, Request, Response } from 'express';
import os from 'os';
import { HealthResponse, SystemHealthStatus, ProviderType } from '@qr-menu/shared';
import { sendSuccess } from '../utils/api-response';
import { prisma } from '../config/database';

// ============================================================
// Health & Observability Check Routes
// GET /api/health         — lightweight ping
// GET /api/health/system  — deep diagnostics (REQ-22)
// ============================================================

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const healthData: HealthResponse = {
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV ?? 'development',
    services: {},
  };

  return sendSuccess(res, healthData, { message: 'Server is healthy' });
});

/**
 * GET /api/health/system
 * Detailed operational and infrastructure observability metrics.
 * Measures DB latency, memory pressure, job queue backlog, and integrations status.
 */
router.get('/system', async (_req: Request, res: Response) => {
  const t0 = Date.now();
  let dbStatus: 'healthy' | 'unavailable' = 'healthy';
  let dbLatencyMs = 0;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - t0;
  } catch (err) {
    dbStatus = 'unavailable';
    dbLatencyMs = -1;
  }

  // Memory metrics
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMb = Math.round(memUsage.rss / (1024 * 1024));
  const totalMb = Math.round(totalMem / (1024 * 1024));
  const freePercent = Math.round((freeMem / totalMem) * 100);

  // Background jobs worker status
  let pendingJobs = 0;
  let failedRecent = 0;
  let jobsWorkerStatus: 'healthy' | 'degraded' = 'healthy';

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [pending, failed] = await Promise.all([
      prisma.backgroundJobLog.count({ where: { status: 'PENDING' } }),
      prisma.backgroundJobLog.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: oneHourAgo },
        },
      }),
    ]);
    pendingJobs = pending;
    failedRecent = failed;
    if (failedRecent > 10) {
      jobsWorkerStatus = 'degraded';
    }
  } catch {
    jobsWorkerStatus = 'degraded';
  }

  // Integrations status check
  let integrations: Array<{ providerType: ProviderType; isEnabled: boolean; status: string }> = [];
  try {
    const configs = await prisma.integrationConfig.findMany({
      select: { providerType: true, isEnabled: true, lastStatus: true },
      take: 20,
    });
    integrations = configs.map((c) => ({
      providerType: c.providerType as ProviderType,
      isEnabled: c.isEnabled,
      status: c.lastStatus || 'UNCONFIGURED',
    }));
  } catch {
    // Graceful fallback
  }

  // Determine overall system health state
  let status: 'healthy' | 'degraded' | 'unavailable' = 'healthy';
  if (dbStatus === 'unavailable') {
    status = 'unavailable';
  } else if (dbLatencyMs > 1000 || jobsWorkerStatus === 'degraded' || freePercent < 5) {
    status = 'degraded';
  }

  const systemHealth: SystemHealthStatus = {
    status,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    memory: {
      usedMb,
      totalMb,
      freePercent,
    },
    socketServer: {
      status: 'healthy',
      connectedClients: 0,
    },
    jobsWorker: {
      status: jobsWorkerStatus,
      pendingJobs,
      failedRecent,
    },
    integrations,
  };

  const httpStatus = status === 'unavailable' ? 503 : 200;
  return res.status(httpStatus).json({
    success: status !== 'unavailable',
    data: systemHealth,
    message: `System is ${status}`,
  });
});

export default router;
