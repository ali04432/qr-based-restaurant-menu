'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// ============================================================
// React Error Boundary
// Catches unhandled JavaScript errors in component trees.
// Prevents the entire app from crashing on render errors.
// ============================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI. Receives the error and a reset function. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In production, send to an error monitoring service (e.g., Sentry)
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, this.handleReset);
      }

      // Default fallback UI
      return (
        <div
          className="min-h-[200px] flex flex-col items-center justify-center gap-4 p-8 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">
              {process.env.NODE_ENV === 'development' ? error.message : 'Please try again.'}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="btn-primary"
            id="error-boundary-reset"
          >
            Try again
          </button>
        </div>
      );
    }

    return children;
  }
}

export default ErrorBoundary;
