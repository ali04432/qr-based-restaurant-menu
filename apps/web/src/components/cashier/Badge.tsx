'use client';

import React from 'react';

interface TableBadgeProps {
  tableNumber: string | number;
  size?: 'md' | 'lg';
}

export function TableBadge({ tableNumber, size = 'md' }: TableBadgeProps) {
  const formatted = typeof tableNumber === 'string' && tableNumber.toUpperCase().startsWith('T')
    ? tableNumber.toUpperCase()
    : `T${String(tableNumber).padStart(2, '0')}`;

  const dimClass = size === 'lg' ? 'w-[48px] h-[48px] rounded-[12px] text-[14px]' : 'w-[44px] h-[44px] rounded-[10px] text-[13px]';

  return (
    <div
      className={`${dimClass} shrink-0 bg-[rgba(245,179,66,0.14)] border border-[rgba(245,179,66,0.35)] text-[#F5B342] font-bold flex items-center justify-center font-mono`}
    >
      {formatted}
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
  variant?: 'amber' | 'green' | 'red' | 'purple' | 'cyan' | 'slate';
}

export function StatusBadge({ status, variant }: StatusBadgeProps) {
  let v = variant;
  if (!v) {
    const s = status.toUpperCase();
    if (s.includes('PAID') && !s.includes('UNPAID') && !s.includes('AWAITING')) v = 'green';
    else if (s.includes('UNPAID') || s.includes('AWAITING') || s.includes('PENDING')) v = 'amber';
    else if (s.includes('REFUND') || s.includes('CANCEL') || s.includes('FAILED')) v = 'red';
    else v = 'amber';
  }

  const styles = {
    amber: 'text-[#F5B342] bg-[rgba(245,179,66,0.12)] border-[rgba(245,179,66,0.35)]',
    green: 'text-[#22C55E] bg-[rgba(34,197,94,0.14)] border-[rgba(34,197,94,0.4)]',
    red: 'text-[#F97316] bg-[rgba(249,115,22,0.12)] border-[rgba(249,115,22,0.35)]',
    purple: 'text-[#8B5CF6] bg-[rgba(139,92,246,0.14)] border-[rgba(139,92,246,0.35)]',
    cyan: 'text-[#22D3EE] bg-[rgba(34,211,238,0.14)] border-[rgba(34,211,238,0.35)]',
    slate: 'text-[#A1A1AA] bg-[#1B1E23] border-[#25282D]',
  };

  return (
    <span
      className={`text-[10px] font-bold tracking-[0.08em] uppercase rounded-[6px] px-[8px] py-[3px] border ${styles[v]}`}
    >
      {status}
    </span>
  );
}

interface BrandPillProps {
  children: React.ReactNode;
}

export function BrandPill({ children }: BrandPillProps) {
  return (
    <span className="text-[11px] font-semibold text-[#F5B342] border border-[rgba(245,179,66,0.4)] bg-[rgba(245,179,66,0.08)] rounded-full px-[10px] py-[4px]">
      {children}
    </span>
  );
}
