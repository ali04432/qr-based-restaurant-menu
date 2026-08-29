'use client';

import React from 'react';
import { Star, Clock, Flame, ArrowRight, Play } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section
      data-hero="true"
      className="relative w-full rounded-3xl overflow-hidden border border-white/10 dark:border-zinc-800 bg-[#0D0D10] text-white p-6 sm:p-10 md:p-12 mb-8 min-h-[400px] flex items-center shadow-2xl transition-all duration-300"
    >
      {/* ── Background Image Layer ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 transition-transform duration-1000 scale-105 hover:scale-100"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop')`,
        }}
      />

      {/* ── Dark Luxury Overlay ── */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0B0B0D] via-[#0B0B0D]/90 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0D] via-transparent to-transparent opacity-60" />

      {/* ── Content Layer ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center w-full">
        {/* Left Text */}
        <div className="lg:col-span-7 space-y-6">

          {/* Top Tag */}
          <div className="inline-flex items-center gap-2 bg-white/5 border border-[#C5A059]/30 backdrop-blur-md rounded-full px-3.5 py-1 text-xs text-[#E5C378] tracking-wide font-medium shadow-sm">
            <Flame className="w-3.5 h-3.5 text-[#E5C378] stroke-[1.5]" />
            <span>Chef's Special Selection</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-light text-white tracking-tight leading-[1.1]">
            Experience <br />
            <span className="font-semibold bg-gradient-to-r from-[#F3E5C8] via-[#C5A059] to-[#9E7B32] bg-clip-text text-transparent">
              Gourmet Dining
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed font-normal tracking-wide">
            Indulge in a symphony of refined flavors crafted by our master chefs using ethically sourced, seasonal ingredients.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#menu"
              className="group flex items-center gap-2.5 bg-gradient-to-r from-[#C5A059] to-[#A8833E] hover:from-[#D4AF37] hover:to-[#B8934B] text-black font-semibold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-[0_10px_25px_rgba(197,160,89,0.25)] active:scale-[0.98] transition-all duration-200"
            >
              <span>Explore Menu</span>
              <ArrowRight className="w-4 h-4 stroke-[1.5] group-hover:translate-x-1 transition-transform" />
            </a>

            <button
              type="button"
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs uppercase tracking-wider font-medium px-5 py-3.5 rounded-xl backdrop-blur-md active:scale-[0.98] transition-all duration-200"
            >
              <Play className="w-3.5 h-3.5 text-[#C5A059] fill-[#C5A059] stroke-[1.2]" />
              <span>Watch Story</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-8 pt-4 border-t border-white/10">
            <div className="flex items-center gap-2.5">
              <Star className="w-4 h-4 text-[#C5A059] fill-[#C5A059] stroke-[1.2]" />
              <div>
                <span className="text-xs font-semibold text-white block tracking-tight">4.9 / 5.0</span>
                <span className="text-[10px] text-zinc-400 tracking-wide">1,200+ Verified Reviews</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-lg backdrop-blur-md">
                <Clock className="w-3.5 h-3.5 text-[#C5A059] stroke-[1.5]" />
                <span className="text-xs font-medium text-[#E5C378]">15–20 min</span>
              </div>
              <span className="text-[10px] text-zinc-400 tracking-wide">Average Preparation</span>
            </div>
          </div>
        </div>

        {/* Right Circular Featured Dish */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="relative w-60 h-60 sm:w-72 sm:h-72 rounded-full p-2 bg-gradient-to-b from-[#C5A059]/30 via-white/5 to-transparent shadow-[0_0_50px_rgba(197,160,89,0.15)]">
            <div className="w-full h-full rounded-full overflow-hidden border border-white/20 shadow-2xl relative group">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000"
                alt="Smoked Ribs"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Trending Dish Badge */}
          <div className="absolute -bottom-2 right-2 sm:right-6 bg-[#141417]/90 border border-white/15 backdrop-blur-xl rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 rounded-xl bg-[#C5A059]/10 border border-[#C5A059]/30 flex items-center justify-center">
              <Flame className="w-4 h-4 text-[#C5A059] stroke-[1.5]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">Chef Choice</p>
              <p className="text-xs font-semibold text-white">Smoked Prime Ribs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;