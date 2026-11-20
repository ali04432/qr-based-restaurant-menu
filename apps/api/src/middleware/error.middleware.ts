import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { sendError } from '../utils/api-response';

// ============================================================
// Central Error Handling Middleware
// Must be registered LAST in the Express middleware chain.
// Guarantees all API errors return valid JSON with proper status codes.
// ============================================================

/** Custom application error with HTTP status code */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Common pre-built errors */
export const errors = {
  notFound: (resource = 'Resource') =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  unauthorized: (message = 'Authentication required') =>
    new AppError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Insufficient permissions') =>
    new AppError(message, 403, 'FORBIDDEN'),
  badRequest: (message: string) =>
    new AppError(message, 400, 'BAD_REQUEST'),
  conflict: (message: string) =>
    new AppError(message, 409, 'CONFLICT'),
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new AppError(message, 503, 'SERVICE_UNAVAILABLE'),
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Prevent sending multiple error responses if headers were already sent
  if (res.headersSent) {
    return;
  }

  // 1. Handle JSON syntax parse error from express.json()
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Malformed JSON payload in request body');
    return;
  }

  // 2. Handle Zod validation errors
  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', {
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // 3. Handle known application errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // 4. Handle Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002': {
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(', ')
          : String(err.meta?.target || 'record');
        sendError(res, 409, 'RESOURCE_EXISTS', `A record with this ${target} already exists.`);
        return;
      }
      case 'P2025':
        sendError(res, 404, 'NOT_FOUND', 'The requested database record does not exist.');
        return;
      case 'P2003':
        sendError(res, 400, 'FOREIGN_KEY_VIOLATION', 'A database foreign-key constraint was violated.');
        return;
      case 'P2024':
        console.error('[Prisma Connection Timeout]', err.message);
        sendError(
          res,
          503,
          'DATABASE_UNAVAILABLE',
          'Database connection pool timed out. Please try again in a few moments.'
        );
        return;
      case 'P1001':
      case 'P1017':
        console.error('[Prisma DB Unreachable]', err.message);
        sendError(
          res,
          503,
          'DATABASE_UNAVAILABLE',
          'Database service is temporarily unreachable. Please retry shortly.'
        );
        return;
      default:
        console.error(`[Prisma Error ${err.code}]`, err.message);
        sendError(
          res,
          500,
          'DATABASE_ERROR',
          process.env.NODE_ENV === 'production'
            ? 'A database error occurred'
            : err.message
        );
        return;
    }
  }

  // 5. Handle Prisma Initialization Errors (e.g. invalid connection string / network down)
  if (err instanceof Prisma.PrismaClientInitializationError) {
    console.error('[Prisma Initialization Error]', err.message);
    sendError(
      res,
      503,
      'DATABASE_UNAVAILABLE',
      'Database connection could not be established. Please retry shortly.'
    );
    return;
  }

  // 6. Handle unknown / unexpected errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message || 'An unexpected error occurred';

  console.error('[Unhandled Error]', err);
  sendError(res, statusCode, 'INTERNAL_ERROR', message);
}
