"use client";

import React, { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
import { menuService } from "../../services/menu.service";
import { useTableContext } from "../../context/TableContext";
import { MenuItem } from "@qr-menu/shared";
import { UtensilsCrossed, RefreshCw, AlertCircle } from "lucide-react";

interface FoodGridProps {
  category?: string;
  searchQuery?: string;
}

export default function FoodGrid({ category = "All", searchQuery = "" }: FoodGridProps) {
  const { restaurantId } = useTableContext();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const timer = setTimeout(async () => {
      try {
        const result = await menuService.getMenuItems(
          restaurantId || undefined,
          category,
          searchQuery
        );
        if (isMounted) {
          setItems(result);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Failed to load menu items:", err);
          setError("Failed to load menu items. Please check connection.");
          setLoading(false);
        }
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [restaurantId, category, searchQuery]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <div
            key={n}
            className="flex flex-col rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] overflow-hidden animate-pulse"
          >
            <div className="h-48 bg-[var(--bg-elevated)] w-full" />
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="h-3 w-1/3 bg-[var(--bg-elevated)] rounded" />
                <div className="h-4 w-3/4 bg-[var(--bg-elevated)] rounded" />
                <div className="h-3 w-full bg-[var(--bg-elevated)] rounded" />
              </div>
              <div className="pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                <div className="h-4 w-1/4 bg-[var(--bg-elevated)] rounded" />
                <div className="h-8 w-16 bg-[var(--bg-elevated)] rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full bg-[var(--bg-card)] border border-red-500/20 rounded-2xl p-10 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <p className="text-base font-semibold text-[var(--text-primary)]">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-gold)] text-black text-xs font-bold hover:brightness-110 transition"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="col-span-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-12 text-center text-[var(--text-secondary)]">
        <div className="w-14 h-14 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] flex items-center justify-center text-[var(--accent-gold)] mx-auto mb-4">
          <UtensilsCrossed className="w-7 h-7" />
        </div>
        <p className="text-base font-bold text-[var(--text-primary)]">
          No exquisite dishes found matching your criteria.
        </p>
        <p className="text-xs mt-1.5 text-[var(--text-muted)] max-w-sm mx-auto">
          {searchQuery
            ? `No matches for "${searchQuery}". Try exploring other categories or clearing your search.`
            : "No items currently available in this category."}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
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
  );
}