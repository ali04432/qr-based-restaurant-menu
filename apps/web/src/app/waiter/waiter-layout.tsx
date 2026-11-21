'use client';

import React, { useState, useRef } from 'react';
import {
  LayoutGrid,
  ClipboardList,
  Bell,
  Receipt,
  User,
  LogOut,
  Menu,
  X,
  Wifi,
  WifiOff,
  Loader2,
} from 'lucide-react';

// ============================================================
// Silver Sapoon — Waiter-Specific Layout
// Design: #0B0B0D bg, #0F0F12 sidebar, #D6A84F gold accent
// ============================================================

export type WaiterSection = 'tables' | 'orders' | 'ready' | 'bills' | 'profile';

interface NavItem {
  id: WaiterSection;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeUrgent?: boolean;
}

interface WaiterLayoutProps {
  children: React.ReactNode;
  activeSection: WaiterSection;
  onSectionChange: (s: WaiterSection) => void;
  badgeCounts: {
    orders: number;
    ready: number;
    bills: number;
  };
  userName: string;
  userRole: string;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  soundEnabled: boolean;
  onToggleSound: () => void;
  sectionTitle: string;
  sectionSubtitle: string;
}

export function WaiterLayout({
  children,
  activeSection,
  onSectionChange,
  badgeCounts,
  userName,
  userRole,
  connectionStatus,
  soundEnabled,
  onToggleSound,
  sectionTitle,
  sectionSubtitle,
}: WaiterLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      id: 'tables',
      label: 'Tables',
      icon: <LayoutGrid className="w-5 h-5" />,
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: <ClipboardList className="w-5 h-5" />,
      badge: badgeCounts.orders || undefined,
    },
    {
      id: 'ready',
      label: 'Ready to Serve',
      icon: <Bell className="w-5 h-5" />,
      badge: badgeCounts.ready || undefined,
      badgeUrgent: badgeCounts.ready > 0,
    },
    {
      id: 'bills',
      label: 'Bills',
      icon: <Receipt className="w-5 h-5" />,
      badge: badgeCounts.bills || undefined,
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User className="w-5 h-5" />,
    },
  ];

  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const ConnDot = () => {
    if (connectionStatus === 'connected')
      return <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Live" />;
    if (connectionStatus === 'connecting')
      return <Loader2 className="w-3 h-3 text-amber-400 animate-spin inline-block" />;
    return <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="Disconnected" />;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="px-6 pt-6 pb-5 border-b border-[#1F1F24]">
        <div className="flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold tracking-wide"
              style={{ color: '#D6A84F', fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              Silver Sapoon
            </h1>
            <p className="text-[11px] mt-0.5" style={{ color: '#A39F96' }}>
              Waiter Panel · Live service
            </p>
          </div>
          {/* Mobile close */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-[#A39F96] hover:text-white p-1 rounded-lg hover:bg-[#1D1D21]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSectionChange(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group relative ${
                isActive
                  ? 'text-[#F4EFE6]'
                  : 'text-[#A39F96] hover:text-[#F4EFE6] hover:bg-[#1D1D21]'
              }`}
              style={
                isActive
                  ? {
                      background:
                        'linear-gradient(135deg, rgba(214,168,79,0.15) 0%, rgba(214,168,79,0.05) 100%)',
                      borderLeft: '2px solid #D6A84F',
                    }
                  : {}
              }
            >
              <span style={isActive ? { color: '#D6A84F' } : {}}>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
                  style={
                    item.badgeUrgent
                      ? { background: '#D6A84F', color: '#0B0B0D' }
                      : { background: '#26262B', color: '#A39F96' }
                  }
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom: Profile & Sound */}
      <div className="px-4 pb-5 border-t border-[#1F1F24] pt-4 space-y-3">
        {/* Sound toggle */}
        <button
          onClick={onToggleSound}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all"
          style={{
            background: soundEnabled ? 'rgba(214,168,79,0.1)' : 'rgba(38,38,43,0.5)',
            color: soundEnabled ? '#D6A84F' : '#A39F96',
            border: `1px solid ${soundEnabled ? 'rgba(214,168,79,0.3)' : '#26262B'}`,
          }}
        >
          <Bell className="w-4 h-4" />
          <span>{soundEnabled ? 'Sound: On' : 'Sound: Off'}</span>
        </button>

        {/* User card */}
        <div
          className="flex items-center gap-3 p-3 rounded-xl"
          style={{ background: '#151518', border: '1px solid #26262B' }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#D6A84F', color: '#0B0B0D' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F4EFE6] truncate">{userName}</p>
            <p className="text-[10px] text-[#A39F96] truncate">{userRole}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <ConnDot />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B0B0D' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col flex-shrink-0 w-[248px] h-full overflow-hidden"
        style={{ background: '#0F0F12', borderRight: '1px solid #1F1F24' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside
            className="relative flex flex-col w-[248px] h-full z-10"
            style={{ background: '#0F0F12', borderRight: '1px solid #1F1F24' }}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className="flex-shrink-0 flex items-center gap-4 px-5 py-3.5"
          style={{
            background: '#0F0F12',
            borderBottom: '1px solid #1F1F24',
          }}
        >
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-[#A39F96] hover:text-white p-1.5 rounded-lg hover:bg-[#1D1D21]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <h2
              className="text-base font-semibold truncate"
              style={{ color: '#F4EFE6', fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {sectionTitle}
            </h2>
            <p className="text-[11px] text-[#A39F96] truncate hidden sm:block">{sectionSubtitle}</p>
          </div>

          {/* Connection status text */}
          <div className="hidden sm:flex items-center gap-1.5 text-[11px]" style={{ color: '#A39F96' }}>
            {connectionStatus === 'connected' ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Live</span>
              </>
            ) : connectionStatus === 'connecting' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span className="text-amber-400">Connecting</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-400">Offline</span>
              </>
            )}
          </div>

          {/* Avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: '#D6A84F', color: '#0B0B0D' }}
          >
            {initials}
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
