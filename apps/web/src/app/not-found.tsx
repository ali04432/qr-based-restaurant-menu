import React from 'react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-page text-text-primary p-4">
      <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
      <p className="text-text-muted mb-6">The page you are looking for does not exist.</p>
      <a
        href="/"
        className="px-6 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors"
      >
        Return Home
      </a>
    </div>
  );
}

