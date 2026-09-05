'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Layers,
  Award,
  AlertCircle,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Clock,
  Sparkles,
  AlertTriangle,
  Flame,
  CheckCircle2,
  BarChart3,
  UtensilsCrossed,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { AnalyticsSummary, AnalyticsDateRange, UserRole, DemandForecastResult } from '@qr-menu/shared';

const DATE_RANGES: { range: any; label: string }[] = [
  { range: 'today', label: 'Today' },
  { range: 'yesterday', label: 'Yesterday' },
  { range: '7d', label: 'Last 7 Days' },
  { range: '30d', label: 'Last 30 Days' },
  { range: 'month', label: 'This Month' },
  { range: 'last_month', label: 'Last Month' },
  { range: 'year', label: 'This Year' },
];

export default function AdminAnalyticsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [range, setRange] = useState<any>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [forecast, setForecast] = useState<DemandForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [analyticsData, forecastData] = await Promise.all([
        adminService.getAnalytics(restaurantId, range, undefined, undefined, token),
        adminService.getDemandForecast(restaurantId, token).catch(() => null),
      ]);
      setAnalytics(analyticsData);
      setForecast(forecastData);
    } catch (err) {
      console.warn('[AdminAnalytics] Failed to fetch analytics', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, range]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return (
    <AdminLayout
      title="Business Analytics & Profit Intelligence"
      subtitle="Authoritative Revenue, Cost of Goods (COGS), Margin Analytics & AI Demand Projections"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchAnalytics}
      isRefreshing={refreshing}
    >
      {/* Date Range Selection Bar (Section 21 & 41) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.range}
              type="button"
              onClick={() => setRange(dr.range)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                range === dr.range
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-400 hidden sm:block font-mono">
          Authoritative PostgreSQL Aggregations
        </span>
      </div>

      {/* Financial KPI Cards (Section 21 Overview) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Gross Sales */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Gross Sales
          </span>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
            Rs. {analytics?.grossSales?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Across {analytics?.totalOrders || 0} customer orders
          </p>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Ingredient Cost (COGS)
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1 font-mono">
            Rs. {analytics?.totalCost?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Tracked via cost price at order
          </p>
        </div>

        {/* Net Gross Profit */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Gross Profit Return
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1 font-mono">
            Rs. {analytics?.grossProfit?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-emerald-400/80 mt-1 font-medium">
            Revenue minus true ingredient cost
          </p>
        </div>

        {/* Profit Margin % */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Gross Margin Percentage
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
            {analytics?.profitMargin || 0}%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            AOV: Rs. {Math.round(analytics?.averageOrderValue || 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Revenue Trend Chart & Performance Section (Section 21 Revenue Performance) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Revenue & Profit Comparison Trend
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Daily breakdown across period</p>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-500"></span> Revenue
              </span>
              <span className="flex items-center gap-1 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500"></span> Profit
              </span>
            </div>
          </div>

          <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
            {analytics?.revenueTrend && analytics.revenueTrend.length > 0 ? (
              analytics.revenueTrend.map((t, idx) => {
                const maxVal = Math.max(
                  ...analytics.revenueTrend.map((b) => b.revenue),
                  1000
                );
                const revHeight = Math.max(12, Math.round((t.revenue / maxVal) * 100));
                const profitHeight = Math.max(8, Math.round((t.profit / maxVal) * 100));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="text-[9px] font-mono text-slate-300 opacity-0 group-hover:opacity-100 transition whitespace-nowrap bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                      Rs. {t.revenue}
                    </div>
                    <div className="flex items-end gap-1 w-full justify-center">
                      <div
                        style={{ height: `${revHeight}%` }}
                        className="w-3.5 bg-amber-500/80 group-hover:bg-amber-400 rounded-t-sm transition-all"
                        title={`Revenue: Rs. ${t.revenue}`}
                      />
                      <div
                        style={{ height: `${profitHeight}%` }}
                        className="w-3.5 bg-emerald-500/80 group-hover:bg-emerald-400 rounded-t-sm transition-all"
                        title={`Profit: Rs. ${t.profit}`}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap">
                      {t.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full text-center text-xs text-slate-500 py-16">
                No revenue transactions recorded in this selected range.
              </div>
            )}
          </div>
        </div>

        {/* Category Share Breakdown */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 pb-3 border-b border-slate-800">
              Category Revenue Share
            </h3>

            <div className="space-y-3">
              {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
                analytics.categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-200">{cat.category}</span>
                      <span className="font-mono text-white">
                        Rs. {cat.revenue?.toLocaleString()} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                      <div
                        style={{ width: `${cat.percentage}%` }}
                        className="bg-amber-500 h-full rounded-full"
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-500 py-8">
                  No category data recorded.
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Sales Channels</span>
            <span className="text-amber-400 font-semibold">QR Dining + Delivery</span>
          </div>
        </div>
      </div>

      {/* Row 3: Best Sellers vs Least Sellers (Section 35 & 36) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Best Sellers (Top 5) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-500" />
                <span>Best Selling Dishes (Top 5)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Highest order volume</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              High Velocity
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-2">Dish Name</th>
                  <th className="py-2 px-2 text-center">Units Sold</th>
                  <th className="py-2 px-2 text-right">Total Revenue</th>
                  <th className="py-2 px-2 text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics?.topItems && analytics.topItems.length > 0 ? (
                  analytics.topItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-2 font-semibold text-white">
                        <span className="text-amber-400 mr-2 font-mono">#{idx + 1}</span>
                        {item.name}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-200">
                        {item.totalQuantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-white">
                        Rs. {item.totalRevenue?.toLocaleString()}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-bold text-emerald-400">
                        +Rs. {item.totalProfit?.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500 text-xs">
                      No sales data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Least Sellers (Section 36) */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-slate-400" />
                <span>Least Selling Dishes (Lowest 5)</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Lowest customer order demand</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Menu Re-engineering
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-2 px-2">Dish Name</th>
                  <th className="py-2 px-2 text-center">Units Sold</th>
                  <th className="py-2 px-2 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {analytics?.leastSellingItems && analytics.leastSellingItems.length > 0 ? (
                  analytics.leastSellingItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-2 font-semibold text-white">
                        <span className="text-slate-500 mr-2 font-mono">#{idx + 1}</span>
                        {item.name}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-medium text-slate-400">
                        {item.totalQuantity}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono font-semibold text-slate-300">
                        Rs. {item.totalRevenue?.toLocaleString()}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-slate-500 text-xs">
                      No least-selling metrics available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Row 4: AI Demand Forecasting (REQ-06 & Section 21) */}
      {forecast && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>AI Demand Forecasting Engine</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Projections generated by analyzing past order velocities
              </p>
            </div>
            <span className="text-xs font-bold text-amber-400 font-mono">
              7-Day Predicted Orders: {forecast.predictedOrdersNext7Days ?? (forecast.next7DaysForecast ? forecast.next7DaysForecast.reduce((acc, d) => acc + d.predictedOrders, 0) : forecast.predictedOrderVolumeTomorrow * 7)}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Peak Load Rush Hours
              </span>
              <div className="flex flex-wrap gap-2">
                {(forecast.peakLoadSlots ?? (forecast.peakHours ? forecast.peakHours.map(p => p.timeSlot) : forecast.peakHoursForecast?.map(p => p.label) ?? [])).map((slot: string) => (
                  <span
                    key={slot}
                    className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  >
                    {slot}
                  </span>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2">
                Stockout Risk Warnings
              </span>
              <div className="space-y-1.5 text-xs">
                {forecast.stockoutRisks && forecast.stockoutRisks.length > 0 ? (
                  forecast.stockoutRisks.map((risk, i) => (
                    <div key={i} className="text-rose-400 flex items-center justify-between gap-2 p-1.5 bg-rose-500/10 rounded border border-rose-500/20">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-medium text-rose-200">{risk.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-rose-300 font-semibold">{risk.daysUntilDepletion}d left ({risk.currentStock} stock)</span>
                    </div>
                  ))
                ) : forecast.stockoutAlerts && forecast.stockoutAlerts.length > 0 ? (
                  forecast.stockoutAlerts.map((alert: string, i: number) => (
                    <div key={i} className="text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{alert}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-emerald-400 flex items-center gap-1.5 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>No imminent stockout risks identified for next 7 days.</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
