'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../context/AuthContext';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-6 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            Your role (<strong className="text-slate-900">{userRole}</strong>) is not authorized to access this section.
          </p>
          <button
            type="button"
            onClick={() => router.push('/admin')}
            className="w-full py-2 px-4 bg-slate-900 text-white rounded-md text-xs font-semibold hover:bg-slate-800 transition"
          >
            Return to Authorized Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex overflow-x-hidden">
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
  );
}
