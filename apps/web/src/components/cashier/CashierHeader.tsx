'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  RefreshCw,
  Sparkles,
  User,
  ChevronDown,
  Menu,
  CheckCircle2,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { BrandPill } from './Badge';

interface CashierHeaderProps {
  title: string;
  subtitle: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  isConnected?: boolean;
  onToggleAi?: () => void;
  onToggleSidebar?: () => void;
  headerAction?: React.ReactNode;
}

export function CashierHeader({
  title,
  subtitle,
  onRefresh,
  isRefreshing = false,
  isConnected = true,
  onToggleAi,
  onToggleSidebar,
  headerAction,
}: CashierHeaderProps) {
  const router = useRouter();
  const { user, quickWaiterLogin, quickCashierLogin, logout } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';
  const [devMenuOpen, setDevMenuOpen] = useState(false);

  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-2">
      {/* Left: Mobile Menu + Titles */}
      <div className="flex items-start gap-3 min-w-0">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="lg:hidden w-[44px] h-[44px] shrink-0 rounded-[12px] border border-[#25282D] bg-[#15171A] text-[#F8FAFC] flex items-center justify-center cursor-pointer transition-colors hover:bg-[#1B1E23]"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5 text-[#A1A1AA]" />
          </button>
        )}

        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 text-[22px] sm:text-[26px] font-bold tracking-[-0.01em] text-[#F8FAFC] truncate">
              {title}
            </h1>
            <BrandPill>Silver Sapoon POS</BrandPill>
          </div>
          <p className="m-0 text-[13px] sm:text-[14px] text-[#A1A1AA]">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex flex-wrap items-center gap-[10px]">
        {/* Optional Action Button */}
        {headerAction}

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh orders"
            className="w-[44px] h-[44px] box-border rounded-[12px] border border-[#25282D] bg-[#15171A] text-[#F8FAFC] flex items-center justify-center cursor-pointer transition-all hover:bg-[#1B1E23] hover:border-[#F5B342]/40 disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342]"
          >
            <RefreshCw
              className={`w-[18px] h-[18px] text-[#F8FAFC] ${
                isRefreshing ? 'animate-spin text-[#F5B342]' : ''
              }`}
              strokeWidth={1.8}
            />
          </button>
        )}

        {/* Online Status Pill */}
        <div className="min-h-[44px] box-border px-[14px] rounded-[12px] border border-[rgba(34,197,94,0.4)] bg-[rgba(34,197,94,0.1)] text-[#22C55E] flex items-center gap-[8px] text-[13px] font-semibold select-none">
          <span
            className={`w-[8px] h-[8px] rounded-full ${
              isConnected ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-amber-400'
            }`}
          />
          <span>{isConnected ? 'Online' : 'Offline'}</span>
        </div>

        {/* AI Assistant Pill Button */}
        <button
          type="button"
          onClick={onToggleAi}
          className="min-h-[44px] box-border px-[14px] rounded-[12px] border border-[rgba(245,179,66,0.45)] bg-[rgba(245,179,66,0.1)] text-[#F5B342] flex items-center gap-[8px] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[rgba(245,179,66,0.18)] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342]"
        >
          <Sparkles className="w-[16px] h-[16px] text-[#F5B342]" strokeWidth={1.8} />
          <span>AI Assistant</span>
        </button>

        {/* Dev Switch Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDevMenuOpen(!devMenuOpen)}
            className="min-h-[44px] box-border px-[14px] rounded-[12px] border border-[#25282D] bg-[#15171A] text-[#F8FAFC] flex items-center gap-[8px] text-[13px] font-semibold cursor-pointer transition-all hover:bg-[#1B1E23] hover:border-[#F5B342]/40 outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342]"
          >
            <User className="w-[16px] h-[16px] text-[#A1A1AA]" strokeWidth={1.8} />
            <span className="hidden sm:inline">Dev Switch</span>
            <ChevronDown className="w-[14px] h-[14px] text-[#A1A1AA]" strokeWidth={2} />
          </button>

          {devMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#15171A] border border-[#25282D] rounded-[14px] shadow-2xl p-2 z-50 animate-in fade-in-50 duration-150">
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] border-b border-[#25282D] mb-1">
                Role Quick Switch
              </div>
              <button
                type="button"
                onClick={() => {
                  quickWaiterLogin(restaurantId || '1');
                  setDevMenuOpen(false);
                  router.push('/waiter');
                }}
                className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-semibold text-[#F8FAFC] hover:bg-[#1B1E23] hover:text-[#F5B342] transition-colors flex items-center justify-between"
              >
                <span>Captain (Waiter)</span>
                <span className="text-[10px] bg-[#1B1E23] text-[#A1A1AA] px-1.5 py-0.5 rounded">Switch</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  quickCashierLogin(restaurantId || '1');
                  setDevMenuOpen(false);
                  router.push('/cashier');
                }}
                className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-semibold text-[#F8FAFC] hover:bg-[#1B1E23] hover:text-[#F5B342] transition-colors flex items-center justify-between"
              >
                <span>Cashier POS</span>
                <span className="text-[10px] bg-[#F5B342]/10 text-[#F5B342] px-1.5 py-0.5 rounded font-bold">Active</span>
              </button>
              <div className="border-t border-[#25282D] my-1"></div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setDevMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-[10px] text-xs font-semibold text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                Sign Out Session
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
