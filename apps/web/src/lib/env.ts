// ============================================================
// Public Environment Configuration (Browser-safe)
// Only NEXT_PUBLIC_ prefixed variables are accessible here.
// Never put secrets in this file.
// ============================================================

function requirePublicEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(
      `Missing required public environment variable: ${key}\n` +
        'Check your .env file and ensure it starts with NEXT_PUBLIC_.'
    );
  }
  return value;
}

export const publicEnv = {
  appUrl: requirePublicEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  apiBaseUrl: requirePublicEnv('NEXT_PUBLIC_API_BASE_URL', 'http://localhost:4000'),
} as const;

export type PublicEnv = typeof publicEnv;
