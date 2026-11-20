'use client';

import React, { useState } from 'react';
import { CashierSidebar } from './CashierSidebar';
import { CashierHeader } from './CashierHeader';
import { OperationalAiAssistant } from '../phase5/OperationalAiAssistant';
import { RealtimeActivityBar } from '../phase5/RealtimeActivityBar';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';

interface CashierShellProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function CashierShell({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  headerAction,
  children,
}: CashierShellProps) {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const { isConnected } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  return (
    <div
      className="min-h-screen text-[#F8FAFC] flex font-sans selection:bg-[#F5B342] selection:text-[#08090B] relative"
      style={{
        background:
          'radial-gradient(720px 260px at 92% 0%, rgba(245,179,66,0.10), transparent 70%), #08090B',
      }}
    >
      {/* 232px Sidebar */}
      <CashierSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 box-border p-[20px_16px] sm:p-[24px_28px] pb-16 flex flex-col gap-[20px]">
        {/* Unified Header */}
        <CashierHeader
          title={title}
          subtitle={subtitle}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          isConnected={isConnected}
          onToggleAi={() => setAiOpen(!aiOpen)}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          headerAction={headerAction}
        />

        {/* Page Content Body */}
        <div className="flex-1 flex flex-col gap-[20px]">
          {children}
        </div>
      </main>

      {/* Floating Operational AI Assistant Modal */}
      <OperationalAiAssistant
        role="CASHIER"
        token={token}
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
      />

      {/* Real-time Activity Bar */}
      <RealtimeActivityBar />
    </div>
  );
}
