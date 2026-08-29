'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Star, Plus, ShoppingCart, Loader2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useTableContext } from '../../context/TableContext';
import { aiService } from '../../services/ai.service';
import { MenuItem } from '@qr-menu/shared';

interface AIRecommendationsProps {
  onSelectCategory?: (category: string) => void;
}

export default function AIRecommendations({ onSelectCategory }: AIRecommendationsProps) {
  const { addToCart } = useCart();
  const { restaurantId, tableNumber } = useTableContext();
  const [recommendations, setRecommendations] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    aiService
      .getRecommendations(restaurantId || '1', tableNumber || '07')
      .then((items) => {
        if (isMounted) {
          setRecommendations(items.slice(0, 3));
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load AI recommendations:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [restaurantId, tableNumber]);

  const handleAdd = (e: React.MouseEvent, item: MenuItem) => {
    e.preventDefault();
    e.stopPropagation();
    setAddingId(item.id);
    addToCart(item);
    setTimeout(() => setAddingId(null), 400);
  };

  if (loading) {
    return (
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/30 flex items-center justify-center text-[var(--accent-purple)]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--text-primary)]">AI Picks For You</h2>
            <p className="text-xs text-[var(--text-muted)]">Personalized from your taste and dining preferences.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] animate-pulse"
            />
          ))}
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent-purple)]/15 border border-[var(--accent-purple)]/30 flex items-center justify-center text-[var(--accent-purple)]">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-serif font-bold text-[var(--text-primary)]">AI Picks For You</h2>
            <p className="text-xs text-[var(--text-muted)]">
              Personalized for {tableNumber ? `Table ${tableNumber}` : 'your visit'}.
            </p>
          </div>
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {recommendations.map((dish) => {
          const isAdding = addingId === dish.id;
          return (
            <Link
              key={dish.id}
              href={`/menu/item/${encodeURIComponent(dish.id)}`}
              className="group bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl hover:border-[var(--accent-purple)]/50 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Image & Tag */}
                <div className="relative h-44 overflow-hidden bg-[var(--bg-elevated)]">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 px-3 py-1 bg-[var(--accent-purple)] text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>{dish.badge || 'AI Pick'}</span>
                  </div>
                  <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 backdrop-blur-md rounded-xl text-xs font-bold text-[var(--accent-gold)] flex items-center gap-1 border border-white/10">
                    <Star className="w-3.5 h-3.5 fill-[var(--accent-gold)]" />
                    <span>{dish.rating ? dish.rating.toFixed(1) : '4.9'}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-gold)] transition-colors">
                    {dish.name}
                  </h3>
                  <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{dish.description}</p>
                </div>
              </div>

              {/* Footer Price & Add Button */}
              <div className="p-4 pt-0 flex items-center justify-between">
                <span className="text-base font-black text-[var(--accent-gold)]">
                  Rs. {Number(dish.price).toLocaleString('en-PK')}
                </span>
                <button
                  type="button"
                  onClick={(e) => handleAdd(e, dish)}
                  disabled={!dish.isAvailable}
                  className="px-4 py-2 bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] text-black font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 active:scale-95 hover:brightness-110"
                >
                  {isAdding ? (
                    <ShoppingCart className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4 stroke-[3]" />
                  )}
                  <span>{isAdding ? 'Added' : 'Add'}</span>
                </button>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}