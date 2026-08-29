'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Utensils, ShoppingCart } from 'lucide-react';
import CustomerLayout from '../../components/customer/CustomerLayout';
import FoodCard from '../../components/customer/FoodCard';
import { useCart } from '../../context/CartContext';
import { menuService } from '../../services/menu.service';
import { useTableContext } from '../../context/TableContext';
import { MenuItem } from '@qr-menu/shared';

export default function FavoritesPage() {
  const { favorites } = useCart();
  const { restaurantId } = useTableContext();
  const [favoriteItems, setFavoriteItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    menuService.getMenuItems(restaurantId || undefined).then((all) => {
      if (isMounted) {
        const filtered = all.filter((i) => favorites.includes(i.id));
        setFavoriteItems(filtered);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [favorites, restaurantId]);

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>

          <div className="mt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
              Saved Dishes
            </p>
            <h1 className="mt-1 text-3xl font-black text-[var(--text-primary)] sm:text-4xl">
              Your Favorite Choices
            </h1>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">
              Dishes you've marked with a heart for quick ordering.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="h-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] animate-pulse"
              />
            ))}
          </div>
        ) : favoriteItems.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10 text-red-400 mb-5">
              <Heart className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-black text-[var(--text-primary)]">
              No favorites saved yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              Tap the heart icon on any dish card to keep your top cravings organized here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-6 text-xs font-black text-black transition hover:brightness-105"
            >
              <Utensils className="h-4 w-4" />
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favoriteItems.map((item) => (
              <FoodCard
                key={item.id}
                item={{
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  price: item.price,
                  rating: item.rating,
                  category: item.categoryId.replace(/^cat-/, '').toUpperCase(),
                  imageUrl: item.image,
                  badge: item.badge,
                  available: item.isAvailable,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
