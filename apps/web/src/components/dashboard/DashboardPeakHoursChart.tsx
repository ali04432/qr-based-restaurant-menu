'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Clock } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

export interface PeakHourSlot {
  hour: number;
  label: string;
  orders: number;
}

interface DashboardPeakHoursChartProps {
  data: PeakHourSlot[];
  loading: boolean;
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-xl bg-[#1B1E23] border border-[#25282D] p-2.5 shadow-xl text-xs">
      <p className="text-white font-bold">{item.payload?.label}</p>
      <p className="text-[#F5B342] font-semibold">{item.value} Orders</p>
    </div>
  );
}

export function DashboardPeakHoursChart({ data, loading }: DashboardPeakHoursChartProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  // Find max hour to highlight
  const maxOrders = Math.max(...data.map((d) => d.orders), 1);

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
          <div className="p-2.5 rounded-xl bg-[#22D3EE]/10 text-[#22D3EE] border border-[#22D3EE]/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Peak Ordering Hours</h3>
            <p className="text-[11px] text-[#A1A1AA]">Hourly distribution analysis</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-56 rounded-xl bg-black/10 animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-xs text-[#A1A1AA]">
          No hourly volume logged yet
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#A1A1AA' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#A1A1AA' }}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="orders" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.orders === maxOrders && maxOrders > 0 ? '#F5B342' : '#8B5CF6'}
                    opacity={entry.orders === maxOrders ? 1 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
