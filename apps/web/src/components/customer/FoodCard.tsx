'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Heart,
  Plus,
  Star,
  Eye,
  ShoppingCart,
} from 'lucide-react';

import { useCart } from '../../context/CartContext';

interface FoodItem {
  id: string;
  name: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  imageUrl: string;
  badge?: string;
  available?: boolean;
}

interface FoodCardProps {
  item: FoodItem;
}

export default function FoodCard({
  item,
}: FoodCardProps) {
  const { addToCart } = useCart() as any;

  const [isFavorite, setIsFavorite] =
    useState(false);

  const [isAdding, setIsAdding] =
    useState(false);

  const available =
    item.available !== false;

  const handleFavorite = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setIsFavorite(
      (current) => !current
    );
  };

  const handleAddToCart = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!available || isAdding) {
      return;
    }

    try {
      setIsAdding(true);

      addToCart?.(item);
    } finally {
      window.setTimeout(() => {
        setIsAdding(false);
      }, 350);
    }
  };

  return (
    <article
      className={[
        'group relative flex h-full flex-col overflow-hidden rounded-2xl',
        'border border-[var(--border-color)]',
        'bg-[var(--bg-card)]',
        'shadow-[var(--shadow-soft)]',
        'transition-all duration-300',
        'hover:-translate-y-1',
        'hover:border-[var(--accent-gold)]/30',
        'hover:shadow-[var(--shadow-card)]',
        !available
          ? 'opacity-75'
          : '',
      ].join(' ')}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-[var(--bg-elevated)]">
        <Link
          href={`/menu/item/${encodeURIComponent(
            item.id
          )}`}
          aria-label={`View ${item.name}`}
          className="block h-full w-full"
        >
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={[
              'h-full w-full object-cover',
              'transition-transform duration-500',
              'group-hover:scale-105',
              !available
                ? 'grayscale'
                : '',
            ].join(' ')}
          />

          {/* Image overlay */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
        </Link>

        {/* Badge */}
        {item.badge && (
          <span className="absolute left-3 top-3 rounded-full border border-[var(--accent-gold)]/30 bg-[var(--bg-secondary)]/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-gold)] backdrop-blur-md">
            {item.badge}
          </span>
        )}

        {/* Availability */}
        {!available && (
          <span className="absolute left-3 top-3 rounded-full border border-red-500/30 bg-[var(--bg-secondary)]/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 backdrop-blur-md">
            Unavailable
          </span>
        )}

        {/* Favorite */}
        <button
          type="button"
          onClick={handleFavorite}
          aria-label={
            isFavorite
              ? `Remove ${item.name} from favorites`
              : `Add ${item.name} to favorites`
          }
          aria-pressed={isFavorite}
          className={[
            'absolute right-3 top-3 flex h-9 w-9 items-center justify-center',
            'rounded-xl border backdrop-blur-md',
            'transition-all duration-200',
            isFavorite
              ? 'border-red-400/30 bg-red-500/10 text-red-400'
              : 'border-white/10 bg-black/45 text-white hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]',
          ].join(' ')}
        >
          <Heart
            className="h-4 w-4"
            fill={
              isFavorite
                ? 'currentColor'
                : 'none'
            }
          />
        </button>

        {/* Rating */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-md">
          <Star
            className="h-3.5 w-3.5 text-[var(--accent-gold)]"
            fill="currentColor"
          />

          <span>
            {Number.isFinite(item.rating)
              ? item.rating.toFixed(1)
              : '0.0'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col">
        <Link
          href={`/menu/item/${encodeURIComponent(
            item.id
          )}`}
          className="block flex-1 p-4"
        >
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--accent-gold)]">
            {item.category}
          </p>

          <h3 className="line-clamp-1 text-sm font-bold text-[var(--text-primary)] transition-colors group-hover:text-[var(--accent-gold)]">
            {item.name}
          </h3>

          <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {item.description}
          </p>
        </Link>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] p-4">
          <div className="min-w-0">
            <span className="block text-[10px] text-[var(--text-muted)]">
              Price
            </span>

            <span className="mt-0.5 block text-sm font-extrabold text-[var(--text-primary)]">
              Rs.{' '}
              {Number(item.price).toLocaleString(
                'en-PK'
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Details */}
            <Link
              href={`/menu/item/${encodeURIComponent(
                item.id
              )}`}
              aria-label={`View details for ${item.name}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] transition-all hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
            >
              <Eye className="h-4 w-4" />
            </Link>

            {/* Add */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={
                !available ||
                isAdding
              }
              aria-label={
                available
                  ? `Add ${item.name} to cart`
                  : `${item.name} is unavailable`
              }
              className={[
                'flex h-9 items-center gap-1.5 rounded-xl px-3.5',
                'text-xs font-bold text-black',
                'transition-all duration-200',
                'shadow-md',
                available
                  ? 'bg-gradient-to-r from-[var(--accent-gold)] to-[var(--accent-orange)] hover:brightness-110 active:scale-95'
                  : 'cursor-not-allowed bg-zinc-500',
              ].join(' ')}
            >
              {isAdding ? (
                <ShoppingCart className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4 stroke-[2.5]" />
              )}

              <span>
                {isAdding
                  ? 'Added'
                  : available
                    ? 'Add'
                    : 'Unavailable'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}