'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Sparkles, ArrowUpRight, Eye, Layers } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { ArAsset } from '@qr-menu/shared';

interface DashboardARWidgetProps {
  assets: ArAsset[];
  totalViews?: number;
  loading: boolean;
}

export function DashboardARWidget({ assets, totalViews = 0, loading }: DashboardARWidgetProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const totalModels = assets.length;
  const readyModels = assets.filter((a) => a.modelUrl || (a as any).glbUrl).length;

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
          <div className="p-2.5 rounded-xl bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">3D & AR Menu Visuals</h3>
            <p className="text-[11px] text-[#A1A1AA]">Spatial dining experience</p>
          </div>
        </div>
        <Link
          href="/admin/ar"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Manage Models</span>
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
                isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Active 3D Models
              </span>
              <p className="text-xl font-black text-inherit mt-1 font-mono">{totalModels}</p>
              <p className="text-[10px] text-[#F97316] font-semibold mt-0.5">
                {readyModels} calibrated & live
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
                Customer AR Views
              </span>
              <p className="text-xl font-black text-[#22D3EE] mt-1 font-mono">{totalViews}</p>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">Interactive dish impressions</p>
            </div>
          </div>

          {/* Quick Action Button */}
          <Link
            href="/admin/ar"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#F97316]/10 border border-[#F97316]/30 text-[#F97316] hover:bg-[#F97316]/20 font-bold text-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Upload & Calibrate 3D Dish</span>
          </Link>
        </div>
      )}
    </div>
  );
}
