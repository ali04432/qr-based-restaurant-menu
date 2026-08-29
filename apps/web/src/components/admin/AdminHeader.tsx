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
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left Title & Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight truncate">
            {title || 'Restaurant Management'}
          </h1>
          {subtitle && (
            <p className="text-[11px] text-slate-500 hidden sm:block truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Real-time Connection Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 border border-slate-200 text-[11px] font-medium">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className="text-slate-600">
            {isConnected ? 'Live Socket Sync' : 'Reconnecting...'}
          </span>
        </div>

        {/* Refresh Button */}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition disabled:opacity-50"
            title="Refresh current view"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
          </button>
        )}

        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition relative"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-lg bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-900">
                  Operational Alerts ({unreadCount} unread)
                </span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] text-amber-600 hover:text-amber-700 font-medium"
                  >
                    Mark all as read
                  </button>
                )}
              </div>

              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No active notifications
                  </div>
                ) : (
                  notifications.slice(0, 6).map((n) => (
                    <div
                      key={n.id}
                      className={`p-3 text-xs transition ${
                        n.isRead ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-900">{n.title}</p>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-0.5 text-[11px]">{n.message}</p>
                      {n.link && (
                        <Link
                          href={n.link}
                          onClick={() => setShowNotifications(false)}
                          className="inline-flex items-center gap-1 mt-1 text-[10px] font-medium text-amber-600 hover:text-amber-700"
                        >
                          <span>View Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-slate-100 text-center">
                <Link
                  href="/admin/notifications"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-semibold text-slate-700 hover:text-amber-600"
                >
                  View All Notifications →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User Account / Profile Info */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-slate-900 leading-tight">
              {user?.name || 'Staff User'}
            </p>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
              {user?.role || 'Staff'}
            </p>
          </div>

          <button
            type="button"
            onClick={logout}
            className="p-2 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
