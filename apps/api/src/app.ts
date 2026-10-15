import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
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
  // Note: only tighten CSP if a real browser CSP error is observed.
  app.use(helmet());

  // ── CORS — allow the web frontend and any extra tunnel origins
  const allowedOrigins = [
    env.NEXT_PUBLIC_APP_URL,
    ...(process.env.CORS_EXTRA_ORIGINS ?? '')
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        // Also allow any *.trycloudflare.com and *.ngrok-free.app tunnel URLs
        if (/\.(trycloudflare\.com|ngrok-free\.app|ngrok\.io)$/.test(origin)) {
          return callback(null, true);
        }
        callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ── Request parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Static file serving for 3D models
  // Models in public/models/ are served with correct MIME types and CORS.
  // Mounted under both /models and /api/models for single-tunnel routing.
  const publicModelsDir = path.join(__dirname, '..', 'public', 'models');
  const staticModelOptions = {
    setHeaders(res: Response, filePath: string) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.glb') {
        res.setHeader('Content-Type', 'model/gltf-binary');
      } else if (ext === '.usdz') {
        res.setHeader('Content-Type', 'model/vnd.usdz+zip');
      }
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  };

  app.use('/models', express.static(publicModelsDir, staticModelOptions));
  app.use('/api/models', express.static(publicModelsDir, staticModelOptions));

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

