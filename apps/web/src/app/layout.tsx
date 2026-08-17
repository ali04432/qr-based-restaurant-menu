import type { Metadata, Viewport } from 'next';
import './globals.css';

// ============================================================
// Root Layout
// Wraps all pages with global providers and HTML skeleton.
// Individual page layouts are nested inside this via children.
// ============================================================

export const metadata: Metadata = {
  title: {
    default: 'QR Restaurant Menu',
    template: '%s | QR Restaurant Menu',
  },
  description:
    'Scan, order, and track — a seamless QR-based digital menu experience for modern restaurants.',
  keywords: ['restaurant', 'QR menu', 'digital menu', 'online ordering', 'food ordering'],
  authors: [{ name: 'QR Restaurant Menu' }],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f97316',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        {/* 
          Future providers go here (e.g., React Query, Toast, Auth context).
          Keep this layout minimal — add providers incrementally in later phases. 
        */}
        {children}
      </body>
    </html>
  );
}
