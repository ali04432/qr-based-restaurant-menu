
import { randomUUID } from 'crypto';
import { prisma } from '../config/database';

export type JobType =
  | 'SCHEDULED_REPORT_DISPATCH'
  | 'LOYALTY_POINTS_ACCRUE'
  | 'INVENTORY_REORDER_ALERT'
  | 'INVOICE_EMAIL'
  | 'WHATSAPP_NOTIFICATION'
  | 'SMS_NOTIFICATION'
  | 'AI_INSIGHT_REFRESH';

export interface EnqueueOptions {
  restaurantId?: string;
  jobType: JobType;
  payload: Record<string, unknown>;
  scheduledFor?: Date;
  maxRetries?: number;
  idempotencyKey?: string;
}

export interface JobResult {
  success: boolean;
  output?: unknown;
  error?: string;
}

type JobHandler = (
  payload: Record<string, unknown>,
  restaurantId?: string
) => Promise<JobResult>;

const handlers = new Map<string, JobHandler>();

export function registerJobHandler(
  jobType: JobType,
  handler: JobHandler
): void {
  handlers.set(jobType, handler);
}

// Default handlers. External integrations must be connected
// before these handlers can be considered production-ready.

registerJobHandler('SCHEDULED_REPORT_DISPATCH', async (payload, restaurantId) => {
  const { reportType, recipients, format } = payload;
  console.log(`[JobQueue] Report dispatch: ${reportType}, ${recipients}, ${restaurantId}`);
  return {
    success: true,
    output: { dispatched: true, reportType, recipients, format, timestamp: new Date().toISOString() },
  };
});

registerJobHandler('LOYALTY_POINTS_ACCRUE', async (payload) => {
  const { orderId, customerId, points } = payload;
  console.log(`[JobQueue] Loyalty points: ${points}, customer: ${customerId}`);
  return { success: true, output: { orderId, customerId, points } };
});

registerJobHandler('INVENTORY_REORDER_ALERT', async (payload) => {
  const { itemId, itemName, currentStock } = payload;
  console.log(`[JobQueue] Inventory alert: ${itemName}, stock: ${currentStock}`);
  return { success: true, output: { itemId, itemName, currentStock } };
});

registerJobHandler('INVOICE_EMAIL', async (payload) => {
  const { orderId, email } = payload;
  console.log(`[JobQueue] Invoice email: ${orderId}, ${email}`);
  return { success: true, output: { orderId, email } };
});

registerJobHandler('WHATSAPP_NOTIFICATION', async (payload) => {
  const { to, templateName } = payload;
  console.log(`[JobQueue] WhatsApp notification: ${to}, ${templateName}`);
  return { success: true, output: { to, templateName } };
});

registerJobHandler('SMS_NOTIFICATION', async (payload) => {
  const { to, message } = payload;
  console.log(`[JobQueue] SMS notification: ${to}`);
  return { success: true, output: { to, message } };
});

registerJobHandler('AI_INSIGHT_REFRESH', async (payload, restaurantId) => {
  const rid = (payload.restaurantId as string) || restaurantId;
  if (!rid) {
    return { success: false, error: 'restaurantId required for AI_INSIGHT_REFRESH' };
  }

  const {
    runOperationsPillar,
    runAnalyticsPillar,
    runOptimizationPillar,
  } = await import('./ai/ai.service');

  const [operations, analytics, optimization] = await Promise.all([
    runOperationsPillar(rid),
    runAnalyticsPillar(rid),
    runOptimizationPillar(rid),
  ]);

  return {
    success: true,
    output: {
      restaurantId: rid,
      operations: {
        confidence: operations.confidence,
        recommendations: operations.recommendations?.length ?? 0,
      },
      analytics: {
        confidence: analytics.confidence,
        recommendations: analytics.recommendations?.length ?? 0,
      },
      optimization: {
        confidence: optimization.confidence,
        recommendations: optimization.recommendations?.length ?? 0,
      },
      generatedAt: new Date().toISOString(),
    },
  };
});

