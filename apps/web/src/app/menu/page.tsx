'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Flame,
  Sparkles,
  Tag,
  UtensilsCrossed,
} from 'lucide-react';

import CustomerLayout from '../../components/customer/CustomerLayout';
import CategoryNavigation from '../../components/customer/CategoryNavigation';
import FoodGrid from '../../components/customer/FoodGrid';
import AIRecommendations from '../../components/customer/AIRecommendations';

function MenuContent() {
  const searchParams = useSearchParams();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const section = searchParams.get('section');

  const sectionTitle = useMemo(() => {
    if (section === 'ai-picks') {
      return 'AI Picks For You';
    }

    if (section === 'trending') {
      return 'Trending Today';
    }

    return 'Explore Our Menu';
  }, [section]);

  const sectionDescription = useMemo(() => {
    if (section === 'ai-picks') {
      return 'Personalized recommendations based on your dining preferences.';
    }

    if (section === 'trending') {
      return 'Discover dishes our guests are enjoying right now.';
    }

    return 'Browse our complete selection of carefully prepared dishes.';
  }, [section]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const showSearch = searchQuery.trim().length > 0;

  return (
    <CustomerLayout onSearch={handleSearch}>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
        {/* Page intro */}
        <section className="pt-5 sm:pt-7 lg:pt-8">
          <div className="relative overflow-hidden rounded-[28px] border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 lg:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-[var(--accent-gold)]/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-[var(--accent-orange)]/5 blur-3xl" />

            <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--accent-gold)]">
                  <UtensilsCrossed className="h-3.5 w-3.5" />
                  Silver Sapoon Menu
                </div>

                <h1 className="mt-3 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl lg:text-5xl">
                  {sectionTitle}
                </h1>

                <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                  {sectionDescription}
                </p>
              </div>

              <Link
                href="/"
                className="group inline-flex h-11 w-fit items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 text-xs font-bold text-[var(--text-secondary)] transition-all hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
              >
                Back to Home
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        </section>

        {/* Category navigation */}
        <section className="mt-7">
          <CategoryNavigation
            activeCategory={activeCategory}
            onSelectCategory={setActiveCategory}
          />
        </section>

        {/* Search context */}
        {showSearch && (
          <section className="mt-7">
            <div className="rounded-2xl border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)]">
                <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />
                Search results for:
                <span className="font-bold text-[var(--text-primary)]">
                  "{searchQuery}"
                </span>
              </div>
            </div>
          </section>
        )}

        {/* AI recommendations */}
        {!showSearch && section !== 'trending' && activeCategory === 'All' && (
          <section className="mt-9">
            <AIRecommendations onSelectCategory={setActiveCategory} />
          </section>
        )}

        {/* Food grid */}
        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                Menu Selection
              </div>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                {showSearch
                  ? 'Search Results'
                  : section === 'trending'
                  ? 'Trending Choices'
                  : section === 'ai-picks'
                  ? 'Recommended For You'
                  : activeCategory === 'All'
                  ? 'All Dishes'
                  : `${activeCategory}`}
              </h2>
            </div>
          </div>

          <FoodGrid
            category={activeCategory}
            searchQuery={showSearch ? searchQuery : undefined}
          />
        </section>
      </div>
    </CustomerLayout>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] flex items-center justify-center">
          Loading menu...
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}