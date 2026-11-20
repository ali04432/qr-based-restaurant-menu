'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardMetrics } from '@qr-menu/shared';

interface DashboardOrderStatusProps {
  metrics: DashboardMetrics | null;
  loading: boolean;
}

const STATUS_COLORS = {
  Pending: '#F97316',
  Completed: '#22C55E',
  Cancelled: '#EF4444',
};

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-[#1B1E23] border border-[#25282D] p-2.5 shadow-xl">
      <p className="text-xs font-semibold" style={{ color: payload[0]?.payload?.fill }}>
        {payload[0]?.name}: {payload[0]?.value}
      </p>
    </div>
  );
}

export function DashboardOrderStatus({ metrics, loading }: DashboardOrderStatusProps) {
  const data = [
    { name: 'Pending', value: metrics?.pendingOrders || 0, fill: STATUS_COLORS.Pending },
    { name: 'Completed', value: metrics?.completedOrders || 0, fill: STATUS_COLORS.Completed },
    { name: 'Cancelled', value: metrics?.cancelledOrders || 0, fill: STATUS_COLORS.Cancelled },
  ].filter((d) => d.value > 0);

  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="rounded-2xl bg-[#15171A] border border-[#25282D] p-5 shadow-lg">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-[#F8FAFC]">Order Status</h3>
        <p className="text-[11px] text-[#A1A1AA]">Overall distribution</p>
      </div>

      {loading ? (
        <div className="h-48 rounded-xl bg-[#1B1E23] animate-pulse" />
      ) : total === 0 ? (
        <div className="h-48 flex items-center justify-center text-xs text-[#A1A1AA]">
          No order data available
        </div>
      ) : (
        <div className="flex items-center gap-6">
          <div className="w-36 h-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={58}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-3">
            {data.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-xs text-[#A1A1AA]">{item.name}</span>
                </div>
                <span className="text-xs font-bold text-[#F8FAFC] font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