class JobQueueService {
  private readonly workerId = randomUUID();
  private readonly pollIntervalMs = 5000;
  private readonly heartbeatIntervalMs = 60_000;

  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isPolling = false;
  private stopping = false;
  private activeTasks = new Set<Promise<void>>();

  private track(task: Promise<void>): void {
    this.activeTasks.add(task);
    void task.then(
      () => this.activeTasks.delete(task),
      (error) => {
        console.error('[JobQueue] Background task error:', error);
        this.activeTasks.delete(task);
      }
    );
  }

  async enqueue(options: EnqueueOptions): Promise<{ id: string }> {
    const {
      restaurantId,
      jobType,
      payload,
      scheduledFor = new Date(),
      maxRetries = 3,
      idempotencyKey,
    } = options;

    if (!Number.isInteger(maxRetries) || maxRetries < 0) {
      throw new Error('maxRetries must be a non-negative integer');
    }

    try {
      const job = await prisma.backgroundJobLog.create({
        data: {
          restaurantId: restaurantId || null,
          jobType,
          status: 'PENDING',
          payload: JSON.stringify(payload),
          scheduledFor,
          maxRetries,
          idempotencyKey: idempotencyKey || null,
        },
      });

      if (scheduledFor <= new Date()) {
        this.track(this.processJob(job.id));
      }

      return { id: job.id };
    } catch (error) {
      if (
        idempotencyKey &&
        (error as { code?: string }).code === 'P2002'
      ) {
        const existing = await prisma.backgroundJobLog.findUnique({
          where: { idempotencyKey },
          select: { id: true },
        });

        if (existing) return { id: existing.id };
      }

      throw error;
    }
  }

  // PostgreSQL atomically claims one due job.
  // SKIP LOCKED prevents concurrent workers claiming the same row.
  private async claimJob(jobId?: string): Promise<string | null> {
    const rows = jobId
      ? await prisma.$queryRaw<Array<{ id: string }>>`
          WITH candidate AS (
            SELECT id
            FROM background_job_logs
            WHERE id = ${jobId}
              AND status = 'PENDING'
              AND scheduled_for <= NOW()
            FOR UPDATE SKIP LOCKED
          )
          UPDATE background_job_logs AS job
          SET status = 'RUNNING',
              started_at = NOW(),
              locked_at = NOW(),
              locked_by = ${this.workerId}
          FROM candidate
          WHERE job.id = candidate.id
          RETURNING job.id
        `
      : await prisma.$queryRaw<Array<{ id: string }>>`
          WITH candidate AS (
            SELECT id
            FROM background_job_logs
            WHERE status = 'PENDING'
              AND scheduled_for <= NOW()
            ORDER BY scheduled_for ASC
            FOR UPDATE SKIP LOCKED
            LIMIT 1
          )
          UPDATE background_job_logs AS job
          SET status = 'RUNNING',
              started_at = NOW(),
              locked_at = NOW(),
              locked_by = ${this.workerId}
          FROM candidate
          WHERE job.id = candidate.id
          RETURNING job.id
        `;

    return rows[0]?.id ?? null;
  }

  private async processJob(jobId: string): Promise<void> {
    try {
      const claimedId = await this.claimJob(jobId);
      if (!claimedId) return;

      await this.executeClaimedJob(claimedId);
    } catch (error) {
      console.error(`[JobQueue] Could not process job ${jobId}:`, error);
    }
  }

  private async executeClaimedJob(jobId: string): Promise<void> {
    const job = await prisma.backgroundJobLog.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status !== 'RUNNING' || job.lockedBy !== this.workerId) {
      return;
    }

    const handler = handlers.get(job.jobType);

    let heartbeat: ReturnType<typeof setInterval> | null = null;

