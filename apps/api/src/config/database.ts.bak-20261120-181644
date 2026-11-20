import { PrismaClient } from '@prisma/client';
import { env } from './env';

// ============================================================
// Prisma Client Singleton
// In development, we reuse a single instance across hot reloads
// to avoid exhausting the PostgreSQL connection pool.
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      env.NODE_ENV === 'development'
        ? ['query', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export const prisma: PrismaClient =
  env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

export default prisma;
