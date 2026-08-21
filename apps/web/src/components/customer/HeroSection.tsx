'use client';

import React from 'react';
import { Star, Clock, Flame, ArrowRight, Play } from 'lucide-react';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full rounded-3xl overflow-hidden border border-zinc-800/80 p-6 md:p-10 mb-8 min-h-[380px] flex items-center">
      {/* ── Background Image Layer (Original Bar Interior) ── */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1600&auto=format&fit=crop')`,
        }}
      />

      {/* Dark Overlay gradient for high contrast text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/80 to-zinc-950/60" />

      {/* Content Layer */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center w-full">
        {/* Left Text */}
        <div className="lg:col-span-7 space-y-6">
          {/* Top Tag */}
          <div className="inline-flex items-center gap-2 bg-zinc-900/80 border border-amber-500/30 rounded-full px-3.5 py-1 text-xs text-amber-300 backdrop-blur-md">
            <Flame className="w-4 h-4 text-amber-400 stroke-[1.5]" />
            <span>Chef's Special Selection</span>
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight">
            Experience <br />
            <span className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent">
              Gourmet Dining
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed font-normal">
            Indulge in a symphony of flavors crafted by our award-winning chefs. Premium ingredients, unforgettable taste.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a
              href="#menu"
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-sm px-6 py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.25)]"
            >
              <span>Explore Menu</span>
              <ArrowRight className="w-4 h-4 stroke-[2]" />
            </a>

            <button
              type="button"
              className="flex items-center gap-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-sm font-medium px-5 py-3 rounded-xl transition-all backdrop-blur-md"
            >
              <Play className="w-4 h-4 text-amber-400 fill-amber-400 stroke-[1.5]" />
              <span>Watch Video</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 pt-4 border-t border-zinc-800/80">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 stroke-[1.5]" />
              <div>
                <span className="text-xs font-bold text-white block">4.9</span>
                <span className="text-[10px] text-zinc-400">1.2k+ reviews</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-1 rounded-full backdrop-blur-md">
                <Clock className="w-4 h-4 text-amber-400 stroke-[1.5]" />
                <span className="text-xs font-bold text-amber-400">15-20 min</span>
              </div>
              <span className="text-[10px] text-zinc-400">Prep time</span>
            </div>
          </div>
        </div>

        {/* Right Circular Featured Dish */}
        <div className="lg:col-span-5 flex justify-center relative">
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 rounded-full p-2 bg-gradient-to-b from-amber-500/40 to-transparent">
            <div className="w-full h-full rounded-full overflow-hidden border-2 border-amber-500/30 shadow-2xl relative">
              <img
                src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1000"
                alt="Smoked Ribs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Trending Dish Badge */}
          <div className="absolute bottom-4 right-2 bg-zinc-900/90 border border-zinc-800/90 backdrop-blur-md rounded-2xl p-2.5 flex items-center gap-3 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-400 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Trending Dish</p>
              <p className="text-[11px] text-amber-400 font-medium">Smoked Ribs</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;