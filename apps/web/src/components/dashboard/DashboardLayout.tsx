'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../context/AuthContext';
import { DashboardThemeProvider, useDashboardTheme } from './DashboardThemeContext';
import { DashboardSidebar } from './DashboardSidebar';
import { UserRole } from '@qr-menu/shared';
import { Loader2, ShieldAlert } from 'lucide-react';

interface DashboardLayoutProps {
  children: (props: { sidebarOpen: boolean; setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>> }) => React.ReactNode;
}

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex flex-col items-center justify-center text-[#A1A1AA] gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#F5B342]" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Loading Silver Sapoon OS...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userRole = (user?.role as UserRole) || UserRole.WAITER;
  const allowedRoles = [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER];
  if (!allowedRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-[#08090B] text-[#F8FAFC] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#15171A] border border-[#25282D] rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs text-[#A1A1AA] mt-1 mb-4">
            Your role (<strong className="text-[#F5B342]">{userRole}</strong>) does not have
            executive dashboard permissions.
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="w-full py-2.5 px-4 bg-[#F5B342] hover:bg-[#D6A84F] text-[#08090B] rounded-xl text-xs font-bold transition shadow-md"
          >
            Return to Authorized View
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen flex overflow-x-hidden selection:bg-[#F5B342]/30 selection:text-[#F5B342] transition-colors duration-200 ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#08090B] text-[#F8FAFC]'
      }`}
    >
      {/* Sidebar */}
      <DashboardSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {children({ sidebarOpen, setSidebarOpen })}
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardThemeProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardThemeProvider>
  );
}
