import { z } from 'zod';

// ============================================================
// Environment Variable Schema
// All env vars are validated at startup. Missing or invalid
// values will throw a clear error before anything else runs.
// ============================================================

const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),

  // Database
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection URL'),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // CORS / URLs
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  API_BASE_URL: z.string().url().default('http://localhost:4000'),
  SOCKET_CORS_ORIGINS: z.string().default('http://localhost:3000'),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(8).max(20).default(12),

  // AI (placeholder — not used in Phase 1)
  AI_PROVIDER: z.enum(['gemini', 'openai', 'anthropic']).default('gemini'),
  GEMINI_API_KEY: z.string().optional(),
});

function loadEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment configuration:\n${issues}\n\n` +
        'Copy .env.example to apps/api/.env and fill in the required values.\n'
    );
  }

  return result.data;
}

/** Validated, typed environment configuration. Import this instead of process.env. */
export const env = loadEnv();

export type Env = typeof env;
