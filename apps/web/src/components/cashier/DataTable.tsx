'use client';

import React from 'react';

interface DataTableProps {
  headers: string[];
  alignRightIndices?: number[];
  children: React.ReactNode;
  className?: string;
}

export function DataTable({
  headers,
  alignRightIndices = [],
  children,
  className = '',
}: DataTableProps) {
  return (
    <div className={`w-full overflow-x-auto bg-[#15171A] border border-[#25282D] rounded-[16px] shadow-lg ${className}`}>
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-[#1B1E23] border-b border-[#25282D] text-[11px] font-semibold tracking-[0.08em] uppercase text-[#A1A1AA]">
            {headers.map((h, idx) => (
              <th
                key={h}
                className={`p-[14px_16px] ${alignRightIndices.includes(idx) ? 'text-right' : ''}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#25282D]/60 text-[#F8FAFC]">
          {children}
        </tbody>
      </table>
    </div>
  );
}
