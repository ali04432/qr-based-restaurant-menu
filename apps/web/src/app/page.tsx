'use client';

import React, { useState } from 'react';

import CustomerLayout from '../components/customer/CustomerLayout';
import HeroSection from '../components/customer/HeroSection';
import CategoryNavigation from '../components/customer/CategoryNavigation';
import FoodGrid from '../components/customer/FoodGrid';
import AIRecommendations from '../components/customer/AIRecommendations';
import BottomInfoBar from '../components/customer/BottomInfoBar';

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleCategorySelect = (category: string) => {
    setActiveCategory(category);
  };

  return (
    <CustomerLayout onSearch={handleSearch}>
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-10 sm:px-6 lg:px-8">
        {/* Hero */}
        <section className="pt-5 sm:pt-7 lg:pt-8">
          <HeroSection />
        </section>

        {/* Categories */}
        <section className="mt-8">
          <CategoryNavigation
            activeCategory={activeCategory}
            onSelectCategory={handleCategorySelect}
          />
        </section>

        {/* AI Recommendations */}
        {!searchQuery && activeCategory === 'All' && (
          <section className="mt-10">
            <AIRecommendations onSelectCategory={handleCategorySelect} />
          </section>
        )}

        {/* Search / Filtered Dishes */}
        {searchQuery.trim() ? (
          <section className="mt-10">
            <div className="mb-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                Search
              </p>

              <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                Search Results
              </h2>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Showing results for "{searchQuery}"
              </p>
            </div>

            <FoodGrid category={activeCategory} searchQuery={searchQuery} />
          </section>
        ) : (
          <>
            {/* Main Menu */}
            <section className="mt-10">
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                  {activeCategory === 'All' ? 'Explore' : activeCategory}
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                  {activeCategory === 'All' ? 'Our Menu' : `${activeCategory} Selection`}
                </h2>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {activeCategory === 'All'
                    ? 'Discover something delicious from Silver Sapoon.'
                    : `Finest ${activeCategory.toLowerCase()} prepared fresh by our culinary team.`}
                </p>
              </div>

              <FoodGrid category={activeCategory} />
            </section>

            {/* Exclusive Offers Banner */}
            {activeCategory === 'All' && (
              <section className="mt-14">
                <div className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-6 sm:p-8 relative">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--accent-orange)]/5 rounded-full blur-3xl pointer-events-none" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-orange)]">
                    Silver Sapoon
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                    Exclusive Dining Experience
                  </h2>

                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                    Enjoy contactless table ordering, personalized recommendations from our AI chef, and real-time live kitchen tracking.
                  </p>
                </div>
              </section>
            )}
          </>
        )}

        {/* Bottom information */}
        <section className="mt-12">
          <BottomInfoBar />
        </section>
      </div>
    </CustomerLayout>
  );
}