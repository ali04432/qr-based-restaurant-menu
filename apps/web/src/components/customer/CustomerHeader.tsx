'use client';

import React, { useState, useCallback } from 'react';
import { Search, QrCode, ShoppingBag, Sun, Moon } from 'lucide-react';
import { useTableContext } from '../../context/TableContext';
import { useCartContext } from '../../context/CartContext';
import { useThemeContext } from '../../context/ThemeContext';

interface CustomerHeaderProps {
  onSearch?: (query: string) => void;
  onOpenScanQR?: () => void;
}

export function CustomerHeader({ onSearch, onOpenScanQR }: CustomerHeaderProps) {
  const { tableNumber } = useTableContext();
  const { items, openDrawer } = useCartContext();
  const { theme, toggleTheme } = useThemeContext();
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setSearchValue(q);
      onSearch?.(q);
    },
    [onSearch]
  );

  // Smooth Scroll Handler for Navigation Links
  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const cartItemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0c0c0e]/80 [data-theme=light]:bg-white/85 backdrop-blur-md border-b border-zinc-800/50 [data-theme=light]:border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between transition-all">

      {/* Mobile Branding */}
      <div className="lg:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center text-black font-bold text-lg shadow-[0_0_10px_rgba(245,158,11,0.3)]">
          L
        </div>
        <span className="font-display font-bold text-white [data-theme=light]:text-slate-900 tracking-wide">LUMIÈRE</span>
      </div>

      {/* Table Context Badge */}
      <div className="hidden lg:flex items-center gap-2">
        {tableNumber ? (
          <div className="bg-zinc-900/80 [data-theme=light]:bg-amber-50 border border-amber-500/30 py-1.5 px-3.5 rounded-full flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs font-semibold text-amber-300 [data-theme=light]:text-amber-700">Table {tableNumber}</span>
          </div>
        ) : (
          <div className="bg-zinc-900/60 [data-theme=light]:bg-slate-100 border border-zinc-800 [data-theme=light]:border-slate-200 py-1.5 px-3.5 rounded-full flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-400 [data-theme=light]:text-slate-600">Takeaway / Browsing</span>
          </div>
        )}
      </div>

      {/* Functional Navigation Links */}
      <nav className="hidden md:flex items-center gap-8">
        <a
          href="#menu"
          onClick={(e) => scrollToSection(e, 'menu')}
          className="text-xs font-medium text-zinc-200 [data-theme=light]:text-slate-700 hover:text-amber-400 [data-theme=light]:hover:text-amber-600 transition-colors tracking-wide cursor-pointer"
        >
          Menu
        </a>
        <a
          href="#offers"
          onClick={(e) => scrollToSection(e, 'offers')}
          className="text-xs font-medium text-zinc-400 [data-theme=light]:text-slate-500 hover:text-amber-400 [data-theme=light]:hover:text-amber-600 transition-colors tracking-wide cursor-pointer"
        >
          Offers
        </a>
        <a
          href="#reviews"
          onClick={(e) => scrollToSection(e, 'reviews')}
          className="text-xs font-medium text-zinc-400 [data-theme=light]:text-slate-500 hover:text-amber-400 [data-theme=light]:hover:text-amber-600 transition-colors tracking-wide cursor-pointer"
        >
          Reviews
        </a>
        <a
          href="#about"
          onClick={(e) => scrollToSection(e, 'about')}
          className="text-xs font-medium text-zinc-400 [data-theme=light]:text-slate-500 hover:text-amber-400 [data-theme=light]:hover:text-amber-600 transition-colors tracking-wide cursor-pointer"
        >
          About Us
        </a>
      </nav>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Search Input */}
        <div className="relative hidden sm:flex items-center">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 pointer-events-none stroke-[1.5]" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearch}
            placeholder="Search dish..."
            aria-label="Search menu"
            className="w-48 lg:w-64 pl-10 pr-4 py-2 bg-zinc-900/90 [data-theme=light]:bg-slate-100 border border-zinc-800/80 [data-theme=light]:border-slate-200 text-zinc-200 [data-theme=light]:text-slate-800 placeholder-zinc-500 text-xs rounded-full focus:border-amber-500/50 outline-none transition-all"
          />
        </div>

        {/* Scan QR */}
        <button
          onClick={onOpenScanQR}
          type="button"
          className="hidden sm:flex items-center gap-2 text-xs font-medium text-zinc-300 [data-theme=light]:text-slate-700 hover:text-amber-300 bg-zinc-900/60 [data-theme=light]:bg-slate-100 border border-zinc-800 [data-theme=light]:border-slate-200 rounded-full px-3.5 py-2 transition-all hover:border-amber-500/40"
        >
          <QrCode className="w-4 h-4 text-amber-400 stroke-[1.5]" />
          <span className="hidden lg:inline">Scan QR</span>
        </button>

        {/* Theme Toggle Button (Light/Dark Mode) */}
        <button
          onClick={toggleTheme}
          type="button"
          aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="p-2 rounded-full border border-zinc-800/80 [data-theme=light]:border-slate-300 bg-zinc-900/70 [data-theme=light]:bg-slate-100 text-zinc-300 [data-theme=light]:text-slate-700 hover:text-amber-400 [data-theme=light]:hover:text-amber-600 hover:border-amber-500/40 transition-all flex items-center justify-center active:scale-95"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400 stroke-[1.5]" />
          ) : (
            <Moon className="w-4 h-4 text-amber-600 stroke-[1.5]" />
          )}
        </button>

        {/* Cart Button */}
        <button
          onClick={openDrawer}
          type="button"
          className="relative flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold text-xs rounded-full px-4 py-2 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-all active:scale-95"
        >
          <ShoppingBag className="w-4 h-4 text-black stroke-[1.5]" />
          <span className="hidden sm:inline">Cart</span>
          {cartItemCount > 0 && (
            <span className="ml-1 bg-black text-amber-400 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
              {cartItemCount}
            </span>
          )}
        </button>

        {/* Profile Avatar */}
        <button className="w-8 h-8 rounded-full border border-amber-500/30 bg-zinc-900 [data-theme=light]:bg-slate-100 text-amber-400 font-semibold text-xs flex items-center justify-center hover:border-amber-500/60 transition-colors">
          GU
        </button>
      </div>
    </header>
  );
}

export default CustomerHeader;