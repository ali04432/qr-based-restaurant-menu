'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Menu,
  Bell,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  LogOut,
  RefreshCw,
  Store,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useBranchContext } from '../../context/BranchContext';
import { useSocket } from '../../hooks/useSocket';
import { adminService } from '../../services/admin.service';
import { AdminNotification } from '@qr-menu/shared';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
  title?: string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminHeader({
  onToggleSidebar,
  title,
  subtitle,
  onRefresh,
  isRefreshing,
}: AdminHeaderProps) {
  const { user, token, logout } = useAuthContext();
  const { branches, currentBranchId, setCurrentBranchId } = useBranchContext();
  const restaurantId = user?.restaurantId || '1';

  const { isConnected } = useSocket({
    restaurantId,
    token: token || undefined,
    enabled: true,
  });

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!token) return;
    adminService
      .getNotifications(restaurantId, token)
      .then((data) => setNotifications(data))
      .catch(() => {});
  }, [restaurantId, token]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await adminService.markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  return (
    <header className="h-16 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-white leading-tight truncate tracking-tight">
            {title || 'Restaurant Management'}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-400 hidden sm:block truncate font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Restaurant Status: Restaurant Online (REQ-10) */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold shadow-xs">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Restaurant Online</span>
        </div>

        {/* Multi-Branch Location Switcher (REQ-17) */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-slate-200">
          <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <select
            value={currentBranchId || 'ALL'}
            onChange={(e) => setCurrentBranchId(e.target.value === 'ALL' ? null : e.target.value)}
            className="bg-transparent text-xs font-semibold text-slate-200 outline-hidden cursor-pointer"
            title="Active restaurant branch"
            aria-label="Active restaurant branch"
          >
            <option value="ALL" className="bg-slate-900 text-slate-200">All Branches (Consolidated)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                {b.name} ({b.code})
              </option>
            ))}
          </select>
        </div>

        {/* Real-time Connection Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]' : 'bg-amber-400 animate-pulse'
            }`}
          />
          <span className="text-slate-400 text-[11px]">
            {isConnected ? 'Live Sync' : 'Reconnecting...'}
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition disabled:opacity-50"
            title="Refresh current view"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl py-2 z-50 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
                <span className="text-xs font-bold text-white">
                  Operational Alerts ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/80">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${
                        n.isRead ? 'bg-slate-900/60' : 'bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-200">{n.title}</p>
                        <span className="text-[10px] text-slate-500 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-400 mt-0.5 text-[11px]">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-400 hover:text-amber-300"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-800 text-center">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-200 leading-tight">
              {user?.name || 'Staff User'}
            </p>
            <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
              {user?.role || 'Staff'}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
