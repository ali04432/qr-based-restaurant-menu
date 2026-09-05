'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  ChefHat,
  ConciergeBell,
  Grid,
  UtensilsCrossed,
  Layers,
  Boxes,
  Users,
  CreditCard,
  TrendingUp,
  FileSpreadsheet,
  MessageSquare,
  Tag,
  Bot,
  Bell,
  Gift,
  Plug,
  Settings,
  Store,
  Crown,
  Shield,
  ShieldAlert,
  ChevronRight,
  LogOut,
  X,
  UserCheck,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: UserRole[];
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    name: 'Overview',
    href: '/admin',
    icon: LayoutDashboard,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Orders',
    href: '/admin/orders',
    icon: ShoppingBag,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER],
  },
  {
    name: 'Kitchen Display',
    href: '/admin/kitchen',
    icon: ChefHat,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF],
  },
  {
    name: 'Waiter Panel',
    href: '/admin/waiter',
    icon: ConciergeBell,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER, UserRole.CASHIER],
  },
  {
    name: 'Tables & QR',
    href: '/admin/tables',
    icon: Grid,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.WAITER],
  },
  {
    name: 'Menu Items',
    href: '/admin/menu',
    icon: UtensilsCrossed,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF],
  },
  {
    name: 'Categories',
    href: '/admin/categories',
    icon: Layers,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Inventory',
    href: '/admin/inventory',
    icon: Boxes,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF],
  },
  {
    name: 'Staff & Payroll',
    href: '/admin/staff',
    icon: Users,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Payments',
    href: '/admin/payments',
    icon: CreditCard,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CASHIER, UserRole.WAITER],
  },
  {
    name: 'Analytics & Profit',
    href: '/admin/analytics',
    icon: TrendingUp,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Reports & Export',
    href: '/admin/reports',
    icon: FileSpreadsheet,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Customer Feedback',
    href: '/admin/feedback',
    icon: MessageSquare,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Customers & History',
    href: '/admin/customers',
    icon: UserCheck,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Promotions',
    href: '/admin/promotions',
    icon: Tag,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'AI Business Assistant',
    href: '/admin/ai',
    icon: Bot,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Notifications',
    href: '/admin/notifications',
    icon: Bell,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF, UserRole.WAITER, UserRole.CASHIER],
  },
  {
    name: 'Loyalty & Rewards',
    href: '/admin/loyalty',
    icon: Gift,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Hardware & Integrations',
    href: '/admin/integrations',
    icon: Plug,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    name: 'Branches & Locations',
    href: '/admin/branches',
    icon: Store,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    name: 'Plan & Billing',
    href: '/admin/subscription',
    icon: Crown,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
  {
    name: 'Platform Super Admin',
    href: '/admin/super-admin',
    icon: Shield,
    allowedRoles: [UserRole.SUPER_ADMIN],
    badge: 'SUPER',
  },
  {
    name: 'Audit & Security',
    href: '/admin/audit',
    icon: ShieldAlert,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER],
  },
  {
    name: 'Settings',
    href: '/admin/settings',
    icon: Settings,
    allowedRoles: [UserRole.SUPER_ADMIN, UserRole.ADMIN],
  },
];


export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();

  const userRole = (user?.role as UserRole) || UserRole.ADMIN;

  const filteredNav = NAV_ITEMS.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  });

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 bg-slate-900 border-r border-slate-800 z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-white block">
                Silver Sapoon
              </span>
              <span className="text-[11px] font-medium text-slate-400 block tracking-wider uppercase">
                Restaurant OS
              </span>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* User Role Indicator */}
        <div className="px-5 py-3 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-semibold text-slate-200 truncate">{user?.name || 'Staff User'}</p>
            <p className="text-[10px] font-mono text-slate-400 truncate">{user?.email || 'staff@restaurant.com'}</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider shrink-0">
            {userRole}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Operational Modules
          </div>

          {filteredNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition group ${
                  isActive
                    ? 'bg-slate-800 text-white font-semibold border-l-2 border-amber-500 pl-2.5'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                {isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : item.badge ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950 space-y-1">
          <Link
            href="/"
            target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            <UtensilsCrossed className="w-4 h-4 text-slate-400" />
            <span>Open Customer QR Menu</span>
          </Link>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition text-left"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
