// ============================================================
// Generic API Response Types
// ============================================================

/** Standard success response envelope */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
  meta?: ResponseMeta;
}

/** Standard error response envelope */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  statusCode: number;
}

/** Metadata for paginated responses */
export interface ResponseMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Paginated data wrapper */
export interface PaginatedResponse<T> {
  items: T[];
  meta: ResponseMeta;
}

/** Health check response */
export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  version: string;
  timestamp: string;
  uptime: number;
  environment: string;
}

/** Common query params for list endpoints */
export interface PaginationQuery {
  page?: number;
  limit?: number;
}
