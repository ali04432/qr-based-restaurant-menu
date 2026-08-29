'use client';

import React, { useEffect, useState } from 'react';
import { menuService } from '../../services/menu.service';
import { useTableContext } from '../../context/TableContext';

interface CategoryNavigationProps {
  categories?: Array<{ id: string; name: string }>;
  activeCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function CategoryNavigation({
  categories: initialCategories,
  activeCategory = 'All',
  onSelectCategory,
}: CategoryNavigationProps) {
  const { restaurantId } = useTableContext();
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>(
    initialCategories || []
  );

  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      return;
    }

    let isMounted = true;
    menuService.getCategories(restaurantId || undefined).then((cats) => {
      if (isMounted && cats.length > 0) {
        setCategories(cats.map((c) => ({ id: c.id, name: c.name })));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [restaurantId, initialCategories]);

  const defaultList = [
    { id: 'cat-all', name: 'All' },
    { id: 'cat-main', name: 'Main Courses' },
    { id: 'cat-pizza', name: 'Pizza' },
    { id: 'cat-burgers', name: 'Burgers' },
    { id: 'cat-bbq', name: 'BBQ & Grills' },
    { id: 'cat-pasta', name: 'Pasta' },
    { id: 'cat-rice', name: 'Rice' },
    { id: 'cat-app', name: 'Appetizers' },
    { id: 'cat-drinks', name: 'Drinks' },
    { id: 'cat-desserts', name: 'Desserts' },
    { id: 'cat-specials', name: "Chef's Specials" },
  ];

  const listToRender = categories.length > 0 ? categories : defaultList;
  const hasAll = listToRender.some((c) => c.name.toLowerCase() === 'all');
  const allCategories = hasAll ? listToRender : [{ id: 'cat-all', name: 'All' }, ...listToRender];

  return (
    <div className="flex items-center gap-3 mb-8 overflow-x-auto no-scrollbar py-1">
      {allCategories.map((cat) => {
        const isActive = activeCategory.toLowerCase() === cat.name.toLowerCase();
        return (
          <button
            key={cat.id}
            onClick={() => {
              if (onSelectCategory) onSelectCategory(cat.name);
            }}
            className={`
              px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200
              ${
                isActive
                  ? 'bg-[var(--accent-gold)] text-black font-bold shadow-lg shadow-[var(--accent-gold)]/20 scale-[1.02]'
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-color)] hover:border-[var(--accent-gold)]/30'
              }
            `}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}