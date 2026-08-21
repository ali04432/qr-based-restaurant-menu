'use client';

import React, { useState, useEffect, useCallback } from 'react';

// Component Imports
import { CustomerSidebar } from '../components/customer/CustomerSidebar';
import { CustomerHeader } from '../components/customer/CustomerHeader';
import { HeroSection } from '../components/customer/HeroSection';
import { CategoryNavigation } from '../components/customer/CategoryNavigation';
import { FoodGrid } from '../components/customer/FoodGrid';
import { CartDrawer } from '../components/customer/CartDrawer';
import { BottomInfoBar } from '../components/customer/BottomInfoBar';

// Default Export Components
import AIRecommendations from '../components/customer/AIRecommendations';
import PromoCard from '../components/customer/PromoCard';
import FloatingAIAssistant from '../components/customer/FloatingAIAssistant';

// Contexts & Services
import { useTableContext } from '../context/TableContext';
import { menuService } from '../services/menu.service';
import { aiService } from '../services/ai.service';
import type { MenuCategory, MenuItem } from '@qr-menu/shared';

const DEFAULT_RESTAURANT_ID = '1';

export default function CustomerMenuPage() {
  const { restaurantId, tableNumber, isLoading: isTableLoading } = useTableContext();
  const effectiveRestaurantId = restaurantId ?? DEFAULT_RESTAURANT_ID;

  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState('cat-all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMenuLoading, setIsMenuLoading] = useState(true);
  const [isAiLoading, setIsAiLoading] = useState(true);

  // Load categories
  useEffect(() => {
    if (isTableLoading) return;
    menuService.getCategories(effectiveRestaurantId).then((cats) => {
      setCategories(cats);
    });
  }, [effectiveRestaurantId, isTableLoading]);

  // Load menu items
  useEffect(() => {
    if (isTableLoading) return;
    setIsMenuLoading(true);
    menuService
      .getMenuItems(
        effectiveRestaurantId,
        activeCategoryId === 'cat-all' ? undefined : activeCategoryId,
        searchQuery || undefined
      )
      .then((items) => {
        setMenuItems(items);
        setIsMenuLoading(false);
      });
  }, [effectiveRestaurantId, activeCategoryId, searchQuery, isTableLoading]);

  // Load AI recommendations
  useEffect(() => {
    if (isTableLoading) return;
    setIsAiLoading(true);
    aiService
      .getRecommendations(effectiveRestaurantId, tableNumber ?? 'takeaway')
      .then((items) => {
        setAiRecommendations(items);
        setIsAiLoading(false);
      });
  }, [effectiveRestaurantId, tableNumber, isTableLoading]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (q) setActiveCategoryId('cat-all'); // reset to all when searching
  }, []);

  return (
    <div className="relative min-h-screen bg-bg-page antialiased">
      {/* ── Background Noise Texture Restoration (Matches Pic 0) ── */}
      <div className="absolute inset-0 bg-noise-pattern opacity-[0.02] pointer-events-none mix-blend-overlay" />

      {/* ── Sidebar (desktop only — fixed left) */}
      <CustomerSidebar />

      {/* ── Main content area ── */}
      <div className="relative z-10 lg:pl-64 flex flex-col min-h-screen">

        {/* Sticky header */}
        <CustomerHeader onSearch={handleSearch} />

        {/* Page content */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-12 py-8 max-w-screen-2xl mx-auto w-full">

          {/* Hero banner */}
          <section id="hero" aria-label="Featured dishes">
            <HeroSection />
          </section>

          {/* AI Picks (skip when searching) */}
          {!searchQuery && (
            <section id="ai-picks" aria-label="AI Recommendations">
              {isAiLoading ? (
                <div className="mb-12 animate-pulse">
                  <div className="h-8 bg-surface-elevated rounded-lg w-48 mb-6" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="glass-card !p-0 h-80">
                        <div className="h-48 bg-surface-elevated/50 w-full border-b border-[var(--border-color)]" />
                        <div className="p-5">
                          <div className="h-6 bg-surface-elevated rounded mb-3 w-3/4" />
                          <div className="h-4 bg-surface-elevated rounded mb-4 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <AIRecommendations items={aiRecommendations} tableNumber={tableNumber} />
              )}
            </section>
          )}

          {/* Promo Cards */}
          {!searchQuery && (
            <section id="offers" aria-label="Special offers">
              <PromoCard />
            </section>
          )}

          {/* Full Menu */}
          <section id="menu" aria-label="Full menu">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-white">
                {searchQuery ? `Search results for "${searchQuery}"` : 'Full Menu'}
              </h2>
              <p className="text-text-secondary text-sm mt-1">
                {menuItems.length} {menuItems.length === 1 ? 'item' : 'items'} available
              </p>
            </div>

            {!searchQuery && (
              <CategoryNavigation
                categories={categories}
                activeCategoryId={activeCategoryId}
                onSelectCategory={setActiveCategoryId}
              />
            )}

            <FoodGrid items={menuItems} loading={isMenuLoading} />
          </section>

          {/* Footer info */}
          <section id="about" aria-label="Restaurant info">
            <BottomInfoBar />
          </section>
        </main>
      </div>

      {/* Global overlays */}
      <CartDrawer />

      {/* Floating AI assistant */}
      <FloatingAIAssistant />
    </div>
  );
}