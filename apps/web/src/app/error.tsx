'use client';

import React from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page text-text-primary p-4">
      <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
      <p className="text-text-muted mb-6">{error.message || 'An unexpected error occurred'}</p>
      <button
        onClick={() => reset()}
        className="px-6 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

