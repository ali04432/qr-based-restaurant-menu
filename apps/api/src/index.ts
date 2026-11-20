// Load environment variables FIRST — before any other imports
import 'dotenv/config';

// Now import modules that depend on env
import http from 'http';
import { env } from './config/env';
import { createApp } from './app';
import { initSocketServer, closeSocketServer } from './socket/socket.server';
import { prisma } from './config/database';
import { jobQueue } from './services/job-queue.service';

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

    // Start background job queue
    jobQueue.start();
  });

  // ── Graceful shutdown
  let isShuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n[${signal}] Shutting down gracefully...`);

    // Safety timeout to prevent hanging on open connections
    const forceExitTimer = setTimeout(() => {
      console.warn('[Server] Force shutdown timeout reached after 10s. Exiting.');
      process.exit(1);
    }, 10000);
    forceExitTimer.unref();

    try {
      // 1. Stop background worker polling & wait for in-flight tasks
      await jobQueue.stop();

      // 2. Close Socket.io server & connected sockets
      await closeSocketServer();

      // 3. Stop accepting new HTTP requests & close server
      await new Promise<void>((resolve) => {
        httpServer.close((err) => {
          if (err) console.error('[Server] Error closing HTTP server:', err);
          resolve();
        });
      });

      // 4. Disconnect Prisma client
      await prisma.$disconnect();
      console.log('[Server] Disconnected database. Goodbye.');
      clearTimeout(forceExitTimer);
      process.exit(0);
    } catch (err) {
      console.error('[Server] Error during graceful shutdown:', err);
      process.exit(1);
    }
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
