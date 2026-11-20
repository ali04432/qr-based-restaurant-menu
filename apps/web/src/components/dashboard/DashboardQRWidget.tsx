'use client';

import React from 'react';
import Link from 'next/link';
import { QrCode, Plus, ArrowUpRight, CheckCircle2, ScanLine } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { Table } from '@qr-menu/shared';

interface DashboardQRWidgetProps {
  tables: Table[];
  totalScans?: number;
  totalOrdersFromQR?: number;
  loading: boolean;
}

export function DashboardQRWidget({
  tables,
  totalScans = 0,
  totalOrdersFromQR = 0,
  loading,
}: DashboardQRWidgetProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const totalTables = tables.length;
  const activeTables = tables.filter((t) => t.isActive).length;
  const occupiedTables = tables.filter((t) => (t as any).status === 'OCCUPIED' || !(t as any).isActive).length;

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
          <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">QR & Table Operations</h3>
            <p className="text-[11px] text-[#A1A1AA]">Dine-in contactless ordering</p>
          </div>
        </div>
        <Link
          href="/admin/tables"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Tables</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="h-44 rounded-xl bg-black/10 animate-pulse" />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-purple-50/50 border-purple-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Total QR Tables
              </span>
              <p className="text-xl font-black text-inherit mt-1 font-mono">{totalTables}</p>
              <p className="text-[10px] text-[#22C55E] font-medium mt-0.5">
                {activeTables} active on floor
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Current Seated
              </span>
              <p className="text-xl font-black text-[#F5B342] mt-1 font-mono">
                {occupiedTables} / {totalTables}
              </p>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                {totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0}% floor occupancy
              </p>
            </div>
          </div>

          {/* Quick Action Button */}
          <Link
            href="/admin/tables"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F5B342]/10 border border-[#F5B342]/30 text-[#F5B342] hover:bg-[#F5B342]/20 font-bold text-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Generate / Print QR Codes</span>
          </Link>
        </div>
      )}
    </div>
  );
}
