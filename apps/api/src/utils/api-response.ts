import { ApiResponse, ApiErrorResponse } from '@qr-menu/shared';
import { Response } from 'express';

// ============================================================
// Standardized API Response Helpers
// ============================================================

/**
 * Send a 200 success response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  options: { message?: string; statusCode?: number } = {}
): Response {
  const { message, statusCode = 200 } = options;
  const body: ApiResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
  };
  return res.status(statusCode).json(body);
}

/**
 * Send a 201 Created response.
 */
export function sendCreated<T>(res: Response, data: T, message?: string): Response {
  return sendSuccess(res, data, { message, statusCode: 201 });
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
): Response {
  const body: ApiErrorResponse = {
    success: false,
    statusCode,
    error: {
      code,
      message,
      ...(details !== undefined && { details }),
    },
  };
  return res.status(statusCode).json(body);
}
