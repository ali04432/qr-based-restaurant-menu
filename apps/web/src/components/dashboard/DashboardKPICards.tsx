'use client';

import React from 'react';
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { DashboardMetrics } from '@qr-menu/shared';

interface DashboardKPICardsProps {
  metrics: DashboardMetrics | null;
  previousPeriodGrowth?: {
    revenue: number;
    orders: number;
    aov: number;
    profit: number;
  };
  loading: boolean;
}

export function DashboardKPICards({
  metrics,
  previousPeriodGrowth = { revenue: 14.8, orders: 8.5, aov: 5.2, profit: 12.0 },
  loading,
}: DashboardKPICardsProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const cards = [
    {
      title: 'Total Revenue',
      value: `Rs. ${metrics?.todayRevenue?.toLocaleString() || '0'}`,
      subtitle: `${metrics?.profitMarginToday || 0}% profit margin`,
      growth: previousPeriodGrowth.revenue,
      icon: <DollarSign className="w-5 h-5" />,
      color: 'text-[#F5B342]',
      bg: 'bg-[#F5B342]/10 border-[#F5B342]/20',
      sparklineColor: '#F5B342',
      sparklinePoints: '0,20 10,18 20,15 30,19 40,12 50,8 60,11 70,5 80,2',
    },
    {
      title: 'Total Orders',
      value: `${metrics?.todayOrders || 0}`,
      subtitle: `${metrics?.completedOrders || 0} completed · ${metrics?.pendingOrders || 0} active`,
      growth: previousPeriodGrowth.orders,
      icon: <ShoppingBag className="w-5 h-5" />,
      color: 'text-[#8B5CF6]',
      bg: 'bg-[#8B5CF6]/10 border-[#8B5CF6]/20',
      sparklineColor: '#8B5CF6',
      sparklinePoints: '0,18 10,16 20,19 30,14 40,15 50,10 60,8 70,6 80,3',
    },
    {
      title: 'Average Order Value',
      value: `Rs. ${metrics?.averageOrderValue ? Math.round(Number(metrics.averageOrderValue)).toLocaleString() : '0'}`,
      subtitle: `${metrics?.activeTables || 0} active dine-in table(s)`,
      growth: previousPeriodGrowth.aov,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-[#22D3EE]',
      bg: 'bg-[#22D3EE]/10 border-[#22D3EE]/20',
      sparklineColor: '#22D3EE',
      sparklinePoints: '0,15 10,17 20,13 30,12 40,14 50,9 60,10 70,6 80,4',
    },
    {
      title: 'Gross Profit',
      value: `Rs. ${metrics?.grossProfitToday?.toLocaleString() || '0'}`,
      subtitle: `Computed from COGS inventory`,
      growth: previousPeriodGrowth.profit,
      icon: <CreditCard className="w-5 h-5" />,
      color: 'text-[#22C55E]',
      bg: 'bg-[#22C55E]/10 border-[#22C55E]/20',
      sparklineColor: '#22C55E',
      sparklinePoints: '0,22 10,19 20,18 30,14 40,16 50,11 60,7 70,8 80,2',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className={`relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:shadow-xl group ${
            isLight
              ? 'bg-white border-slate-200 text-slate-800 hover:border-[#F5B342]/50'
              : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC] hover:border-[#F5B342]/40'
          }`}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              {c.title}
            </span>
            <div className={`p-2.5 rounded-xl border ${c.bg} ${c.color}`}>
              {c.icon}
            </div>
          </div>

          {/* Metric Value */}
          {loading ? (
            <div className="h-8 w-28 rounded-lg bg-black/10 animate-pulse mb-2" />
          ) : (
            <p className="text-2xl sm:text-3xl font-black text-inherit tracking-tight font-mono leading-none mb-1.5">
              {c.value}
            </p>
          )}

          {/* Footer Info & Sparkline */}
          <div className="flex items-end justify-between mt-3 pt-2 border-t border-inherit/10">
            <div>
              <p className="text-[11px] text-[#A1A1AA] font-medium leading-tight">
                {c.subtitle}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-[#22C55E]">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>+{c.growth}% vs prev</span>
              </div>
            </div>

            {/* Sparkline Graphic */}
            <div className="w-16 h-8 shrink-0">
              <svg viewBox="0 0 80 24" className="w-full h-full overflow-visible">
                <polyline
                  fill="none"
                  stroke={c.sparklineColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={c.sparklinePoints}
                />
              </svg>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