    try {
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.jobType}`);
      }

      // Renew this worker's lease while the handler is executing.
      heartbeat = setInterval(() => {
        void prisma.backgroundJobLog.updateMany({
          where: {
            id: jobId,
            status: 'RUNNING',
            lockedBy: this.workerId,
          },
          data: { lockedAt: new Date() },
        }).catch((error) => {
          console.error(`[JobQueue] Heartbeat failed for ${jobId}:`, error);
        });
      }, this.heartbeatIntervalMs);

      const payload = job.payload
        ? JSON.parse(job.payload) as Record<string, unknown>
        : {};

      const result = await handler(payload, job.restaurantId || undefined);

      if (!result.success) {
        throw new Error(result.error || 'Job handler returned failure');
      }

      const completed = await prisma.backgroundJobLog.updateMany({
        where: {
          id: jobId,
          status: 'RUNNING',
          lockedBy: this.workerId,
        },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          result: JSON.stringify(result.output ?? null),
          error: null,
          lockedAt: null,
          lockedBy: null,
        },
      });

      if (completed.count === 0) {
        console.warn(`[JobQueue] Job ${jobId} completion skipped: lock no longer owned`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const newRetries = job.retries + 1;
      const shouldRetry = newRetries <= job.maxRetries;

      if (shouldRetry) {
        const backoffMs = Math.min(
          30_000 * Math.pow(2, job.retries),
          30 * 60 * 1000
        );

        await prisma.backgroundJobLog.updateMany({
          where: {
            id: jobId,
            status: 'RUNNING',
            lockedBy: this.workerId,
          },
          data: {
            status: 'PENDING',
            retries: newRetries,
            error: message,
            scheduledFor: new Date(Date.now() + backoffMs),
            startedAt: null,
            lockedAt: null,
            lockedBy: null,
          },
        });

        console.error(`[JobQueue] Job ${jobId} failed; retry ${newRetries}/${job.maxRetries}`);
      } else {
        await prisma.backgroundJobLog.updateMany({
          where: {
            id: jobId,
            status: 'RUNNING',
            lockedBy: this.workerId,
          },
          data: {
            status: 'FAILED',
            retries: newRetries,
            error: message,
            completedAt: new Date(),
            lockedAt: null,
            lockedBy: null,
          },
        });

        console.error(`[JobQueue] Job ${jobId} permanently failed: ${message}`);
      }
    } finally {
      if (heartbeat) clearInterval(heartbeat);
    }
  }

  private async processDueJobs(): Promise<void> {
    if (this.isPolling || this.stopping) return;

    this.isPolling = true;

    try {
      // Claim one job at a time so waiting jobs do not hold stale locks.
      for (let i = 0; i < 20 && !this.stopping; i++) {
        const jobId = await this.claimJob();
        if (!jobId) break;

        await this.executeClaimedJob(jobId);
      }
    } catch (error) {
      console.error('[JobQueue] Poll cycle failed:', error);
    } finally {
      this.isPolling = false;
    }
  }

  start(): void {
    if (this.pollTimer) return;

    this.stopping = false;

    console.log(
      `[JobQueue] Worker ${this.workerId} started; polling every ${this.pollIntervalMs}ms`
    );

    this.track(this.processDueJobs());

    this.pollTimer = setInterval(() => {
      this.track(this.processDueJobs());
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.stopping = true;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for already-running work to finish before shutdown.
    while (this.activeTasks.size > 0) {
      await Promise.allSettled([...this.activeTasks]);
    }

    console.log('[JobQueue] Worker stopped gracefully');
  }

  async getStats(restaurantId?: string): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    recentJobs: unknown[];
  }> {
    const baseWhere = restaurantId ? { restaurantId } : {};

    const [pending, running, completed, failed, recentJobs] = await Promise.all([
      prisma.backgroundJobLog.count({
        where: { ...baseWhere, status: 'PENDING' },
      }),
      prisma.backgroundJobLog.count({
        where: { ...baseWhere, status: 'RUNNING' },
      }),
      prisma.backgroundJobLog.count({
        where: { ...baseWhere, status: 'COMPLETED' },
      }),
      prisma.backgroundJobLog.count({
        where: { ...baseWhere, status: 'FAILED' },
      }),
      prisma.backgroundJobLog.findMany({
        where: baseWhere,
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          jobType: true,
          status: true,
          retries: true,
          maxRetries: true,
          error: true,
          scheduledFor: true,
          startedAt: true,
          completedAt: true,
          createdAt: true,
        },
      }),
    ]);

    return { pending, running, completed, failed, recentJobs };
  }
}

export const jobQueue = new JobQueueService();
