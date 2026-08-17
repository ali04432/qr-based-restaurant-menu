import { ApiResponse, ApiErrorResponse } from '@qr-menu/shared';

// ============================================================
// Typed API Client
// A thin fetch wrapper that handles auth headers, base URL,
// and response parsing consistently across all API calls.
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
    ? (process.env.API_BASE_URL ?? 'http://localhost:4000')
    : (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000');

/**
 * Core fetch wrapper with typed responses and error handling.
 */
async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { token, headers: customHeaders, ...rest } = options;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(customHeaders as Record<string, string>),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    headers,
    ...rest,
  });

  const json = await response.json();

  if (!response.ok) {
    const errorBody = json as ApiErrorResponse;
    throw new ApiError(
      response.status,
      errorBody.error?.code ?? 'UNKNOWN_ERROR',
      errorBody.error?.message ?? 'An unexpected error occurred',
      errorBody.error?.details
    );
  }

  return (json as ApiResponse<T>).data;
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
