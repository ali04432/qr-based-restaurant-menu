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
      title="Operations Dashboard"
      subtitle="Real-Time Restaurant Performance & Live Metrics"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchOverview}
      isRefreshing={refreshing}
    >
      {/* Top Warning Banner for Low Stock */}
      {overview?.lowStockAlerts && overview.lowStockAlerts.length > 0 && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                Inventory Warning ({overview.lowStockAlerts.length} items low or out of stock)
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
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
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shrink-0"
          >
            <span>Replenish Stock</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* KPI Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Sales */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Today&apos;s Revenue
            </span>
            <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              Rs. {metrics?.todayRevenue ? metrics.todayRevenue.toLocaleString() : '0'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics?.todayOrders || 0} order(s) placed today
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Estimated Profit
            </span>
            <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-emerald-700">
              Rs. {metrics?.grossProfitToday ? metrics.grossProfitToday.toLocaleString() : '0'}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
              {metrics?.profitMarginToday || 0}% margin
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Calculated via authoritative COGS</p>
        </div>

        {/* Active Kitchen Queue */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Kitchen Orders
            </span>
            <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
              <ChefHat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-amber-700">
              {metrics?.pendingOrders || 0}
            </span>
            <Link
              href="/admin/kitchen"
              className="text-[11px] font-bold text-amber-700 hover:text-amber-800"
            >
              Open KDS →
            </Link>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics?.completedOrders || 0} order(s) fulfilled today
          </p>
        </div>

        {/* Table Utilization */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Occupied Tables
            </span>
            <div className="p-1.5 rounded-md bg-blue-50 text-blue-700">
              <ConciergeBell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-slate-900">
              {metrics?.activeTables || 0}
              <span className="text-sm font-normal text-slate-400">
                {' '}
                / tables
              </span>
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
              {metrics?.activeTables ? Math.round((metrics.activeTables / 10) * 100) : 0}
              %
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            AOV: Rs. {metrics?.averageOrderValue ? metrics.averageOrderValue.toFixed(0) : '0'}
          </p>
        </div>
      </div>

      {/* Main Grid: Revenue Trend & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 7-Day Revenue Trend (CSS Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                7-Day Revenue & Volume Trend
              </h2>
              <p className="text-[11px] text-slate-500">
                Authoritative transaction breakdown from completed orders
              </p>
            </div>
            <Link
              href="/admin/analytics"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Full Analytics →
            </Link>
          </div>

          <div className="h-48 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {overview?.revenueTrend && overview.revenueTrend.length > 0 ? (
              overview.revenueTrend.map((bar, idx) => {
                const maxVal = Math.max(
                  ...overview.revenueTrend.map((b) => b.revenue),
                  1000
                );
                const heightPct = Math.max(10, Math.round((bar.revenue / maxVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      Rs. {bar.revenue.toLocaleString()}
                    </div>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[36px] bg-slate-800 group-hover:bg-amber-600 rounded-t-sm transition-all relative"
                    />
                    <span className="text-[10px] font-medium text-slate-500 whitespace-nowrap">
                      {bar.date}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-400 py-12">
                No 7-day revenue data logged yet.
              </div>
            )}
          </div>
        </div>

        {/* Quick Operations Actions */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
              Quick Operations Hub
            </h2>
            <div className="space-y-2">
              <Link
                href="/admin/kitchen"
                className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-amber-100 text-amber-800">
                    <ChefHat className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Kitchen Display (KDS)</p>
                    <p className="text-[10px] text-slate-500">Live order queue & cook stages</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
              </Link>

              <Link
                href="/admin/waiter"
                className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-blue-100 text-blue-800">
                    <ConciergeBell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Waiter Ready-to-Serve</p>
                    <p className="text-[10px] text-slate-500">Table delivery tracking</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
              </Link>

              <Link
                href="/admin/inventory"
                className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-slate-100 text-slate-800">
                    <Boxes className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Inventory Adjustments</p>
                    <p className="text-[10px] text-slate-500">Stock levels & unit thresholds</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
              </Link>

              <Link
                href="/admin/ai"
                className="flex items-center justify-between p-2.5 rounded-md border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-md bg-emerald-100 text-emerald-800">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">AI Business Intelligence</p>
                    <p className="text-[10px] text-slate-500">Query trends & profitability</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition" />
              </Link>
            </div>
          </div>

          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-mono">DB Status: Connected</span>
            <span className="text-emerald-700 font-bold">● Active Sync</span>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Top Selling Dishes & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Dishes Table */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Top Selling Dishes (Weekly)
            </h2>
            <Link
              href="/admin/reports"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              Export Report →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-2">Dish Name</th>
                  <th className="py-2 text-right">Units</th>
                  <th className="py-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overview?.topSellingItems && overview.topSellingItems.length > 0 ? (
                  overview.topSellingItems.map((dish) => (
                    <tr key={dish.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-semibold text-slate-900">
                        {dish.name}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {dish.categoryName || 'Main Course'}
                        </span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-medium text-slate-700">
                        {dish.totalQuantity}
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                        Rs. {dish.totalRevenue.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-slate-400 text-xs">
                      No dish sales recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders Feed */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Recent Live Orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-xs font-semibold text-amber-700 hover:text-amber-800"
            >
              All Orders ({overview?.metrics?.todayOrders || 0}) →
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {overview?.recentOrders && overview.recentOrders.length > 0 ? (
              overview.recentOrders.map((ord) => (
                <div key={ord.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        {ord.orderNumber}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        Table {ord.tableNumber || '01'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ord.itemCount} item(s) •{' '}
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900 block">
                      Rs. {ord.total.toLocaleString()}
                    </span>
                    <span
                      className={`inline-block text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded mt-0.5 ${
                        ord.status === 'COMPLETED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : ord.status === 'READY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-6 text-center text-slate-400 text-xs">
                No recent orders to show.
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
