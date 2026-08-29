import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';

import './globals.css';

import { TableProvider } from '../context/TableContext';
import { CartProvider } from '../context/CartContext';
import { FavoritesProvider } from '../context/FavoritesContext';
import { AuthProvider } from '../context/AuthContext';
import { ThemeProvider } from '../context/ThemeContext';

export const metadata: Metadata = {
  title: {
    default: 'Silver Sapoon',
    template: '%s | Silver Sapoon',
  },
  description:
    'Scan, order, and track — a seamless QR-based restaurant dining experience.',
  keywords: [
    'restaurant',
    'QR menu',
    'digital menu',
    'online ordering',
    'food ordering',
    'Silver Sapoon',
  ],
  authors: [{ name: 'Silver Sapoon' }],
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#08090B',
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-bg-page text-text-primary antialiased">
        <Suspense
          fallback={
            <div className="flex min-h-screen items-center justify-center bg-bg-page text-text-primary">
              Loading app...
            </div>
          }
        >
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