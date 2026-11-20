'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type DashboardTheme = 'dark' | 'light' | 'system';

interface DashboardThemeContextType {
  theme: DashboardTheme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: DashboardTheme) => void;
}

const DashboardThemeContext = createContext<DashboardThemeContextType>({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

export function DashboardThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<DashboardTheme>('dark');
  const [systemTheme, setSystemTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('silver_sapoon_dashboard_theme') as DashboardTheme | null;
    if (saved && (saved === 'dark' || saved === 'light' || saved === 'system')) {
      setThemeState(saved);
    }

    // Detect system preference
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

      const handler = (e: MediaQueryListEvent) => {
        setSystemTheme(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, []);

  const setTheme = (newTheme: DashboardTheme) => {
    setThemeState(newTheme);
    localStorage.setItem('silver_sapoon_dashboard_theme', newTheme);
  };

  const resolvedTheme = !mounted ? 'dark' : theme === 'system' ? systemTheme : theme;

  return (
    <DashboardThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      <div data-dashboard-theme={resolvedTheme} className={resolvedTheme === 'light' ? 'dashboard-light-theme' : 'dashboard-dark-theme'}>
        {children}
      </div>
    </DashboardThemeContext.Provider>
  );
}

export function useDashboardTheme() {
  return useContext(DashboardThemeContext);
}
