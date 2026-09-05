'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { BranchProvider } from '../../context/BranchContext';
import { UserRole } from '@qr-menu/shared';
import { ShieldAlert, Loader2 } from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  requiredRoles?: UserRole[];
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminLayout({
  children,
  title,
  subtitle,
  requiredRoles,
  onRefresh,
  isRefreshing,
}: AdminLayoutProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-xs font-semibold uppercase tracking-wider">Loading Restaurant OS...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Role verification check
  const userRole = (user?.role as UserRole) || UserRole.WAITER;
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(userRole)) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 text-center shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Your role (<strong className="text-amber-400">{userRole}</strong>) is not authorized to access this section.
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md"
          >
            Return to Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <BranchProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex overflow-x-hidden selection:bg-amber-500/30 selection:text-amber-200">
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        {/* Main Panel */}
        <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
          <AdminHeader
            title={title}
            subtitle={subtitle}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </BranchProvider>
  );
}
