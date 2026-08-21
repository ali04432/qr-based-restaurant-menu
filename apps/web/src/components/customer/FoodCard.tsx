'use client';

import React, { useState } from 'react';
import { Heart, Star, Plus, Minus } from 'lucide-react';
import { MenuItem } from '@qr-menu/shared';
import { useCartContext } from '../../context/CartContext';
import { useFavoritesContext } from '../../context/FavoritesContext';

interface FoodCardProps {
  item: MenuItem;
}

export function FoodCard({ item }: FoodCardProps) {
  const { addItem } = useCartContext();
  const { isFavorite, toggleFavorite } = useFavoritesContext();
  const [quantity, setQuantity] = useState(1);

  const favorite = isFavorite(item.id);

  const handleAdd = () => {
    addItem(item, quantity);
    setQuantity(1); // reset after adding
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 hover:border-amber-500/40 rounded-2xl overflow-hidden flex flex-col h-full group transition-all duration-300">
      {/* Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-zinc-950">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
          {item.badge ? (
            <div className="px-2.5 py-1 text-[10px] font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-md backdrop-blur-md">
              {item.badge}
            </div>
          ) : <div />}

          {/* Clean Vector Heart Button */}
          <button
            type="button"
            onClick={() => toggleFavorite(item.id)}
            aria-label="Toggle Favorite"
            className="w-8 h-8 rounded-full bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-center hover:border-amber-500/40 transition-all backdrop-blur-md active:scale-90"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${favorite
                ? 'text-rose-500 fill-rose-500'
                : 'text-zinc-400 group-hover:text-rose-400'
                }`}
              strokeWidth={1.5}
            />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-base font-semibold text-zinc-100 leading-tight group-hover:text-amber-400 transition-colors">
              {item.name}
            </h3>

            {/* Rating Vector */}
            <div className="flex items-center gap-1 bg-zinc-900/80 border border-zinc-800 px-2 py-0.5 rounded-full text-[11px] font-medium text-amber-300">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400/20 stroke-[1.5]" />
              <span className="text-zinc-100 font-bold text-xs">{item.rating}</span>
            </div>
          </div>

          <p className="text-xs text-zinc-400 line-clamp-2 mb-4 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Footer: Price & Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800/50 mt-auto">
          <div>
            <p className="text-sm font-bold text-amber-400">Rs. {item.price.toLocaleString()}</p>
            <p className="text-[10px] text-zinc-500">Prep: {item.prepTimeMin}-{item.prepTimeMax}m</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quantity Selector */}
            <div className="flex items-center bg-zinc-900 rounded-xl border border-zinc-800 p-0.5">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-amber-400 transition-colors"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3 h-3 stroke-[2]" />
              </button>
              <span className="w-4 text-center text-xs font-bold text-zinc-200">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-amber-400 transition-colors"
                aria-label="Increase quantity"
              >
                <Plus className="w-3 h-3 stroke-[2]" />
              </button>
            </div>

            {/* Add Button */}
            <button
              type="button"
              onClick={handleAdd}
              className="w-9 h-9 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-semibold shadow-[0_0_10px_rgba(245,158,11,0.2)] transition-all flex items-center justify-center active:scale-95"
              aria-label="Add to cart"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}