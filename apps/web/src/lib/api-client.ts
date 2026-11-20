import { ApiResponse, ApiErrorResponse } from '@qr-menu/shared';

// ============================================================
// Typed API Client
// A robust fetch wrapper that safely handles JSON parsing,
// status codes, Content-Type headers, network errors, and auth.
// ============================================================

class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  /** JWT access token — if provided, adds Authorization: Bearer header */
  token?: string;
}

const BASE_URL =
  typeof window === 'undefined'
    ? (process.env.API_BASE_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_API_BASE_URL ?? '');

/**
 * Core fetch wrapper with safe response parsing and structured error handling.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(customHeaders as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers,
      ...rest,
    });
  } catch (networkError) {
    const message = networkError instanceof Error ? networkError.message : 'Network error';
    throw new ApiError(0, 'NETWORK_ERROR', `Unable to connect to server: ${message}`);
  }

  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');

  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    rawText = '';
  }

  let parsedBody: any = null;
  if (isJson && rawText.trim().length > 0) {
    try {
      parsedBody = JSON.parse(rawText);
    } catch {
      parsedBody = null;
    }
  }

  if (!response.ok) {
    const defaultMessages: Record<number, { code: string; message: string }> = {
      400: { code: 'BAD_REQUEST', message: 'Invalid request' },
      401: { code: 'UNAUTHORIZED', message: 'Authentication required. Please sign in.' },
      403: { code: 'FORBIDDEN', message: 'You do not have permission to perform this action.' },
      404: { code: 'NOT_FOUND', message: 'Requested resource was not found.' },
      409: { code: 'CONFLICT', message: 'Conflict with existing data.' },
      422: { code: 'UNPROCESSABLE_ENTITY', message: 'Validation failed.' },
      500: { code: 'INTERNAL_ERROR', message: 'Internal server error. Please try again.' },
      502: { code: 'BAD_GATEWAY', message: 'Server is temporarily unavailable. Please retry.' },
      503: { code: 'SERVICE_UNAVAILABLE', message: 'Database or service temporarily unavailable. Please retry shortly.' },
      504: { code: 'GATEWAY_TIMEOUT', message: 'Server response timed out. Please retry.' },
    };

    const statusDefaults = defaultMessages[response.status] || {
      code: `HTTP_${response.status}`,
      message: `Request failed with status ${response.status}`,
    };

    const errorCode =
      parsedBody?.code ||
      parsedBody?.error?.code ||
      statusDefaults.code;

    const errorMessage =
      parsedBody?.message ||
      parsedBody?.error?.message ||
      (typeof parsedBody === 'string' && parsedBody.trim().length > 0 ? parsedBody : '') ||
      (rawText && rawText.length < 200 && !rawText.includes('<html') ? rawText : '') ||
      statusDefaults.message;

    const errorDetails = parsedBody?.details || parsedBody?.error?.details;

    throw new ApiError(response.status, errorCode, errorMessage, errorDetails);
  }

  // Handle successful empty response (e.g. 204 No Content)
  if (!rawText || rawText.trim().length === 0) {
    return undefined as unknown as T;
  }

  if (parsedBody && typeof parsedBody === 'object') {
    if ('data' in parsedBody) {
      return parsedBody.data as T;
    }
    return parsedBody as T;
  }

  return rawText as unknown as T;
}

/** Typed HTTP method helpers */
export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'GET', ...options }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    }),

  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
      ...options,
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { method: 'DELETE', ...options }),
};

export { ApiError };
