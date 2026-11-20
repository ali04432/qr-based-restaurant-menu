'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DollarSign, Layers } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

interface RevenueCategoryItem {
  category: string;
  revenue: number;
  percentage: number;
}

interface DashboardRevenueDonutProps {
  categories: RevenueCategoryItem[];
  totalRevenue: number;
  loading: boolean;
}

const PALETTE = [
  '#F5B342', // Gold
  '#8B5CF6', // Purple
  '#22D3EE', // Cyan
  '#22C55E', // Green
  '#F97316', // Orange
  '#EC4899', // Pink
  '#64748B', // Slate
];

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl bg-[#1B1E23] border border-[#25282D] p-3 shadow-xl text-xs">
      <p className="font-bold text-white mb-0.5">{item.name}</p>
      <p className="font-bold text-[#F5B342]">Rs. {item.value?.toLocaleString()}</p>
      <p className="text-[#A1A1AA] text-[10px]">{item.payload?.percentage || 0}% of total</p>
    </div>
  );
}

export function DashboardRevenueDonut({ categories, totalRevenue, loading }: DashboardRevenueDonutProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const chartData = categories.map((c, i) => ({
    name: c.category,
    value: c.revenue,
    percentage: c.percentage,
    color: PALETTE[i % PALETTE.length],
  }));

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Revenue Breakdown</h3>
            <p className="text-[11px] text-[#A1A1AA]">Distribution by category</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[#A1A1AA] uppercase font-bold">Total</p>
          <p className="text-sm font-black text-[#F5B342]">Rs. {totalRevenue.toLocaleString()}</p>
        </div>
      </div>

      {loading ? (
        <div className="h-60 rounded-xl bg-black/10 animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-60 flex items-center justify-center text-xs text-[#A1A1AA]">
          No category revenue data available
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="w-44 h-44 shrink-0 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Categories</span>
              <span className="text-sm font-black text-inherit">{chartData.length}</span>
            </div>
          </div>

          <div className="flex-1 w-full space-y-2">
            {chartData.slice(0, 5).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-inherit font-medium">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-bold text-inherit font-mono">
                    Rs. {item.value.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#A1A1AA] w-9 text-right font-semibold">
                    {item.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
