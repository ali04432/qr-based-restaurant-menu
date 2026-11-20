'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { RevenueTrendPoint } from '@qr-menu/shared';

interface DashboardRevenueChartProps {
  data: RevenueTrendPoint[];
  loading: boolean;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#1B1E23] border border-[#25282D] p-3 shadow-xl">
      <p className="text-[11px] font-semibold text-[#A1A1AA] mb-1">{label}</p>
      <p className="text-sm font-bold text-[#F5B342]">
        Rs. {payload[0]?.value?.toLocaleString()}
      </p>
      <p className="text-[11px] text-[#A1A1AA]">
        {payload[1]?.value || 0} orders
      </p>
    </div>
  );
}

export function DashboardRevenueChart({ data, loading }: DashboardRevenueChartProps) {
  const totalRevenue = data.reduce((sum, d) => sum + d.revenue, 0);
  const totalOrders = data.reduce((sum, d) => sum + d.orders, 0);

  return (
    <div className="rounded-2xl bg-[#15171A] border border-[#25282D] p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#F8FAFC]">Revenue Trend</h3>
            <p className="text-[11px] text-[#A1A1AA]">Last 7 days performance</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-[#A1A1AA]">7-Day Total</p>
            <p className="text-sm font-bold text-[#F5B342]">Rs. {totalRevenue.toLocaleString()}</p>
          </div>
          <Link
            href="/admin/analytics"
            className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
          >
            <span>Details</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-64 rounded-xl bg-[#1B1E23] animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-xs text-[#A1A1AA]">
          No revenue data for this period
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F5B342" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#F5B342" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#25282D" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#A1A1AA' }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 11, fill: '#A1A1AA' }}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F5B342"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{ r: 5, stroke: '#F5B342', strokeWidth: 2, fill: '#15171A' }}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#8B5CF6"
                strokeWidth={1.5}
                fill="none"
                dot={false}
                activeDot={{ r: 4, stroke: '#8B5CF6', strokeWidth: 2, fill: '#15171A' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
