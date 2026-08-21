'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Filter, Search, Maximize, Minimize, Sun, Moon } from 'lucide-react';

interface KdsHeaderProps {
  onSearch: (q: string) => void;
  onFilter: (f: string) => void;
  soundEnabled: boolean;
  toggleSound: () => void;
  kdsTheme: 'dark' | 'light';
  toggleKdsTheme: () => void;
}

export function KdsHeader({
  onSearch,
  onFilter,
  soundEnabled,
  toggleSound,
  kdsTheme,
  toggleKdsTheme,
}: KdsHeaderProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [search, setSearch] = useState('');

  const isLight = kdsTheme === 'light';

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err.message);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onSearch(val);
  };

  /* Derived class helpers that respect the current theme */
  const headerBg = isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#08090B] border-zinc-800/60';

  const titleColor = isLight ? 'text-slate-900' : 'text-white';
  const subtitleColor = isLight ? 'text-slate-500' : 'text-zinc-500';

  const iconBtnBase = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200'
    : 'bg-[#131518] border-zinc-800/60 text-zinc-500 hover:text-white hover:bg-zinc-800/50';

  const filterBtnBase = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
    : 'bg-[#131518] border-zinc-800/60 text-zinc-400 hover:text-white hover:bg-zinc-800/50';

  const inputBase = isLight
    ? 'bg-slate-100 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-amber-400/60 focus:ring-amber-400/30'
    : 'bg-[#131518] border-zinc-800/60 text-white placeholder-zinc-500 focus:border-amber-500/50 focus:ring-amber-500/50';

  return (
    <header className={`h-16 border-b flex items-center justify-between px-6 sticky top-0 z-20 transition-colors duration-200 ${headerBg}`}>
      <div className="flex items-center gap-4">
        <h1 className={`text-lg font-medium tracking-tight ${titleColor}`}>Kitchen Order Screen</h1>
        <div className="flex items-center gap-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
          <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Live</span>
        </div>
        <p className={`text-sm hidden md:block ml-2 ${subtitleColor}`}>Real-time incoming orders from the restaurant</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Sound Toggle */}
        <button
          onClick={toggleSound}
          className={`p-2 rounded-md border transition-all ${
            soundEnabled
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              : `${iconBtnBase} border`
          }`}
          title={soundEnabled ? 'Mute new order sound' : 'Unmute new order sound'}
        >
          {soundEnabled ? (
            <Volume2 className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <VolumeX className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>

        {/* Filter */}
        <button
          onClick={() => onFilter('ALL')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md border transition-all ${filterBtnBase}`}
        >
          <Filter className="w-4 h-4" strokeWidth={1.5} />
          <span className="text-sm font-medium">Filter</span>
        </button>

        {/* Search */}
        <div className="relative">
          <Search
            className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${isLight ? 'text-slate-400' : 'text-zinc-500'}`}
            strokeWidth={1.5}
          />
          <input
            type="text"
            placeholder="Search order or table..."
            value={search}
            onChange={handleSearchChange}
            className={`w-64 border rounded-md py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 transition-all ${inputBase}`}
          />
        </div>

        {/* Theme Toggle — Sun / Moon */}
        <button
          onClick={toggleKdsTheme}
          className={`p-2 rounded-md border transition-all duration-200 ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-500 hover:bg-amber-100'
              : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:text-amber-400 hover:bg-zinc-700/60'
          }`}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          aria-label="Toggle KDS theme"
        >
          {isLight ? (
            <Moon className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <Sun className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={toggleFullscreen}
          className={`p-2 rounded-md border transition-all ${iconBtnBase}`}
          title="Toggle Fullscreen"
        >
          {isFullscreen ? (
            <Minimize className="w-4 h-4" strokeWidth={1.5} />
          ) : (
            <Maximize className="w-4 h-4" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </header>
  );
}
