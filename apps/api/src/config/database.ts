import { PrismaClient, Prisma } from '@prisma/client';
import { env } from './env';

// ============================================================
// Prisma Client Singleton
// Ensures exactly ONE shared instance across application modules
// and development hot-reloads to prevent connection pool exhaustion.
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  const logLevels: Prisma.LogLevel[] =
    process.env.PRISMA_LOG_QUERIES === 'true'
      ? ['query', 'warn', 'error']
      : ['warn', 'error'];

  return new PrismaClient({
    log: logLevels,
  });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? (globalThis.__prisma = createPrismaClient());

// Keep default export for backwards compatibility
export default prisma;

// Transient connection error codes suitable for safe retry
const TRANSIENT_PRISMA_CODES = new Set([
  'P2024', // Timed out fetching a new connection from the pool
  'P1001', // Can't reach database server
  'P1017', // Server has closed the connection
]);

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = (error as { code?: string }).code;
  if (code && TRANSIENT_PRISMA_CODES.has(code)) {
    return true;
  }

  const message = (error as { message?: string }).message || '';
  return (
    message.includes('Timed out fetching a new connection') ||
    message.includes('connection pool') ||
    message.includes('Connection terminated unexpectedly')
  );
}

/**
 * Safe, bounded retry for idempotent database read operations only.
 * NEVER use this for non-idempotent writes (order creation, payments, settlements).
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    opName?: string;
  } = {}
): Promise<T> {
  const { maxRetries = 2, initialDelayMs = 150, opName = 'db_operation' } = options;

  let attempt = 0;
  while (true) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt > maxRetries || !isTransientDbError(error)) {
        throw error;
      }

      // Exponential backoff with jitter
      const jitter = Math.floor(Math.random() * 50);
      const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
      console.warn(
        `[PrismaRetry] Transient DB error in ${opName} (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
}
