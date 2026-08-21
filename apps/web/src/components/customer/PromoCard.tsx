'use client';

import React from 'react';
import { Clock, Bot, ArrowRight } from 'lucide-react';

export const PromoCard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">

      {/* 1. Happy Hour Cocktails Card */}
      <div className="relative bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-6 overflow-hidden flex flex-col justify-between min-h-[200px] transition-all group shadow-lg">
        {/* Full Opacity (100%) Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-100"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop')`,
          }}
        />
        {/* Subtle Dark Gradient to Keep Text Readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/60 to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 bg-zinc-900/90 border border-amber-500/30 px-3 py-1 rounded-full text-xs text-amber-400 font-semibold backdrop-blur-md">
            <Clock className="w-3.5 h-3.5 text-amber-400 stroke-[1.5]" />
            <span>5 PM - 7 PM</span>
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <h3 className="text-xl font-bold text-white drop-shadow-md">Happy Hour Cocktails</h3>
          <p className="text-xs text-zinc-200 max-w-sm leading-relaxed drop-shadow-sm font-medium">
            Enjoy 2-for-1 on all signature cocktails and premium spirits.
          </p>
          <a href="#drinks" className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 pt-2 transition-colors drop-shadow-sm">
            <span>View Drinks</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </a>
        </div>
      </div>

      {/* 2. 20% OFF AI Pairing Card */}
      <div className="relative bg-zinc-900 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl p-6 overflow-hidden flex flex-col justify-between min-h-[200px] transition-all group shadow-lg">
        {/* Full Opacity (100%) Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-100"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop')`,
          }}
        />
        {/* Subtle Dark Gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/80 via-zinc-950/60 to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 px-3 py-1 rounded-full text-xs text-amber-300 font-semibold backdrop-blur-md">
            <Bot className="w-3.5 h-3.5 text-amber-400 stroke-[1.5]" />
            <span>AI Special</span>
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <h3 className="text-xl font-bold text-white drop-shadow-md">20% OFF AI Pairing</h3>
          <p className="text-xs text-zinc-200 max-w-sm leading-relaxed drop-shadow-sm font-medium">
            Order our Wagyu Steak with a recommended Smoked Old Fashioned.
          </p>
          <button type="button" className="text-xs font-bold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 pt-2 transition-colors drop-shadow-sm">
            <span>Claim Offer</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default PromoCard;