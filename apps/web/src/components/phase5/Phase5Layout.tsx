'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Utensils,
  LayoutDashboard,
  Grid,
  ClipboardList,
  History,
  Bell,
  CreditCard,
  Receipt,
  BarChart3,
  LogOut,
  Sparkles,
  Wifi,
  WifiOff,
  User,
  ChefHat,
  ShieldCheck,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { RealtimeActivityBar } from './RealtimeActivityBar';
import { OperationalAiAssistant } from './OperationalAiAssistant';

interface Phase5LayoutProps {
  role: 'WAITER' | 'CASHIER';
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export function Phase5Layout({
  role,
  title,
  subtitle,
  headerAction,
  children,
}: Phase5LayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout, quickWaiterLogin, quickCashierLogin } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [aiOpen, setAiOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { isConnected } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  const waiterNav = [
    { label: 'Dashboard', href: '/waiter', icon: LayoutDashboard },
    { label: 'Tables', href: '/waiter/tables', icon: Grid },
    { label: 'Orders', href: '/waiter/orders', icon: ClipboardList },
    { label: 'History', href: '/waiter/history', icon: History },
    { label: 'Alerts', href: '/waiter/notifications', icon: Bell },
  ];

  const cashierNav = [
    { label: 'Dashboard', href: '/cashier', icon: LayoutDashboard },
    { label: 'Billing', href: '/cashier/orders', icon: ClipboardList },
    { label: 'Payments', href: '/cashier/payments', icon: CreditCard },
    { label: 'Ledger', href: '/cashier/transactions', icon: Receipt },
    { label: 'Reports', href: '/cashier/reports', icon: BarChart3 },
  ];

  const navItems = role === 'WAITER' ? waiterNav : cashierNav;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="flex flex-1 pb-10">
        {/* Fixed Compact Luxury Sidebar (150px width) */}
        <aside className="w-36 sm:w-44 flex-shrink-0 bg-slate-950 border-r border-slate-800/80 flex flex-col justify-between select-none">
          <div>
            {/* Brand Header */}
            <div className="p-4 border-b border-slate-800/60 flex flex-col items-center text-center">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 mb-2">
                <Utensils className="w-5 h-5 stroke-[2.5]" />
              </div>
              <h1 className="text-xs font-bold tracking-wider uppercase text-white font-serif">
                Silver Sapoon
              </h1>
              <span className="text-[10px] uppercase font-semibold tracking-widest text-amber-400 mt-0.5 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                {role === 'WAITER' ? 'Captain POS' : 'Cashier POS'}
              </span>
            </div>

            {/* Navigation Menu */}
            <nav className="p-2 space-y-1 mt-2">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Main Menu
              </div>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm shadow-amber-500/10 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Role Switcher Links */}
            <div className="p-2 mt-4 border-t border-slate-800/60 space-y-1">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Quick Switch
              </div>
              {role === 'WAITER' ? (
                <Link
                  href="/cashier"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:text-amber-300 hover:bg-slate-900/60 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Cashier Panel</span>
                </Link>
              ) : (
                <Link
                  href="/waiter"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:text-amber-300 hover:bg-slate-900/60 transition-colors"
                >
                  <Utensils className="w-3.5 h-3.5 text-amber-400" />
                  <span>Waiter Panel</span>
                </Link>
              )}
              <Link
                href="/kds"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:text-emerald-300 hover:bg-slate-900/60 transition-colors"
              >
                <ChefHat className="w-3.5 h-3.5 text-emerald-400" />
                <span>Chef KDS</span>
              </Link>
              <Link
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-slate-400 hover:text-blue-300 hover:bg-slate-900/60 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                <span>Admin OS</span>
              </Link>
            </div>
          </div>

          {/* User & Session Footer */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/70">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 text-xs font-bold">
                  {user?.name?.[0] || (role === 'WAITER' ? 'W' : 'C')}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-semibold text-white truncate">{user?.name || (role === 'WAITER' ? 'Captain' : 'Cashier')}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{role.toLowerCase()}</p>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Utility Bar */}
          <header className="h-16 px-6 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 flex items-center justify-between sticky top-0 z-30">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="text-[11px] font-medium text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Silver Sapoon POS
                </span>
              </h2>
              {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
            </div>

            {/* Right Utilities */}
            <div className="flex items-center gap-3">
              {/* Optional page-specific action button (e.g. + Add Walk-in Order) */}
              {headerAction}

              {/* Connection Status Badge */}
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium">
                {isConnected ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-emerald-400">Online</span>
                  </>
                ) : (
                  <>
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span className="text-rose-400">Offline</span>
                  </>
                )}
              </div>

              {/* AI Operational Assistant Button */}
              <button
                onClick={() => setAiOpen(!aiOpen)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-semibold shadow-md shadow-amber-500/10 transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">AI Assistant</span>
              </button>

              {/* Dev Role Quick Switcher */}
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 text-xs transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden lg:inline font-medium">Dev Switch</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 mb-1">
                      Dev Fast Login
                    </div>
                    <button
                      onClick={() => {
                        quickWaiterLogin(restaurantId);
                        setProfileOpen(false);
                        router.push('/waiter');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-500/15 hover:text-amber-300 transition-colors flex items-center justify-between"
                    >
                      <span>Captain (Waiter)</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Switch</span>
                    </button>
                    <button
                      onClick={() => {
                        quickCashierLogin(restaurantId);
                        setProfileOpen(false);
                        router.push('/cashier');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs hover:bg-amber-500/15 hover:text-amber-300 transition-colors flex items-center justify-between"
                    >
                      <span>Cashier POS</span>
                      <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded">Switch</span>
                    </button>
                    <div className="border-t border-slate-800 my-1"></div>
                    <button
                      onClick={() => {
                        logout();
                        setProfileOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Main Body */}
          <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>

      {/* Floating Operational AI Assistant Modal */}
      <OperationalAiAssistant
        role={role}
        token={token}
        isOpen={aiOpen}
        onClose={() => setAiOpen(false)}
      />

      {/* Real-time Bottom Activity Bar */}
      <RealtimeActivityBar />
    </div>
  );
}
