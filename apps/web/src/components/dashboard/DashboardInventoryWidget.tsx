'use client';

import React from 'react';
import Link from 'next/link';
import { Boxes, AlertTriangle, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { InventoryItemSummary, LowStockAlert } from '@qr-menu/shared';

interface DashboardInventoryWidgetProps {
  inventory: InventoryItemSummary[];
  lowStockAlerts: LowStockAlert[];
  loading: boolean;
}

export function DashboardInventoryWidget({
  inventory,
  lowStockAlerts,
  loading,
}: DashboardInventoryWidgetProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const totalItems = inventory.length;
  const outOfStockCount = inventory.filter((i) => (i.stockCount || 0) <= 0).length;
  const criticalCount = lowStockAlerts.length;

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
          <div className="p-2.5 rounded-xl bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Inventory & Stock</h3>
            <p className="text-[11px] text-[#A1A1AA]">Ingredient supplies & thresholds</p>
          </div>
        </div>
        <Link
          href="/admin/inventory"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Inventory</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="h-44 rounded-xl bg-black/10 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Tracked
              </span>
              <p className="text-xl font-black text-inherit mt-1 font-mono">{totalItems}</p>
              <span className="text-[10px] text-[#22C55E] font-medium">Active items</span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Low Stock
              </span>
              <p className="text-xl font-black text-[#F5B342] mt-1 font-mono">{criticalCount}</p>
              <span className="text-[10px] text-[#F5B342] font-semibold">Under limit</span>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-rose-50/50 border-rose-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Out of Stock
              </span>
              <p className="text-xl font-black text-rose-500 mt-1 font-mono">{outOfStockCount}</p>
              <span className="text-[10px] text-rose-500 font-semibold">Immediate action</span>
            </div>
          </div>

          {/* Low Stock Items preview */}
          {lowStockAlerts.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-inherit/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                Critical Threshold Alerts:
              </span>
              <div className="space-y-1">
                {lowStockAlerts.slice(0, 3).map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs ${
                      isLight ? 'bg-rose-50' : 'bg-rose-950/20'
                    }`}
                  >
                    <span className="font-semibold text-inherit truncate">{alert.name}</span>
                    <span className="font-mono font-bold text-rose-500 shrink-0 ml-2">
                      {alert.stockCount} remaining
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
