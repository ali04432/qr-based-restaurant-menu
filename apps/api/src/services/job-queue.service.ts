
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

// Default handlers. Connect real external integrations before production use.

registerJobHandler('SCHEDULED_REPORT_DISPATCH', async (payload, restaurantId) => {
  const { reportType, recipients, format } = payload;
  console.log(`[JobQueue] Report dispatch: ${reportType}, ${recipients}, ${restaurantId}`);

  return {
    success: true,
    output: {
      dispatched: true,
      reportType,
      recipients,
      format,
      timestamp: new Date().toISOString(),
    },
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
    return {
      success: false,
      error: 'restaurantId required for AI_INSIGHT_REFRESH',
    };
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
  private readonly idleBackoffSteps = [5000, 10000, 20000, 30000];
  private currentBackoffIndex = 0;
  private readonly heartbeatIntervalMs = 60_000;
  private readonly staleRecoveryIntervalMs = 180_000; // 3 minutes

  private pollTimer: NodeJS.Timeout | null = null;
  private isPolling = false;
  private stopping = false;
  private lastStaleRecoveryTime = 0;
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

  private scheduleNextPoll(delayMs?: number): void {
    if (this.stopping) return;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    const delay = delayMs ?? this.idleBackoffSteps[this.currentBackoffIndex];
    this.pollTimer = setTimeout(() => {
      this.track(this.processDueJobs());
    }, delay);
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
        // Reset backoff and trigger immediate polling cycle
        this.currentBackoffIndex = 0;
        this.scheduleNextPoll(50);
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

  // Atomically claim one due job.
  // PostgreSQL SKIP LOCKED prevents concurrent workers claiming the same row.
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

      // Renew the worker lease while the handler is executing.
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
        console.warn(
          `[JobQueue] Job ${jobId} completion skipped: lock no longer owned`
        );
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

        console.error(
          `[JobQueue] Job ${jobId} failed; retry ${newRetries}/${job.maxRetries}`
        );
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

  // Recover jobs abandoned by a crashed or disconnected worker.
  // The heartbeat renews the lease every 60 seconds.
  private async recoverStaleJobs(): Promise<void> {
    const recovered = await prisma.$executeRaw`
      UPDATE background_job_logs
      SET
        status = CASE
          WHEN retries < max_retries THEN 'PENDING'
          ELSE 'FAILED'
        END,
        retries = retries + 1,
        scheduled_for = NOW(),
        started_at = NULL,
        completed_at = CASE
          WHEN retries < max_retries THEN NULL
          ELSE NOW()
        END,
        error = 'Worker lease expired; recovered after interruption',
        locked_at = NULL,
        locked_by = NULL
      WHERE status = 'RUNNING'
        AND (
          (
            locked_at IS NOT NULL
            AND locked_at < NOW() - INTERVAL '3 minutes'
          )
          OR
          (
            locked_at IS NULL
            AND started_at < NOW() - INTERVAL '3 minutes'
          )
        )
    `;

    if (recovered > 0) {
      console.warn(`[JobQueue] Recovered ${recovered} stale job(s)`);
    }
  }

  private async processDueJobs(): Promise<void> {
    if (this.isPolling || this.stopping) return;

    this.isPolling = true;
    let processedAnyJob = false;

    try {
      // Periodically recover abandoned jobs (every 3 minutes instead of every polling cycle)
      const now = Date.now();
      if (now - this.lastStaleRecoveryTime >= this.staleRecoveryIntervalMs) {
        this.lastStaleRecoveryTime = now;
        await this.recoverStaleJobs();
      }

      // Claim one job at a time so waiting jobs do not hold stale locks.
      for (let i = 0; i < 20 && !this.stopping; i++) {
        const jobId = await this.claimJob();
        if (!jobId) break;

        processedAnyJob = true;
        await this.executeClaimedJob(jobId);
      }

      // Dynamic backoff: reset to 0 if jobs were processed, otherwise back off
      if (processedAnyJob) {
        this.currentBackoffIndex = 0;
      } else {
        this.currentBackoffIndex = Math.min(
          this.currentBackoffIndex + 1,
          this.idleBackoffSteps.length - 1
        );
      }
    } catch (error) {
      console.error('[JobQueue] Poll cycle failed:', error);
      // Back off on error to avoid hammering database under connection stress
      this.currentBackoffIndex = Math.min(
        this.currentBackoffIndex + 1,
        this.idleBackoffSteps.length - 1
      );
    } finally {
      this.isPolling = false;
      if (!this.stopping) {
        this.scheduleNextPoll();
      }
    }
  }

  start(): void {
    if (this.pollTimer) return;

    this.stopping = false;
    this.currentBackoffIndex = 0;

    console.log(
      `[JobQueue] Worker ${this.workerId} started; idle backoff [${this.idleBackoffSteps.map(s => s / 1000 + 's').join(', ')}]`
    );

    this.scheduleNextPoll(100);
  }

  async stop(): Promise<void> {
    this.stopping = true;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait up to 5 seconds for already-running work to finish before forced shutdown
    if (this.activeTasks.size > 0) {
      const waitPromise = Promise.allSettled([...this.activeTasks]);
      const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 5000));
      await Promise.race([waitPromise, timeoutPromise]);
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
