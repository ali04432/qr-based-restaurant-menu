'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import {
  Bell,
  Menu,
  Search,
  ShoppingCart,
  Sun,
  Moon,
  User,
  X,
  MapPin,
} from 'lucide-react';

import { useTableContext } from '../../context/TableContext';
import { useThemeContext } from '../../context/ThemeContext';
import { useCartContext } from '../../context/CartContext';

interface CustomerHeaderProps {
  onSearch?: (query: string) => void;
}

export function CustomerHeader({
  onSearch,
}: CustomerHeaderProps) {
  const { tableNumber } = useTableContext();
  const { theme, toggleTheme } = useThemeContext();
  const { items } = useCartContext();

  const [searchValue, setSearchValue] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] =
    useState(false);
  const [notificationCount, setNotificationCount] =
    useState(0);

  const cartItemCount = items.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const formattedTable =
    tableNumber &&
      String(tableNumber).length === 1
      ? `0${tableNumber}`
      : tableNumber || '--';

  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;

      setSearchValue(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  const openSidebar = () => {
    window.dispatchEvent(
      new CustomEvent('customer:sidebar-open')
    );
  };

  const openCart = () => {
    /*
     * We intentionally avoid depending on a specific
     * CartContext drawer method because your local
     * CartContext API differs from the repository snapshot.
     *
     * CartDrawer can listen to this event globally.
     */
    window.dispatchEvent(
      new CustomEvent('customer:cart-open')
    );
  };

  const openNotifications = () => {
    setNotificationCount(0);

    window.dispatchEvent(
      new CustomEvent(
        'customer:notifications-open'
      )
    );
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border-color)] bg-[var(--bg-page)]/90 backdrop-blur-xl">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        {/* Mobile sidebar */}
        <button
          type="button"
          onClick={openSidebar}
          aria-label="Open navigation menu"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Search */}
        <div className="hidden min-w-0 flex-1 md:block">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />

            <input
              type="search"
              value={searchValue}
              onChange={handleSearch}
              placeholder="Search food, dishes, flavors..."
              aria-label="Search menu"
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] transition focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          {/* Mobile search */}
          <button
            type="button"
            onClick={() =>
              setMobileSearchOpen(
                (current) => !current
              )
            }
            aria-label={
              mobileSearchOpen
                ? 'Close search'
                : 'Open search'
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] md:hidden"
          >
            {mobileSearchOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>

          {/* Table */}
          <div className="hidden h-10 items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] px-3 sm:flex">
            <MapPin className="h-4 w-4 text-[var(--accent-gold)]" />

            <div className="leading-none">
              <div className="text-[8px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Table
              </div>

              <div className="mt-1 text-xs font-bold text-[var(--text-primary)]">
                {formattedTable}
              </div>
            </div>
          </div>

          {/* Theme */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark'
                ? 'light'
                : 'dark'
              } theme`}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          {/* Notifications */}
          <button
            type="button"
            onClick={openNotifications}
            aria-label="Notifications"
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)]"
          >
            <Bell className="h-4 w-4" />

            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--bg-page)] bg-[var(--accent-orange)] px-1 text-[9px] font-bold text-white">
                {notificationCount > 9
                  ? '9+'
                  : notificationCount}
              </span>
            )}
          </button>

          {/* Profile */}
          <Link
            href="/profile"
            aria-label="Open profile"
            className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-secondary)] transition hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] sm:flex"
          >
            <User className="h-4 w-4" />
          </Link>

          {/* Cart */}
          <button
            type="button"
            onClick={openCart}
            aria-label={`Open cart${cartItemCount > 0
                ? ` with ${cartItemCount} items`
                : ''
              }`}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10 text-[var(--accent-gold)] transition hover:border-[var(--accent-gold)]/50 hover:bg-[var(--accent-gold)]/15"
          >
            <ShoppingCart className="h-4 w-4" />

            {cartItemCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-[var(--bg-page)] bg-[var(--accent-orange)] px-1 text-[9px] font-bold text-white">
                {cartItemCount > 99
                  ? '99+'
                  : cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile search */}
      {mobileSearchOpen && (
        <div className="border-t border-[var(--border-color)] bg-[var(--bg-page)] px-4 py-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />

            <input
              autoFocus
              type="search"
              value={searchValue}
              onChange={handleSearch}
              placeholder="Search food..."
              aria-label="Search menu"
              className="h-11 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] pl-11 pr-4 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent-gold)]/40 focus:ring-2 focus:ring-[var(--accent-gold)]/10"
            />
          </div>
        </div>
      )}
    </header>
  );
}

export default CustomerHeader;