import React from 'react';
import { MenuItem } from '@qr-menu/shared';
import { FoodCard } from './FoodCard';

interface FoodGridProps {
  items: MenuItem[];
  loading?: boolean;
}

export function FoodGrid({ items, loading }: FoodGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="glass-card !p-0 h-80 animate-pulse">
            <div className="h-48 bg-surface-elevated/50 w-full border-b border-[var(--border-color)]"></div>
            <div className="p-5">
              <div className="h-6 bg-surface-elevated rounded mb-3 w-3/4"></div>
              <div className="h-4 bg-surface-elevated rounded mb-4 w-full"></div>
              <div className="h-4 bg-surface-elevated rounded mb-4 w-5/6"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-card text-center py-16">
        <p className="text-4xl mb-4">🍽️</p>
        <h3 className="text-xl font-bold text-white mb-2">No items found</h3>
        <p className="text-text-muted">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-fade-in">
      {items.map((item) => (
        <FoodCard key={item.id} item={item} />
      ))}
    </div>
  );
}
