'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  Bot,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Crown,
  Gift,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Menu,
  MessageSquare,
  Moon,

  PackageSearch,
  Pizza,
  Salad,
  Search,
  Settings,
  ShoppingBag,
  Soup,
  Sun,
  UtensilsCrossed,
  X,
} from 'lucide-react';

import { useTableContext } from '../../context/TableContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CategoryItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MAIN_NAV: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: Home,
  },
  {
    label: 'AI Picks For You',
    href: '/#ai-picks',
    icon: Bot,
  },
  {
    label: 'Trending',
    href: '/#trending',
    icon: Crown,
  },
  {
    label: 'Offers',
    href: '/menu/offers',
    icon: Gift,
  },
  {
    label: 'All Menu',
    href: '/menu',
    icon: LayoutGrid,
  },
];

const CATEGORIES: CategoryItem[] = [
  {
    label: 'Main Courses',
    href: '/menu/main-courses',
    icon: UtensilsCrossed,
  },
  {
    label: 'Pizza',
    href: '/menu/pizza',
    icon: Pizza,
  },
  {
    label: 'Burgers',
    href: '/menu/burgers',
    icon: ShoppingBag,
  },
  {
    label: 'BBQ & Grills',
    href: '/menu/bbq',
    icon: UtensilsCrossed,
  },
  {
    label: 'Pasta',
    href: '/menu/pasta',
    icon: UtensilsCrossed,
  },
  {
    label: 'Rice',
    href: '/menu/rice',
    icon: UtensilsCrossed,
  },
  {
    label: 'Appetizers',
    href: '/menu/appetizers',
    icon: Salad,
  },
  {
    label: 'Soups',
    href: '/menu/soups',
    icon: Soup,
  },
  {
    label: 'Salads',
    href: '/menu/salads',
    icon: Salad,
  },
  {
    label: 'Drinks',
    href: '/menu/drinks',
    icon: UtensilsCrossed,
  },
  {
    label: 'Desserts',
    href: '/menu/desserts',
    icon: UtensilsCrossed,
  },
  {
    label: "Chef's Specials",
    href: '/menu/chef-specials',
    icon: Crown,
  },
];

const ACCOUNT_NAV: NavItem[] = [
  {
    label: 'Order History',
    href: '/orders/history',
    icon: Clock3,
  },
  {
    label: 'Track Order',
    href: '/orders/track',
    icon: PackageSearch,
  },
  {
    label: 'Dining Feedback',
    href: '/feedback',
    icon: MessageSquare,
  },
  {
    label: 'Favorites',
    href: '/favorites',
    icon: Heart,
  },
  {
    label: 'Profile',
    href: '/orders',
    icon: CircleUserRound,
  },
];


function isActivePath(pathname: string, href: string) {
  if (href === '/') {
    return pathname === '/';
  }

  if (href.includes('#')) {
    return false;
  }

  if (pathname === href) {
    return true;
  }

  return pathname.startsWith(`${href}/`);
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem | CategoryItem;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200',
        active
          ? 'bg-[var(--accent-gold)] text-black shadow-[0_8px_25px_rgba(245,179,66,0.16)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]',
      ].join(' ')}
    >
      <Icon
        className={[
          'h-[18px] w-[18px] shrink-0 transition',
          active
            ? 'text-black'
            : 'text-[var(--text-muted)] group-hover:text-[var(--accent-gold)]',
        ].join(' ')}
      />

      <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
        {item.label}
      </span>

      {active && (
        <ChevronRight className="h-4 w-4 shrink-0 text-black/70" />
      )}
    </button>
  );
}

