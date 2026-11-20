'use client';

import React from 'react';

interface EmptyStateProps {
  message?: string;
  icon?: React.ReactNode;
}

export function EmptyState({
  message = 'No records match your criteria.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="p-[32px_12px] text-center text-[13px] text-[#A1A1AA] bg-[#1B1E23] border border-dashed border-[#25282D] rounded-[12px] flex flex-col items-center justify-center gap-2">
      {icon && <div className="text-[#A1A1AA]">{icon}</div>}
      <p>{message}</p>
    </div>
  );
}
