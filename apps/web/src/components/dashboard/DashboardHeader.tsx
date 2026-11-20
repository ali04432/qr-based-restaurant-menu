'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Calendar,
  Bell,
  Plus,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useDashboardTheme, DashboardTheme } from './DashboardThemeContext';
import { AdminNotification } from '@qr-menu/shared';

export type DateFilterOption =
  | 'today'
  | 'yesterday'
  | '7d'
  | 'last_week'
  | 'month'
  | 'last_month'
  | 'custom';

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
  selectedDateRange: DateFilterOption;
  onDateRangeChange: (range: DateFilterOption, customFrom?: string, customTo?: string) => void;
  customFrom?: string;
  customTo?: string;
  onRefresh: () => void;
  isRefreshing: boolean;
  isConnected: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  notifications: AdminNotification[];
  onMarkAllNotificationsRead: () => void;
}

export function DashboardHeader({
  onToggleSidebar,
  selectedDateRange,
  onDateRangeChange,
  customFrom,
  customTo,
  onRefresh,
  isRefreshing,
  isConnected,
  searchQuery,
  onSearchChange,
  notifications,
  onMarkAllNotificationsRead,
}: DashboardHeaderProps) {
  const { user } = useAuthContext();
  const { theme, resolvedTheme, setTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const [showNotifications, setShowNotifications] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showThemeDropdown, setShowThemeDropdown] = useState(false);
  const [customStart, setCustomStart] = useState(customFrom || '');
  const [customEnd, setCustomEnd] = useState(customTo || '');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const dateLabels: Record<DateFilterOption, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7d': 'This Week',
    last_week: 'Last Week',
    month: 'This Month',
    last_month: 'Last Month',
    custom: 'Custom Range',
  };

  const handleApplyCustomDate = () => {
    if (customStart && customEnd) {
      onDateRangeChange('custom', customStart, customEnd);
      setShowDateDropdown(false);
    }
  };

  return (
    <header
      className={`h-20 px-4 sm:px-6 lg:px-8 border-b sticky top-0 z-30 transition-colors flex items-center justify-between gap-4 backdrop-blur-md ${
        isLight
          ? 'bg-white/90 border-slate-200 text-slate-800'
          : 'bg-[#08090B]/90 border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        <button
          type="button"
          onClick={onToggleSidebar}
          className={`lg:hidden p-2 rounded-xl border transition ${
            isLight
              ? 'border-slate-200 text-slate-600 hover:bg-slate-100'
              : 'border-[#25282D] text-[#A1A1AA] hover:bg-[#15171A] hover:text-white'
          }`}
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
          <input
            type="text"
            placeholder="Search orders, dishes, customers..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs font-medium outline-none transition border ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#F5B342] focus:bg-white'
                : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] placeholder-[#A1A1AA] focus:border-[#F5B342]'
            }`}
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Restaurant Status */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] text-xs font-semibold">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#22C55E]"></span>
          </span>
          <span>Restaurant Online</span>
        </div>

        {/* Live Sync Indicator */}
        <div
          className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#15171A] border-[#25282D]'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-[#22C55E] shadow-[0_0_8px_rgba(34,197,94,0.6)]'
                : 'bg-[#F5B342] animate-pulse'
            }`}
          />
          <span className="text-[11px] text-[#A1A1AA]">
            {isConnected ? 'Live Sync' : 'Connecting...'}
          </span>
        </div>

        {/* Date Filter Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowDateDropdown(!showDateDropdown);
              setShowThemeDropdown(false);
              setShowNotifications(false);
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] hover:border-[#F5B342]/40'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-[#F5B342]" />
            <span className="hidden sm:inline">{dateLabels[selectedDateRange]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </button>

          {showDateDropdown && (
            <div
              className={`absolute right-0 mt-2 w-56 rounded-2xl border shadow-2xl p-2 z-50 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#15171A] border-[#25282D]'
              }`}
            >
              <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Filter Period
              </div>
              {(['today', 'yesterday', '7d', 'last_week', 'month', 'last_month'] as DateFilterOption[]).map(
                (opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      onDateRangeChange(opt);
                      setShowDateDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition ${
                      selectedDateRange === opt
                        ? 'bg-[#F5B342]/15 text-[#F5B342] font-bold'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-[#A1A1AA] hover:bg-[#1B1E23] hover:text-white'
                    }`}
                  >
                    {dateLabels[opt]}
                  </button>
                )
              )}

              {/* Custom Range Option */}
              <div className={`mt-2 pt-2 border-t ${isLight ? 'border-slate-100' : 'border-[#25282D]'}`}>
                <div className="text-[10px] font-bold uppercase text-[#A1A1AA] px-3 mb-1.5">
                  Custom Range
                </div>
                <div className="space-y-1.5 px-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className={`w-full text-[11px] px-2 py-1.5 rounded-lg border outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-[#1B1E23] border-[#25282D] text-[#F8FAFC]'
                    }`}
                  />
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className={`w-full text-[11px] px-2 py-1.5 rounded-lg border outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-800'
                        : 'bg-[#1B1E23] border-[#25282D] text-[#F8FAFC]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomDate}
                    className="w-full py-1.5 rounded-lg bg-[#F5B342] text-[#08090B] text-xs font-bold hover:bg-[#D6A84F] transition shadow-sm"
                  >
                    Apply Filter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Color Mode Switcher */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowThemeDropdown(!showThemeDropdown);
              setShowDateDropdown(false);
              setShowNotifications(false);
            }}
            className={`p-2 rounded-xl border transition ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] hover:border-[#F5B342]/40'
            }`}
            title="Appearance Mode"
            aria-label="Appearance Mode"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-[#F5B342]" />
            ) : theme === 'dark' ? (
              <Moon className="w-4 h-4 text-[#F5B342]" />
            ) : (
              <Monitor className="w-4 h-4 text-[#22D3EE]" />
            )}
          </button>

          {showThemeDropdown && (
            <div
              className={`absolute right-0 mt-2 w-44 rounded-2xl border shadow-2xl p-1.5 z-50 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#15171A] border-[#25282D]'
              }`}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Appearance
              </div>
              <button
                type="button"
                onClick={() => {
                  setTheme('dark');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  theme === 'dark'
                    ? 'bg-[#F5B342]/15 text-[#F5B342] font-bold'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-[#A1A1AA] hover:bg-[#1B1E23] hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span>Dark Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('light');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  theme === 'light'
                    ? 'bg-[#F5B342]/15 text-[#F5B342] font-bold'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-[#A1A1AA] hover:bg-[#1B1E23] hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span>Light Mode</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTheme('system');
                  setShowThemeDropdown(false);
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition ${
                  theme === 'system'
                    ? 'bg-[#F5B342]/15 text-[#F5B342] font-bold'
                    : isLight
                    ? 'text-slate-700 hover:bg-slate-100'
                    : 'text-[#A1A1AA] hover:bg-[#1B1E23] hover:text-white'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>System Mode</span>
              </button>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className={`p-2 rounded-xl border transition disabled:opacity-50 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] hover:border-[#F5B342]/40'
          }`}
          title="Refresh metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#F5B342]' : ''}`} />
        </button>

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowDateDropdown(false);
              setShowThemeDropdown(false);
            }}
            className={`p-2 rounded-xl border transition relative ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] hover:border-[#F5B342]/40'
            }`}
            aria-label="Alerts"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border shadow-2xl py-2 z-50 animate-in fade-in-50 duration-150 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#15171A] border-[#25282D]'
              }`}
            >
              <div
                className={`flex items-center justify-between px-4 py-2 border-b ${
                  isLight ? 'border-slate-100' : 'border-[#25282D]'
                }`}
              >
                <span className="text-xs font-bold text-inherit">
                  Notifications ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="text-[11px] text-[#F5B342] hover:text-[#D6A84F] font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-[#25282D]/40">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#A1A1AA]">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${
                        n.isRead
                          ? 'opacity-70'
                          : isLight
                          ? 'bg-amber-50/50'
                          : 'bg-[#1B1E23]/60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-inherit">{n.title}</p>
                        <span className="text-[10px] text-[#A1A1AA] whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A1A1AA] mt-0.5">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold text-[#F5B342] hover:underline"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* New Order Shortcut Button */}
        <Link
          href="/checkout"
          target="_blank"
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-[#F5B342] to-[#D6A84F] text-[#08090B] font-bold text-xs hover:brightness-105 transition shadow-md shadow-[#F5B342]/15 shrink-0"
        >
          <Plus className="w-4 h-4 text-[#08090B]" />
          <span className="hidden sm:inline">New Order</span>
        </Link>
      </div>
    </header>
  );
}
