
import { PrismaClient } from '@prisma/client';
import { env } from './env';

// ============================================================
// Prisma Client Singleton
// Reuse one instance during development hot reloads.
// Keep database warnings and errors visible.
// ============================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: ['warn', 'error'],
  });
}

export const prisma: PrismaClient =
  env.NODE_ENV === 'production'
    ? createPrismaClient()
    : (global.__prisma ?? (global.__prisma = createPrismaClient()));

export default prisma;
