'use client';

import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color?: string; // value color, e.g. '#22C55E', '#F5B342', '#8B5CF6', '#22D3EE'
  tint?: string;  // icon bg tint, e.g. 'rgba(34,197,94,0.14)'
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = '#F8FAFC',
  tint = 'rgba(245,179,66,0.14)',
}: StatCardProps) {
  return (
    <div className="flex-1 min-w-[200px] bg-[#15171A] border border-[#25282D] rounded-[16px] p-[18px_20px] flex items-center justify-between gap-3 shadow-lg transition-all hover:border-[#F5B342]/30">
      <div className="min-w-0 flex flex-col gap-1.5">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-[#A1A1AA] uppercase">
          {label}
        </div>
        <div
          className="text-[26px] sm:text-[28px] font-bold leading-[1.1] font-mono tracking-tight truncate"
          style={{ color }}
        >
          {value}
        </div>
        <div className="text-[12px] text-[#A1A1AA] truncate font-medium">
          {sub}
        </div>
      </div>
      <div
        className="w-[44px] h-[44px] shrink-0 rounded-[12px] flex items-center justify-center"
        style={{ background: tint, color }}
      >
        {icon}
      </div>
    </div>
  );
}
