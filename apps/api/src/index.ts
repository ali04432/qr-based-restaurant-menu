// Load environment variables FIRST — before any other imports
import 'dotenv/config';

// Now import modules that depend on env
import http from 'http';
import { env } from './config/env';
import { createApp } from './app';
import { initSocketServer } from './socket/socket.server';
import { prisma } from './config/database';

// ============================================================
// Server Entry Point
// ============================================================

async function bootstrap(): Promise<void> {
  // Create Express app
  const app = createApp();

  // Wrap in HTTP server so Socket.io can share the port
  const httpServer = http.createServer(app);

  // Initialize Socket.io
  initSocketServer(httpServer);

  // Start listening
  httpServer.listen(env.PORT, () => {
    console.log('');
    console.log('╔════════════════════════════════════════╗');
    console.log('║     QR Restaurant Menu API Server      ║');
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Port:        ${env.PORT}                       ║`);
    console.log(`║  Environment: ${env.NODE_ENV.padEnd(24)} ║`);
    console.log(`║  Health:      /api/health              ║`);
    console.log('╚════════════════════════════════════════╝');
    console.log('');
  });

  // ── Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.log(`\n[${signal}] Shutting down gracefully...`);
    httpServer.close(async () => {
      await prisma.$disconnect();
      console.log('[Server] Closed. Goodbye.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // ── Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error('[Unhandled Rejection]', reason);
  });

  process.on('uncaughtException', (err) => {
    console.error('[Uncaught Exception]', err);
    process.exit(1);
  });
}

// Start the server
bootstrap().catch((err) => {
  console.error('[Bootstrap Error]', err);
  process.exit(1);
});
