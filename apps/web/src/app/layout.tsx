import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import './globals.css';
import { TableProvider } from '../context/TableContext';
import { CartProvider } from '../context/CartContext';
import { FavoritesProvider } from '../context/FavoritesContext';

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
  themeColor: '#0c0c0e', // Dark theme color
};

interface RootLayoutProps {
  children: React.ReactNode;
}

import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-page text-text-primary antialiased">
        <Suspense fallback={<div>Loading app...</div>}>
          <ThemeProvider>
            <AuthProvider>
              <TableProvider>
                <CartProvider>
                  <FavoritesProvider>
                    {children}
                  </FavoritesProvider>
                </CartProvider>
              </TableProvider>
            </AuthProvider>
          </ThemeProvider>
        </Suspense>
      </body>
    </html>
  );
}
