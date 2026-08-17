import morgan from 'morgan';
import { env } from '../config/env';

// ============================================================
// Request Logger Middleware
// Uses 'dev' format in development (colored, compact)
// and 'combined' (Apache-style) in production for log aggregators.
// ============================================================

export const loggerMiddleware = morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev');
