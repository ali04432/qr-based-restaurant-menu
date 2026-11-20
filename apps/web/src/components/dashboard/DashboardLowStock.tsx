'use client';

import React from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { LowStockAlert } from '@qr-menu/shared';

interface DashboardLowStockProps {
  alerts: LowStockAlert[];
}

export function DashboardLowStock({ alerts }: DashboardLowStockProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="rounded-2xl bg-red-950/20 border border-red-800/40 p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-red-200 uppercase tracking-wider">
                Inventory Alert
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/15 text-red-300 border border-red-500/25">
                {alerts.length} Item{alerts.length > 1 ? 's' : ''} Critical
              </span>
            </div>
            <p className="text-[11px] text-red-300/70 mt-0.5">
              {alerts
                .slice(0, 3)
                .map((a) => `${a.name} (${a.stockCount} left)`)
                .join(', ')}
              {alerts.length > 3 ? '...' : ''}
            </p>
          </div>
        </div>
        <Link
          href="/admin/inventory"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shrink-0 shadow-md"
        >
          <span>Replenish Stock</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
