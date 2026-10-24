/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@qr-menu/shared'],
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Proxy /api/* and /models/* to the backend API server.
  // This enables single-tunnel phone AR testing without 404s for uploaded 3D assets.
  async rewrites() {
    const apiInternal = process.env.API_INTERNAL_URL ?? process.env.API_BASE_URL ?? 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiInternal}/api/:path*`,
      },
      {
        source: '/models/:path*',
        destination: `${apiInternal}/models/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;