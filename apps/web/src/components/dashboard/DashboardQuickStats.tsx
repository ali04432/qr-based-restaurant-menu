'use client';

import React from 'react';
import { Gauge, QrCode, Eye, ShoppingBag } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

interface DashboardQuickStatsProps {
  tableOccupancy: number; // percentage
  qrScans: number;
  arViews: number;
  activeOrders: number;
  loading: boolean;
}

export function DashboardQuickStats({
  tableOccupancy,
  qrScans,
  arViews,
  activeOrders,
  loading,
}: DashboardQuickStatsProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const stats = [
    {
      title: 'Table Occupancy',
      value: `${tableOccupancy}%`,
      subtitle: 'Floor utilization rate',
      icon: <Gauge className="w-4 h-4" />,
      color: 'text-[#F5B342]',
      bg: 'bg-[#F5B342]/10 border-[#F5B342]/20',
    },
    {
      title: 'QR Scans Today',
      value: `${qrScans}`,
      subtitle: 'Digital guest entries',
      icon: <QrCode className="w-4 h-4" />,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20',
    },
    {
      title: 'AR 3D Views',
      value: `${arViews}`,
      subtitle: 'Menu model engagements',
      icon: <Eye className="w-4 h-4" />,
      color: 'text-[#22D3EE]',
      bg: 'bg-[#22D3EE]/10 border-[#22D3EE]/20',
    },
    {
      title: 'Active Orders',
      value: `${activeOrders}`,
      subtitle: 'In-progress dining orders',
      icon: <ShoppingBag className="w-4 h-4" />,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10 border-[#22C55E]/20',
    },
  ];

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-inherit">Quick Statistics</h3>
        <p className="text-[11px] text-[#A1A1AA]">Key floor & platform performance indicators</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-black/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div
              key={s.title}
              className={`p-3.5 rounded-xl border transition ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                  {s.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${s.bg} ${s.color}`}>
                  {s.icon}
                </div>
              </div>
              <p className="text-xl font-black text-inherit font-mono leading-none">
                {s.value}
              </p>
              <p className="text-[10px] text-[#A1A1AA] mt-1.5 font-medium">{s.subtitle}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
