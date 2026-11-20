'use client';

import React from 'react';

export interface PillTabItem<T extends string = string> {
  id: T;
  label: string;
}

interface PillTabsProps<T extends string = string> {
  tabs: PillTabItem<T>[];
  activeTab: T;
  onChange: (tab: T) => void;
  ariaLabel?: string;
}

export function PillTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = 'Filter tabs',
}: PillTabsProps<T>) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-[4px] bg-[#1B1E23] rounded-[12px] p-[4px] border border-[#25282D]/60"
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`min-h-[44px] px-[16px] rounded-[9px] text-[13px] font-semibold transition-all cursor-pointer box-border outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1B1E23] ${
              isActive
                ? 'bg-[#F5B342] text-[#08090B] border border-[#F5B342] shadow-sm font-bold'
                : 'bg-transparent text-[#A1A1AA] border border-transparent hover:text-[#F8FAFC]'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
