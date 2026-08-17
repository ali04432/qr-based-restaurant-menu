import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { loggerMiddleware } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';
import apiRouter from './routes';

// ============================================================
// Express Application Setup
// ============================================================

export function createApp(): Application {
  const app = express();

  // ── Security headers
  app.use(helmet());

  // ── CORS — allow the web frontend origin
  app.use(
    cors({
      origin: env.NEXT_PUBLIC_APP_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request logging
  app.use(loggerMiddleware);

  // ── API routes
  app.use('/api', apiRouter);

  // ── 404 catch-all for unknown routes
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      statusCode: 404,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested endpoint does not exist',
      },
    });
  });

  // ── Central error handler — must be last
  app.use(errorMiddleware);

  return app;
}
