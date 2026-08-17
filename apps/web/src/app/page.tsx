import type { Metadata } from 'next';

// ============================================================
// Foundation Landing Page (Phase 1 Placeholder)
// This is a minimal placeholder page confirming the Next.js
// foundation is working. The real customer UI is Phase 2.
// ============================================================

export const metadata: Metadata = {
  title: 'QR Restaurant Menu — Platform',
  description: 'Multi-tenant restaurant QR ordering platform.',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100 flex items-center justify-center">
      <div className="page-container">
        <div className="max-w-2xl mx-auto text-center py-24 animate-fade-in">

          {/* Logo mark */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-brand-500 shadow-lg mb-8">
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75z"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
            QR Restaurant Menu
          </h1>

          {/* Sub-heading */}
          <p className="text-xl text-gray-500 mb-10 leading-relaxed">
            Multi-tenant restaurant QR ordering platform.
            <br />
            <span className="text-brand-500 font-semibold">Phase 1 Foundation</span> — successfully initialized.
          </p>

          {/* Status badges */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
            {[
              { label: 'Next.js 14', color: 'bg-gray-900 text-white' },
              { label: 'Express API', color: 'bg-green-100 text-green-800' },
              { label: 'PostgreSQL', color: 'bg-blue-100 text-blue-800' },
              { label: 'Prisma ORM', color: 'bg-indigo-100 text-indigo-800' },
              { label: 'Socket.io', color: 'bg-yellow-100 text-yellow-800' },
              { label: 'Multi-Tenant', color: 'bg-brand-100 text-brand-800' },
            ].map((badge) => (
              <span
                key={badge.label}
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}
              >
                {badge.label}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/health"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary"
              id="health-check-link"
            >
              Check API Health
            </a>
            <a
              href="https://github.com/ali04432/qr-based-restaurant-menu"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              id="github-link"
            >
              View Repository
            </a>
          </div>

          {/* Phase notice */}
          <p className="mt-12 text-sm text-gray-400">
            Phase 2 — Customer QR Ordering UI coming next.
          </p>
        </div>
      </div>
    </main>
  );
}
