'use client';

import React, { useState } from 'react';
import { Search, Plus, Check, AlertCircle, Sparkles, Filter, Edit2 } from 'lucide-react';
import { mockMenuItems, mockCategories } from '../../data/mockMenuData';
import { MenuItem } from '@qr-menu/shared';

export function KdsMenuManagement() {
  const [items, setItems] = useState<MenuItem[]>(mockMenuItems);
  const [selectedCategory, setSelectedCategory] = useState('cat-all');
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const toggleAvailability = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, isAvailable: !item.isAvailable } : item
      )
    );
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'cat-all' || item.categoryId === selectedCategory;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const availableCount = items.filter((i) => i.isAvailable).length;
  const soldOutCount = items.length - availableCount;

  return (
    <div className="h-full flex flex-col overflow-hidden p-6 pb-24 space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">Total Menu Items</p>
            <p className="text-2xl font-bold text-white mt-1">{items.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400">
            🍽️
          </div>
        </div>

        <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">Active / In Stock</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{availableCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">Sold Out / 86'd</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{soldOutCount}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>

        <div className="bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400 font-medium">Categories</p>
            <p className="text-2xl font-bold text-amber-400 mt-1">{mockCategories.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" strokeWidth={1.5} />
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-[#0D0F12] border border-zinc-800/60 rounded-xl p-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar w-full md:w-auto pb-2 md:pb-0">
          {mockCategories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-400'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" strokeWidth={1.5} />
            <input
              type="text"
              placeholder="Search dishes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#131518] border border-zinc-800/60 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>
        </div>
      </div>

      {/* Dishes Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-[#0D0F12] border ${
                item.isAvailable ? 'border-zinc-800/60' : 'border-rose-500/30 opacity-75'
              } rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all hover:border-zinc-700`}
            >
              <div className="flex items-start gap-3">
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover border border-zinc-800 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                    <span className="text-xs font-bold text-amber-400 shrink-0">
                      ${Number(item.price).toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Tags & Prep Time */}
              <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-2 border-t border-zinc-800/60">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                    ⏱️ {item.prepTimeMin}-{item.prepTimeMax}m
                  </span>
                  {item.badge && (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Stock Toggle Button */}
                <button
                  onClick={() => toggleAvailability(item.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    item.isAvailable
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25'
                  }`}
                >
                  {item.isAvailable ? 'In Stock' : '86\'d (Sold Out)'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
