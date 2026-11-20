'use client';

import React from 'react';
import Link from 'next/link';
import { UtensilsCrossed, ArrowUpRight } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { TopSellingItem } from '@qr-menu/shared';

interface DashboardTopSellingProps {
  items: TopSellingItem[];
  loading: boolean;
}

const RANK_BADGES = [
  'bg-[#F5B342] text-[#08090B]',
  'bg-slate-300 text-[#08090B]',
  'bg-amber-600/70 text-white',
  'bg-slate-700 text-slate-200',
  'bg-slate-700 text-slate-200',
];

export function DashboardTopSelling({ items, loading }: DashboardTopSellingProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const maxQuantity = Math.max(...items.map((i) => i.totalQuantity), 1);

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
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Top-Selling Dishes</h3>
            <p className="text-[11px] text-[#A1A1AA]">Ranked by units sold</p>
          </div>
        </div>
        <Link
          href="/admin/reports"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Full Report</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-black/10 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#A1A1AA]">
          No sales logged for this period
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => {
            const percent = Math.round((item.totalQuantity / maxQuantity) * 100);

            return (
              <div
                key={item.id}
                className={`p-3 rounded-xl border transition ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-[#1B1E23] border-[#25282D]'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 ${
                        RANK_BADGES[idx] || RANK_BADGES[4]
                      }`}
                    >
                      #{idx + 1}
                    </span>

                    {/* Dish Image */}
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-10 h-10 rounded-lg object-cover border border-[#25282D] shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[#25282D] flex items-center justify-center text-[#F5B342] shrink-0">
                        <UtensilsCrossed className="w-5 h-5 opacity-60" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-inherit truncate leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-[#A1A1AA]">{item.categoryName || 'Main'}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-inherit font-mono">
                      {item.totalQuantity} sold
                    </p>
                    <p className="text-[10px] text-[#F5B342] font-mono font-semibold">
                      Rs. {item.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Sales Progress Indicator */}
                <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#F5B342] to-[#D6A84F] rounded-full transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
