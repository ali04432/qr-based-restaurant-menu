'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Search,
    SlidersHorizontal,
    Sparkles,
    UtensilsCrossed,
    CircleAlert,
} from 'lucide-react';

import CustomerLayout from '../../../components/customer/CustomerLayout';
import FoodGrid from '../../../components/customer/FoodGrid';
import CategoryNavigation from '../../../components/customer/CategoryNavigation';
import AIRecommendations from '../../../components/customer/AIRecommendations';

const CATEGORY_NAMES: Record<string, string> = {
    appetizers: 'Appetizers',
    soups: 'Soups',
    'main-courses': 'Main Courses',
    pizza: 'Pizza',
    burgers: 'Burgers',
    bbq: 'BBQ & Grills',
    pasta: 'Pasta',
    rice: 'Rice',
    salads: 'Salads',
    drinks: 'Drinks',
    desserts: 'Desserts',
    'chef-specials': "Chef's Specials",
    offers: 'Offers',
};

function getCategoryName(category: string): string {
    if (CATEGORY_NAMES[category]) {
        return CATEGORY_NAMES[category];
    }

    return category
        .split('-')
        .filter(Boolean)
        .map((word) => {
            return (
                word.charAt(0).toUpperCase() +
                word.slice(1)
            );
        })
        .join(' ');
}

export default function CategoryPage() {
    const params = useParams();
    const searchParams = useSearchParams();

    const [searchQuery, setSearchQuery] = useState('');

    const category = String(params?.category ?? '').toLowerCase();

    const categoryName = useMemo(() => {
        return getCategoryName(category);
    }, [category]);

    const section = searchParams.get('section');

    useEffect(() => {
        const initialSearch = searchParams.get('search');

        if (initialSearch) {
            setSearchQuery(initialSearch);
        }
    }, [searchParams]);

    const isValidCategory = Boolean(
        CATEGORY_NAMES[category]
    );

    const handleSearch = (query: string) => {
        setSearchQuery(query);
    };

    return (
        <CustomerLayout onSearch={handleSearch}>
            <div className="mx-auto w-full max-w-[1600px] px-4 pb-12 sm:px-6 lg:px-8">
                {/* Top navigation */}
                <div className="flex items-center gap-3 pt-5 sm:pt-7">
                    <Link
                        href="/menu"
                        aria-label="Back to menu"
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Link>

                    <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                            Silver Sapoon Menu
                        </p>

                        <p className="mt-1 text-sm font-medium text-[var(--text-secondary)]">
                            Explore our menu
                        </p>
                    </div>
                </div>

                {/* Category navigation */}
                <section className="mt-7">
                    <CategoryNavigation />
                </section>

                {/* Invalid category */}
                {!isValidCategory ? (
                    <section className="mt-10">
                        <div className="mx-auto max-w-xl rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10">
                                <CircleAlert className="h-6 w-6 text-[var(--accent-orange)]" />
                            </div>

                            <h1 className="mt-5 text-2xl font-black text-[var(--text-primary)]">
                                Category not found
                            </h1>

                            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                                The requested menu category is not
                                available.
                            </p>

                            <Link
                                href="/menu"
                                className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-[var(--accent-gold)] px-5 text-sm font-bold text-black transition hover:brightness-105"
                            >
                                Browse Full Menu
                            </Link>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* Category header */}
                        <section className="mt-9">
                            <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-7 lg:p-8">
                                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="max-w-3xl">
                                        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                                            <UtensilsCrossed className="h-3.5 w-3.5" />
                                            Category
                                        </div>

                                        <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--text-primary)] sm:text-4xl">
                                            {categoryName}
                                        </h1>

                                        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">
                                            Discover delicious dishes from our{' '}
                                            {categoryName.toLowerCase()} menu.
                                        </p>
                                    </div>

                                    <div className="flex w-fit items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] px-4 py-3">
                                        <Sparkles className="h-4 w-4 text-[var(--accent-gold)]" />

                                        <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                            Silver Sapoon Selection
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Search / filters */}
                        <section className="mt-6">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="relative w-full lg:max-w-md">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />

                                    <input
                                        type="search"
                                        value={searchQuery}
                                        onChange={(event) => {
                                            setSearchQuery(event.target.value);
                                        }}
                                        placeholder={`Search ${categoryName.toLowerCase()}...`}
                                        aria-label={`Search ${categoryName}`}
                                        className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={() => {
                                        window.dispatchEvent(
                                            new CustomEvent(
                                                'customer:filters-open'
                                            )
                                        );
                                    }}
                                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-4 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
                                >
                                    <SlidersHorizontal className="h-4 w-4" />
                                    Filters
                                </button>
                            </div>
                        </section>

                        {/* AI recommendations */}
                        <section className="mt-8">
                            <AIRecommendations />
                        </section>

                        {/* Menu items */}
                        <section className="mt-10">
                            <div className="mb-5">
                                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                                    Menu Selection
                                </p>

                                <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--text-primary)] sm:text-3xl">
                                    {section === 'trending'
                                        ? 'Trending Choices'
                                        : section === 'ai-picks'
                                            ? 'AI Picks For You'
                                            : categoryName}
                                </h2>

                                {searchQuery.trim() ? (
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                        Showing results for "{searchQuery}"
                                    </p>
                                ) : (
                                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                                        Explore the latest dishes from this category.
                                    </p>
                                )}
                            </div>

                            <FoodGrid
                                category={categoryName}
                                searchQuery={
                                    searchQuery.trim()
                                        ? searchQuery
                                        : undefined
                                }
                            />

                        </section>
                    </>
                )}
            </div>
        </CustomerLayout>
    );
}