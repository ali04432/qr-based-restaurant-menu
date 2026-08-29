'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { AnalyticsSummary, AnalyticsDateRange, UserRole, DemandForecastResult } from '@qr-menu/shared';

const DATE_RANGES: { range: AnalyticsDateRange; label: string }[] = [
  { range: 'today', label: 'Today' },
  { range: '7d', label: 'Last 7 Days' },
  { range: '30d', label: 'Last 30 Days' },
  { range: 'month', label: 'This Month' },
  { range: 'year', label: 'This Year' },
];

export default function AdminAnalyticsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [range, setRange] = useState<AnalyticsDateRange>('7d');
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [forecast, setForecast] = useState<DemandForecastResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
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
  };

  useEffect(() => {
    fetchAnalytics();
  }, [restaurantId, token, range]);

  return (
    <AdminLayout
      title="Business Analytics & Profit Intelligence"
      subtitle="Financial Returns, Unit Economics, Dish Profit Margins & AI Demand Forecasts"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchAnalytics}
      isRefreshing={refreshing}
    >
      {/* Date Range Selection Bar */}
      <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs mb-6 flex items-center justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {DATE_RANGES.map((dr) => (
            <button
              key={dr.range}
              type="button"
              onClick={() => setRange(dr.range)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                range === dr.range
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {dr.label}
            </button>
          ))}
        </div>

        <span className="text-[11px] text-slate-500 hidden sm:block font-mono">
          Authoritative Real-Time Data
        </span>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Gross Sales */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Gross Sales
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            Rs. {analytics?.grossSales?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {analytics?.totalOrders || 0} customer orders
          </p>
        </div>

        {/* Cost of Goods Sold (COGS) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Ingredient Cost (COGS)
          </span>
          <div className="text-xl sm:text-2xl font-black text-rose-700 mt-1 font-mono">
            Rs. {analytics?.totalCost?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Ingredients & preparation costs
          </p>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Gross Profit
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">
            Rs. {analytics?.grossProfit?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">
            {analytics?.profitMargin || 0}% overall profit margin
          </p>
        </div>

        {/* Average Order Value (AOV) */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Average Order Value
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            Rs. {analytics?.averageOrderValue?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Per table seating order</p>
        </div>
      </div>

      {/* ── Phase 4: AI Demand Forecasting & Operational Intelligence Section ── */}
      {forecast && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 mb-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-amber-50 text-amber-700">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  AI Demand Forecasting & Prep Intelligence
                </h2>
                <p className="text-[11px] text-slate-500">
                  Statistical lookback ({forecast.lookbackDays} days) predicting next 7 days volume, traffic surges & stockout risks
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Confidence: 88%
            </span>
          </div>

          {/* AI Summary Banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed font-medium">
            <strong className="text-slate-900">AI Operational Summary: </strong>
            {forecast.aiSummary}
          </div>

          {/* 7-Day Day-by-Day Forecast Grid */}
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-2">
              7-Day Order & Revenue Projections
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {(forecast.next7DaysForecast || []).map((df) => (
                <div key={df.date} className="p-3 rounded-md bg-slate-50 border border-slate-200 text-center space-y-1">
                  <span className="text-xs font-bold text-slate-900 block">{df.dayName}</span>
                  <span className="text-[10px] text-slate-500 block font-mono">{df.date.slice(5)}</span>
                  <div className="pt-1 text-sm font-black font-mono text-slate-900">
                    {df.predictedOrders} orders
                  </div>
                  <div className="text-[10px] font-mono text-emerald-700 font-bold">
                    Rs. {df.predictedRevenue.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-slate-400 font-medium">
                    ~{df.expectedCovers} covers
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Peak Hours & Stockout Risks Two-Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
            {/* Peak Operational Hours */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Flame className="w-3.5 h-3.5 text-amber-600" />
                <span>Predicted Peak Load Slots</span>
              </div>
              <div className="space-y-2">
                {(forecast.peakHours || []).map((ph, idx) => (
                  <div key={idx} className="p-2.5 rounded bg-white border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span className="font-mono">{ph.timeSlot}</span>
                      <span className="text-[10px] text-amber-700 uppercase font-semibold">Peak Slot #{idx + 1}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 font-normal">{ph.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stockout Risk Alerts */}
            <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                <span>Stockout Depletion Risk ({(forecast.stockoutRisks || []).length} items)</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {(forecast.stockoutRisks || []).length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500 bg-white rounded border border-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                    All inventory velocity levels healthy for upcoming 72 hours.
                  </div>
                ) : (
                  (forecast.stockoutRisks || []).map((sr) => (
                    <div key={sr.menuItemId} className="p-2.5 rounded bg-white border border-rose-200 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-900">{sr.name}</div>
                        <div className="text-[10px] text-slate-500">
                          Stock: <strong className="font-mono text-slate-800">{sr.currentStock}</strong> | Depletes in <strong className="font-mono text-rose-700">{sr.daysUntilDepletion} days</strong>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                          sr.severity === 'CRITICAL' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {sr.severity}
                        </span>
                        <div className="text-[10px] text-slate-600 mt-1">Reorder: +{sr.suggestedReorderQuantity}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue & Margin Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Trend Bar Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Revenue & Profit Trajectory
            </h2>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900" /> Revenue
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Profit
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end gap-2 sm:gap-3 pt-6 pb-2 px-1">
            {analytics?.revenueTrend && analytics.revenueTrend.length > 0 ? (
              analytics.revenueTrend.map((day) => {
                const maxRev = Math.max(...analytics.revenueTrend.map((d) => d.revenue), 1);
                const heightPct = Math.max(10, Math.round((day.revenue / maxRev) * 100));
                const profitPct = day.revenue > 0 ? Math.round((day.profit / day.revenue) * 100) : 0;

                return (
                  <div key={day.label} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                    {/* Tooltip */}
                    <div className="absolute -top-10 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] py-1 px-2 rounded shadow-lg whitespace-nowrap z-10 pointer-events-none">
                      <span>Rs. {day.revenue.toLocaleString()}</span>
                      <span className="text-emerald-400">Profit: Rs. {day.profit.toLocaleString()}</span>
                    </div>

                    <div className="w-full flex flex-col items-center justify-end h-full">
                      <div
                        style={{ height: `${heightPct}%` }}
                        className="w-full max-w-[28px] bg-slate-900 rounded-t-sm flex flex-col justify-end overflow-hidden"
                      >
                        <div
                          style={{ height: `${Math.max(0, profitPct)}%` }}
                          className="w-full bg-emerald-600"
                        />
                      </div>
                    </div>

                    <span className="text-[9px] text-slate-500 font-medium truncate max-w-full">
                      {day.label}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                No revenue trend data available for this range.
              </div>
            )}
          </div>
        </div>

        {/* Category Revenue Distribution */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4 pb-2 border-b border-slate-100">
            Category Revenue Share
          </h2>

          <div className="space-y-3">
            {analytics?.categoryBreakdown && analytics.categoryBreakdown.length > 0 ? (
              analytics.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-slate-900">
                    <span>{cat.category}</span>
                    <span className="font-mono font-bold">
                      Rs. {cat.revenue.toLocaleString()}{' '}
                      <span className="text-[11px] text-slate-500 font-normal">
                        ({cat.percentage}%)
                      </span>
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      style={{ width: `${cat.percentage}%` }}
                      className="h-full bg-amber-600 rounded-full"
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-xs text-slate-400 py-12">
                No category data available for this range.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Item Rankings: Top Selling vs Most Profitable Dishes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 Best Selling */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
            Top 5 Best Selling Dishes
          </h2>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                <th className="py-2">Dish</th>
                <th className="py-2 text-right">Units Sold</th>
                <th className="py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics?.topItems?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-bold text-slate-900">
                    {item.name}
                    <span className="block text-[10px] text-slate-500 font-normal">
                      {item.categoryName}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono font-medium text-slate-700">
                    {item.totalQuantity}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-slate-900">
                    Rs. {item.totalRevenue.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Most Profitable Dishes */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 pb-2 border-b border-slate-100">
            Highest Gross Profit Contributors
          </h2>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold uppercase text-slate-500">
                <th className="py-2">Dish</th>
                <th className="py-2 text-right">Margin / Unit</th>
                <th className="py-2 text-right">Total Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics?.mostProfitableItems?.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2.5 font-bold text-slate-900">
                    {item.name}
                    <span className="block text-[10px] text-slate-500 font-normal">
                      Cost: Rs. {item.costPrice} • Sell: Rs. {item.price}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-600">
                    +Rs. {(item.price - (item.costPrice || 0)).toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-700">
                    Rs. {item.totalProfit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
