'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Boxes,
  Users,
  UtensilsCrossed,
  ChefHat,
  ConciergeBell,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Grid,
  FileSpreadsheet,
} from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { adminService } from '../../services/admin.service';
import { useAuthContext } from '../../context/AuthContext';
import { AdminDashboardOverview, UserRole } from '@qr-menu/shared';

export default function AdminDashboardPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getDashboardOverview(restaurantId, token);
      setOverview(data);
    } catch (err) {
      console.warn('[AdminDashboard] Failed to fetch overview', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [restaurantId, token]);

  const metrics = overview?.metrics;

  return (
    <AdminLayout
      title="Executive Operations Dashboard"
      subtitle="Authoritative Real-Time Financials, Kitchen Live Orders & Demand Analytics"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchOverview}
      isRefreshing={refreshing}
    >
      {/* Top Urgent Low Stock Banner (REQ-19) */}
      {overview?.lowStockAlerts && overview.lowStockAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-900/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center gap-2">
                <span>Inventory Alert</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {overview.lowStockAlerts.length} Item(s) Critical
                </span>
              </h3>
              <p className="text-xs text-rose-300/80 mt-0.5 font-medium">
                {overview.lowStockAlerts
                  .slice(0, 3)
                  .map((i) => `${i.name} (${i.stockCount} left)`)
                  .join(', ')}
                {overview.lowStockAlerts.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
          <Link
            href="/admin/inventory"
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shrink-0 shadow-md shadow-rose-950/50"
          >
            <span>Replenish Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Row 1: 4 Key Financial & Operational KPI Cards (Section 11) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 1. Today's Revenue */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today&apos;s Revenue
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Rs. {metrics?.todayRevenue ? metrics.todayRevenue.toLocaleString() : '0'}
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {metrics?.todayOrders || 0} orders today
            </span>
            <span className="text-amber-400 font-semibold flex items-center gap-0.5">
              <Sparkles className="w-3 h-3" />
              Live Sync
            </span>
          </div>
        </div>

        {/* 2. Today's Orders */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-blue-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today&apos;s Orders
            </span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {metrics?.todayOrders || 0}
            </span>
            <span className="text-xs font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
              {metrics?.completedOrders || 0} fulfilled
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {metrics?.pendingOrders || 0} active in kitchen
            </span>
            <Link href="/admin/orders" className="text-blue-400 hover:text-blue-300 font-medium">
              View →
            </Link>
          </div>
        </div>

        {/* 3. Average Order Value */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-purple-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Average Order Value
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Rs. {metrics?.averageOrderValue ? Math.round(Number(metrics.averageOrderValue)).toLocaleString() : '0'}
            </span>
            <span className="text-xs font-bold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-full">
              AOV
            </span>
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">
              {metrics?.activeTables || 0} table(s) seated
            </span>
            <Link href="/admin/tables" className="text-purple-400 hover:text-purple-300 font-medium">
              Floor Plan →
            </Link>
          </div>
        </div>

        {/* 4. Today's Profit (Section 34) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Today&apos;s Gross Profit
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
              Rs. {metrics?.grossProfitToday ? metrics.grossProfitToday.toLocaleString() : '0'}
            </span>
            <span className="text-xs font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {metrics?.profitMarginToday || 0}% margin
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Authoritative COGS unit economics</p>
        </div>
      </div>

      {/* Row 2: Revenue Chart & Operations Hub (Section 12, Row 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 7-Day Revenue & Volume Trend Chart */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 p-5 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                7-Day Revenue & Volume Performance
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Authoritative transaction ledger computed from real customer checkouts
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
            >
              <span>Full Analytics</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="h-52 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {overview?.revenueTrend && overview.revenueTrend.length > 0 ? (
              overview.revenueTrend.map((bar, idx) => {
                const maxVal = Math.max(
                  ...(overview.revenueTrend || []).map((b) => b.revenue),
                  1000
                );
                const heightPct = Math.max(12, Math.round((bar.revenue / maxVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="text-[10px] font-mono font-bold text-amber-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                      Rs. {bar.revenue.toLocaleString()}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[42px] bg-linear-to-t from-slate-800 to-amber-600/80 group-hover:to-amber-500 rounded-t-md transition-all relative shadow-md shadow-amber-950/20"
                    />
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                      {bar.date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-500 py-16">
                No 7-day revenue ledger logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Operations Command Hub */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-xl shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-3 border-b border-slate-800">
              Operations Command Hub
            </h2>
            <div className="space-y-2.5">
              <Link
                href="/admin/kitchen"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:border-amber-500/40 hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-amber-300 transition">Kitchen Display (KDS)</p>
                    <p className="text-[10px] text-slate-400">Live cook ticket queue & stages</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition" />
              </Link>

              <Link
                href="/admin/waiter"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:border-blue-500/40 hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    <ConciergeBell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-blue-300 transition">Waiter Dispatch & Tables</p>
                    <p className="text-[10px] text-slate-400">Ready-to-serve table runner</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
              </Link>

              <Link
                href="/admin/inventory"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:border-emerald-500/40 hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition">Inventory & Intelligence</p>
                    <p className="text-[10px] text-slate-400">Stock deduction & reorder forecast</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition" />
              </Link>

              <Link
                href="/admin/ai"
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-800/80 bg-slate-950/50 hover:border-purple-500/40 hover:bg-slate-800/40 transition group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white group-hover:text-purple-300 transition">AI Business Assistant</p>
                    <p className="text-[10px] text-slate-400">Ask financial queries & profit stats</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
              </Link>
            </div>
          </div>

          <div className="pt-3.5 mt-3 border-t border-slate-800 flex items-center justify-between text-[11px]">
            <span className="font-mono text-slate-500">PostgreSQL Engine</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Row 3 & 4: Top Dishes, Urgent Alerts & Live Orders (Section 12, Row 3 & 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling Dishes (Section 35) */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                <span>Top Selling Dishes</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Ranked by unit sales volume</p>
            </div>
            <Link
              href="/admin/reports"
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
            >
              Export Report →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2.5 px-2">Dish Name</th>
                  <th className="py-2.5 px-2 text-right">Units Sold</th>
                  <th className="py-2.5 px-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {overview?.topSellingItems && overview.topSellingItems.length > 0 ? (
                  overview.topSellingItems.map((dish, idx) => (
                    <tr key={dish.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-2 font-semibold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-amber-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                            #{idx + 1}
                          </span>
                          <div>
                            <span>{dish.name}</span>
                            <span className="block text-[10px] text-slate-400 font-normal">
                              {dish.categoryName || 'Main Course'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-medium text-slate-300">
                        {dish.totalQuantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-400">
                        Rs. {dish.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-xs">
                      No dish transactions logged in this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Live Orders Feed */}
        <div className="bg-slate-900/90 border border-slate-800/80 p-5 rounded-xl shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Recent Live Orders</span>
              </h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Real-time incoming orders</p>
            </div>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
            >
              All Orders ({overview?.metrics?.todayOrders || 0}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {overview?.recentOrders && overview.recentOrders.length > 0 ? (
              overview.recentOrders.slice(0, 5).map((ord) => (
                <div key={ord.id} className="py-3 flex items-center justify-between text-xs hover:bg-slate-800/30 px-2 rounded-lg transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white">
                        {ord.orderNumber}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-400 border border-slate-700">
                        Table {ord.tableNumber || '01'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {ord.itemCount} item(s) •{' '}
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-emerald-400 block">
                      Rs. {ord.total.toLocaleString()}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mt-0.5 ${
                        ord.status === 'COMPLETED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : ord.status === 'READY'
                          ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                          : ord.status === 'CANCELLED'
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-slate-500 text-xs">
                No orders recorded for today yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
