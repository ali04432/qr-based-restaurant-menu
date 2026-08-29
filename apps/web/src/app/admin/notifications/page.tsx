'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  ShoppingBag,
  Package,
  CreditCard,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCheck,
} from 'lucide-react';
import Link from 'next/link';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { AdminNotification, NotificationType, UserRole } from '@qr-menu/shared';

// Map each notification type to an icon and colour scheme
const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; bg: string; text: string; border: string }
> = {
  ORDER: {
    icon: ShoppingBag,
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
  },
  STOCK: {
    icon: Package,
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-200',
  },
  PAYMENT: {
    icon: CreditCard,
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
  },
  FEEDBACK: {
    icon: MessageSquare,
    bg: 'bg-violet-50',
    text: 'text-violet-600',
    border: 'border-violet-200',
  },
  SYSTEM: {
    icon: AlertCircle,
    bg: 'bg-slate-100',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
};

const TYPE_FILTERS: { value: NotificationType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ORDER', label: 'Orders' },
  { value: 'STOCK', label: 'Stock' },
  { value: 'PAYMENT', label: 'Payments' },
  { value: 'FEEDBACK', label: 'Feedback' },
  { value: 'SYSTEM', label: 'System' },
];

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function AdminNotificationsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'ALL'>('ALL');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getNotifications(restaurantId, token);
      setNotifications(data || []);
    } catch (err) {
      console.warn('[AdminNotifications] Failed to fetch notifications', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id: string) => {
    if (!token) return;
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    try {
      await adminService.markNotificationRead(id, token);
    } catch (err) {
      // Revert on failure
      console.warn('[AdminNotifications] Failed to mark as read', err);
      fetchNotifications();
    }
  };

  const handleMarkAllRead = async () => {
    if (!token) return;
    setMarkingAllRead(true);
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await adminService.markAllNotificationsRead(token);
    } catch (err) {
      console.warn('[AdminNotifications] Failed to mark all read', err);
      fetchNotifications();
    } finally {
      setMarkingAllRead(false);
    }
  };

  // Derived counts
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filtered = notifications.filter((n) => {
    const matchesType = typeFilter === 'ALL' || n.type === typeFilter;
    const matchesRead = !showUnreadOnly || !n.isRead;
    return matchesType && matchesRead;
  });

  return (
    <AdminLayout
      title="Notifications"
      subtitle="Operational Alerts, Order Updates & System Messages"
      onRefresh={fetchNotifications}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Summary Row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-4">
              <p className="text-xs text-slate-500 font-medium">Total</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{notifications.length}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-4">
              <p className="text-xs text-slate-500 font-medium">Unread</p>
              <p className="text-2xl font-bold text-rose-600 mt-0.5">{unreadCount}</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-4">
              <p className="text-xs text-slate-500 font-medium">Read</p>
              <p className="text-2xl font-bold text-slate-400 mt-0.5">
                {notifications.length - unreadCount}
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg px-4 py-4">
              <p className="text-xs text-slate-500 font-medium">Filtered</p>
              <p className="text-2xl font-bold text-slate-900 mt-0.5">{filtered.length}</p>
            </div>
          </div>

          {/* ── Filter Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            {/* Type Filter Tabs */}
            <div className="flex items-center gap-1 flex-wrap">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setTypeFilter(f.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    typeFilter === f.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 font-medium cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showUnreadOnly}
                  onChange={(e) => setShowUnreadOnly(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-800"
                />
                Unread only
              </label>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  disabled={markingAllRead}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  {markingAllRead ? 'Marking...' : 'Mark All Read'}
                </button>
              )}
            </div>
          </div>

          {/* ── Notifications Feed ── */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-slate-400">
                <BellOff className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm font-medium">No notifications</p>
                <p className="text-xs mt-1">
                  {showUnreadOnly
                    ? 'All notifications are read.'
                    : "You're all caught up."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.map((n) => {
                  const cfg = TYPE_CONFIG[n.type as NotificationType] || TYPE_CONFIG.SYSTEM;
                  const Icon = cfg.icon;

                  return (
                    <li
                      key={n.id}
                      className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                        n.isRead ? 'bg-white hover:bg-slate-50/60' : 'bg-blue-50/30 hover:bg-blue-50/50'
                      }`}
                    >
                      {/* Type icon */}
                      <div
                        className={`mt-0.5 shrink-0 w-9 h-9 rounded-lg border flex items-center justify-center ${cfg.bg} ${cfg.border}`}
                      >
                        <Icon className={`w-4 h-4 ${cfg.text}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-xs font-semibold leading-snug ${
                                n.isRead ? 'text-slate-600' : 'text-slate-900'
                              }`}
                            >
                              {!n.isRead && (
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 mb-0.5 align-middle" />
                              )}
                              {n.title}
                            </p>
                            <p
                              className={`text-xs mt-0.5 leading-relaxed ${
                                n.isRead ? 'text-slate-400' : 'text-slate-600'
                              }`}
                            >
                              {n.message}
                            </p>
                          </div>

                          {/* Timestamp + unread dot */}
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {timeAgo(n.createdAt)}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border uppercase tracking-wide ${cfg.bg} ${cfg.text} ${cfg.border}`}
                            >
                              {n.type}
                            </span>
                          </div>
                        </div>

                        {/* Action row */}
                        <div className="flex items-center gap-3 mt-2">
                          {n.link && (
                            <Link
                              href={n.link}
                              className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-800 font-medium transition"
                            >
                              <ExternalLink className="w-3 h-3" />
                              View
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              type="button"
                              onClick={() => handleMarkRead(n.id)}
                              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-600 font-medium transition"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Mark read
                            </button>
                          )}
                          {n.isRead && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-300">
                              <CheckCircle2 className="w-3 h-3" />
                              Read
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ── Footer hint ── */}
          <p className="text-xs text-slate-400 text-center">
            Showing {filtered.length} of {notifications.length} notifications.
            New alerts appear automatically when orders, payments, or inventory events occur.
          </p>
        </div>
      )}
    </AdminLayout>
  );
}
