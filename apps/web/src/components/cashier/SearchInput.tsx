'use client';

import React from 'react';
import { Search } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search order / table...',
  className = '',
}: SearchInputProps) {
  return (
    <label className={`relative block flex-1 min-w-[160px] ${className}`}>
      <span className="sr-only">{placeholder}</span>
      <Search
        className="w-[16px] h-[16px] text-[#A1A1AA] absolute left-[12px] top-[14px] pointer-events-none"
        strokeWidth={1.8}
        aria-hidden="true"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full box-border min-h-[44px] pl-[36px] pr-[12px] rounded-[12px] border border-[#25282D] bg-[#1B1E23] text-[#F8FAFC] text-[13px] placeholder-[#9A9AA3] outline-none transition-all focus:border-[#F5B342] focus:ring-2 focus:ring-[#F5B342] focus:ring-offset-2 focus:ring-offset-[#15171A]"
      />
    </label>
  );
}