export default function CustomerSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const { tableNumber } = useTableContext();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLightTheme, setIsLightTheme] = useState(false);

  useEffect(() => {
    const root = document.documentElement;

    const savedTheme = localStorage.getItem(
      'silver_sapoon_theme'
    );

    if (savedTheme === 'light') {
      root.classList.add('light');
      setIsLightTheme(true);
    } else {
      root.classList.remove('light');
      setIsLightTheme(false);
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navigate = (href: string) => {
    if (href.includes('#')) {
      const [path, hash] = href.split('#');

      if (pathname === path || (path === '' && pathname === '/')) {
        const target = document.getElementById(hash);

        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        } else {
          router.push(href);
        }
      } else {
        router.push(href);
      }

      return;
    }

    router.push(href);
  };

  const toggleTheme = () => {
    const root = document.documentElement;
    const nextLight = !isLightTheme;

    if (nextLight) {
      root.classList.add('light');
      localStorage.setItem(
        'silver_sapoon_theme',
        'light'
      );
    } else {
      root.classList.remove('light');
      localStorage.setItem(
        'silver_sapoon_theme',
        'dark'
      );
    }

    setIsLightTheme(nextLight);
  };

  const sidebarContent = (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div className="border-b border-[var(--border-color)] px-5 py-5">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="group flex w-full items-center gap-3 text-left"
          aria-label="Go to Silver Sapoon home"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--accent-gold)]/30 bg-[var(--accent-gold)]/10">
            <UtensilsCrossed className="h-5 w-5 text-[var(--accent-gold)]" />
          </div>

          <div className="min-w-0">
            <div className="truncate font-serif text-lg font-semibold tracking-wide text-[var(--text-primary)]">
              Silver Sapoon
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[var(--accent-gold)]">
              Gourmet Dining
            </div>
          </div>

          <ChevronRight className="ml-auto h-4 w-4 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent-gold)]" />
        </button>
      </div>

      {/* Table */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-[var(--accent-gold)]/20 bg-[var(--accent-gold)]/5 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--accent-gold)]/20 bg-[var(--bg-card)]">
              <ShoppingBag className="h-4 w-4 text-[var(--accent-gold)]" />
            </div>

            <div className="min-w-0">
              <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Your Table
              </div>
              <div className="mt-0.5 truncate text-sm font-semibold text-[var(--text-primary)]">
                {tableNumber
                  ? `Table ${tableNumber}`
                  : 'Table not selected'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-1">
          {MAIN_NAV.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={isActivePath(pathname, item.href)}
              onClick={() => navigate(item.href)}
            />
          ))}
        </div>

        <div className="my-5 h-px bg-[var(--border-color)]" />

        <div className="mb-2 px-3">
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Categories
          </div>
        </div>

        <div className="space-y-1">
          {CATEGORIES.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={isActivePath(pathname, item.href)}
              onClick={() => navigate(item.href)}
            />
          ))}
        </div>

        <div className="my-5 h-px bg-[var(--border-color)]" />

        <div className="mb-2 px-3">
          <div className="text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
            Account
          </div>
        </div>

        <div className="space-y-1">
          {ACCOUNT_NAV.map((item) => (
            <NavButton
              key={item.label}
              item={item}
              active={isActivePath(pathname, item.href)}
              onClick={() => navigate(item.href)}
            />
          ))}
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-[var(--border-color)] p-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]">
            {isLightTheme ? (
              <Sun className="h-4 w-4 text-[var(--accent-gold)]" />
            ) : (
              <Moon className="h-4 w-4 text-[var(--accent-gold)]" />
            )}
          </div>

          <span className="flex-1 text-left text-xs font-medium">
            {isLightTheme
              ? 'Light Theme'
              : 'Dark Theme'}
          </span>

          <span className="text-[10px] text-[var(--text-muted)]">
            {isLightTheme ? 'ON' : 'ON'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs font-medium">
            Settings
          </span>
        </button>

        <div className="mt-3 px-3 text-[9px] leading-relaxed text-[var(--text-muted)]">
          Silver Sapoon Customer
          <br />
          Premium dining experience
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-[80] hidden w-[280px] border-r border-[var(--border-color)] bg-[var(--bg-secondary)] lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile top button */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        className="fixed left-4 top-4 z-[90] flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/95 text-[var(--text-primary)] shadow-lg backdrop-blur-xl lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay + sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[120] lg:hidden">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          <aside className="relative h-full w-[290px] max-w-[86vw] border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-muted)] transition hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" />
            </button>

            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}