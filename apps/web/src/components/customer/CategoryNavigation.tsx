import React, { useRef } from 'react';
import { MenuCategory } from '@qr-menu/shared';

interface CategoryNavigationProps {
  categories: MenuCategory[];
  activeCategoryId: string;
  onSelectCategory: (categoryId: string) => void;
}

export function CategoryNavigation({ categories, activeCategoryId, onSelectCategory }: CategoryNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <div className="relative flex items-center mb-8 group">
      {/* Scroll Left Button */}
      <button 
        onClick={() => scroll('left')}
        className="absolute left-0 z-10 w-8 h-8 flex items-center justify-center bg-bg-page/80 backdrop-blur-sm border border-[var(--border-color)] rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
      >
        &#8592;
      </button>

      {/* Categories */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-x-auto no-scrollbar py-2 px-6 sm:px-10 flex items-center gap-3"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {categories.map((category) => {
          const isActive = activeCategoryId === category.id;
          return (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 border ${
                isActive 
                  ? 'bg-brand-500 text-white border-brand-500 shadow-glow' 
                  : 'bg-surface-elevated text-text-secondary border-[var(--border-color)] hover:bg-surface-muted hover:text-white'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Scroll Right Button */}
      <button 
        onClick={() => scroll('right')}
        className="absolute right-12 z-10 w-8 h-8 flex items-center justify-center bg-bg-page/80 backdrop-blur-sm border border-[var(--border-color)] rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0"
      >
        &#8594;
      </button>

      {/* Filter Button */}
      <div className="absolute right-0 pl-4 bg-gradient-to-l from-bg-page via-bg-page to-transparent z-10">
        <button className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-elevated border border-[var(--border-color)] text-white hover:text-brand-400 hover:border-brand-500/50 transition-colors">
          ⚙️
        </button>
      </div>
    </div>
  );
}
