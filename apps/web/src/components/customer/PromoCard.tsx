'use client';

import React from 'react';
import { Clock, Bot, ArrowRight } from 'lucide-react';

export const PromoCard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 my-8">

      {/* 1. Happy Hour Cocktails Card */}
      <div className="relative bg-[#17181B] border border-[#1D1F23] hover:border-[#D6A84F]/40 rounded-3xl p-6 overflow-hidden flex flex-col justify-between min-h-[200px] transition-all group shadow-[0_15px_40px_rgba(0,0,0,0.6)]">

        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-35"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/90 to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 bg-[#111214] border border-[#D6A84F]/30 px-3.5 py-1 rounded-full text-xs text-[#D6A84F] font-semibold backdrop-blur-md shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>5 PM - 7 PM</span>
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <h3 className="text-xl font-black text-[#F8FAFC]">Happy Hour Cocktails</h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">
            Enjoy 2-for-1 on all signature cocktails and premium spirits.
          </p>
          <a href="#drinks" className="text-xs font-bold text-[#D6A84F] hover:text-[#F59E0B] inline-flex items-center gap-1 pt-2 transition-colors">
            <span>View Drinks</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </a>
        </div>
      </div>

      {/* 2. 20% OFF AI Pairing Card */}
      <div className="relative bg-[#17181B] border border-[#1D1F23] hover:border-[#D6A84F]/40 rounded-3xl p-6 overflow-hidden flex flex-col justify-between min-h-[200px] transition-all group shadow-[0_15px_40px_rgba(0,0,0,0.6)]">

        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-35"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/90 to-transparent z-0" />

        <div className="relative z-10 flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-1.5 bg-[#D6A84F]/10 border border-[#D6A84F]/30 px-3.5 py-1 rounded-full text-xs text-[#D6A84F] font-semibold backdrop-blur-md shadow-sm">
            <Bot className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>AI Special</span>
          </div>
        </div>

        <div className="relative z-10 space-y-2">
          <h3 className="text-xl font-black text-[#F8FAFC]">20% OFF AI Pairing</h3>
          <p className="text-xs text-[#A1A1AA] max-w-sm leading-relaxed">
            Order our Wagyu Steak with a recommended Smoked Old Fashioned.
          </p>
          <button type="button" className="text-xs font-bold text-[#D6A84F] hover:text-[#F59E0B] inline-flex items-center gap-1 pt-2 transition-colors">
            <span>Claim Offer</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

    </div>
  );
};

export default PromoCard;