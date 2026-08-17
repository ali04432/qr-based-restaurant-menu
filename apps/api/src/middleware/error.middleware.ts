import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/api-response';

// ============================================================
// Central Error Handling Middleware
// Must be registered LAST in the Express middleware chain.
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
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Handle Zod validation errors
  if (err instanceof ZodError) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', {
      issues: err.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  // Handle known application errors
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Handle unknown / unexpected errors
  const statusCode = 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;

  console.error('[Unhandled Error]', err);
  sendError(res, statusCode, 'INTERNAL_ERROR', message);
}
