'use client';

import React from 'react';
import { BrainCircuit } from 'lucide-react';
import { MenuItem } from '@qr-menu/shared';

interface AIRecommendationsProps {
  items?: MenuItem[];
  tableNumber?: string | null;
  children?: React.ReactNode;
}

export function AIRecommendations({ children }: AIRecommendationsProps) {
  return (
    <section className="my-8">
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center gap-3">

          {/* Orange/Amber Glowing 3D Robot Avatar */}
          <div className="relative w-11 h-11 rounded-2xl bg-zinc-900 border border-amber-500/50 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(245,158,11,0.3)] overflow-hidden">
            <svg
              className="w-7 h-7 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" fill="#451a03" />
              <circle cx="12" cy="5" r="2" fill="#f59e0b" />
              <path d="M12 7v4" />
              <line x1="8" y1="15" x2="8" y2="15.01" strokeWidth="3" stroke="#f59e0b" />
              <line x1="16" y1="15" x2="16" y2="15.01" strokeWidth="3" stroke="#f59e0b" />
              <path d="M9 18h6" stroke="#f59e0b" />
            </svg>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-zinc-950 animate-pulse" />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <h2 className="text-xl font-extrabold text-white tracking-wide">
              Smart AI Chef's Selection
            </h2>

            {/* Orange AI Powered Badge */}
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 w-fit">
              <BrainCircuit className="w-3.5 h-3.5 text-amber-400 stroke-[1.5]" />
              AI Powered
            </span>
          </div>
        </div>

        <p className="text-xs text-zinc-400 pl-14">
          Handpicked culinary recommendations tailored precisely to your taste, mood, and current time.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {children}
      </div>
    </section>
  );
}

export default AIRecommendations;