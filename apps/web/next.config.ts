import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable React strict mode for development best practices
  reactStrictMode: true,

  // Allow the web app to consume the shared package directly from source
  transpilePackages: ['@qr-menu/shared'],

  // Environment variables exposed to the browser must be prefixed with NEXT_PUBLIC_
  // Server-only variables are accessed via process.env in API routes / server components
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },
};

export default nextConfig;
