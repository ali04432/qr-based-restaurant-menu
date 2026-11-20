'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ShoppingBag,
  CreditCard,
  UserCheck,
  UtensilsCrossed,
  QrCode,
  Box,
  Boxes,
  ChefHat,
  FileSpreadsheet,
  Users,
  Settings,
  ChevronRight,
  LogOut,
  X,
  ExternalLink,
  Crown,
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useDashboardTheme } from './DashboardThemeContext';
import { UserRole } from '@qr-menu/shared';

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

const DASHBOARD_NAV: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { name: 'Payments', href: '/admin/payments', icon: CreditCard },
  { name: 'Customers', href: '/admin/customers', icon: UserCheck },
  { name: 'Menu Management', href: '/admin/menu', icon: UtensilsCrossed },
  { name: 'QR Code & Tables', href: '/admin/tables', icon: QrCode },
  { name: '3D Models & AR', href: '/admin/ar', icon: Box },
  { name: 'Inventory', href: '/admin/inventory', icon: Boxes },
  { name: 'Kitchen Overview', href: '/kds', icon: ChefHat },
  { name: 'Reports', href: '/admin/reports', icon: FileSpreadsheet },
  { name: 'Staff Management', href: '/admin/staff', icon: Users },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

export function DashboardSidebar({ isOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuthContext();
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed top-0 left-0 bottom-0 w-64 z-50 flex flex-col transition-transform duration-200 ease-in-out ${
          isLight
            ? 'bg-white border-r border-slate-200 text-slate-800'
            : 'bg-[#0F1114] border-r border-[#25282D] text-[#F8FAFC]'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Brand Header */}
        <div
          className={`h-20 flex items-center justify-between px-5 border-b ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-[#25282D] bg-[#08090B]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F5B342] to-[#D6A84F] flex items-center justify-center text-[#08090B] font-black shadow-md shadow-[#F5B342]/20">
              <Crown className="w-5 h-5 text-[#08090B]" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight text-inherit block">
                Silver Sapoon
              </span>
              <span className="text-[10px] font-semibold text-[#F5B342] block tracking-wide">
                Good Food &middot; Good Mood
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Context */}
        <div
          className={`px-5 py-3 border-b flex items-center justify-between text-xs ${
            isLight
              ? 'border-slate-200 bg-slate-100/60'
              : 'border-[#25282D] bg-[#15171A]/60'
          }`}
        >
          <div className="truncate pr-2">
            <p className="font-bold text-inherit truncate leading-tight">
              {user?.name || 'Administrator'}
            </p>
            <p className="text-[10px] text-[#A1A1AA] truncate">
              {user?.email || 'admin@silversapoon.com'}
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#F5B342]/15 text-[#F5B342] border border-[#F5B342]/30 uppercase tracking-wider shrink-0">
            {user?.role || 'ADMIN'}
          </span>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5 scrollbar-thin">
          <div className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA]">
            Management Navigation
          </div>

          {DASHBOARD_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition group ${
                  isActive
                    ? isLight
                      ? 'bg-amber-50 text-amber-900 font-bold border-l-2 border-[#F5B342] pl-2.5 shadow-sm'
                      : 'bg-[#15171A] text-white font-bold border-l-2 border-[#F5B342] pl-2.5 shadow-sm'
                    : isLight
                    ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'text-[#A1A1AA] hover:bg-[#15171A]/60 hover:text-[#F8FAFC]'
                }`}
              >
                <div className="flex items-center gap-3 truncate">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? 'text-[#F5B342]'
                        : isLight
                        ? 'text-slate-400 group-hover:text-slate-600'
                        : 'text-[#A1A1AA] group-hover:text-[#F8FAFC]'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </div>

                {isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-[#F5B342] shrink-0" />
                ) : item.badge ? (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div
          className={`p-3 border-t space-y-1 ${
            isLight ? 'border-slate-200 bg-slate-50' : 'border-[#25282D] bg-[#08090B]'
          }`}
        >
          <Link
            href="/"
            target="_blank"
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs transition ${
              isLight
                ? 'text-slate-700 hover:bg-slate-200'
                : 'text-[#A1A1AA] hover:bg-[#15171A] hover:text-[#F8FAFC]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <UtensilsCrossed className="w-4 h-4 text-[#F5B342]" />
              <span className="font-medium">Customer Menu</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-[#A1A1AA]" />
          </Link>

          <button
            type="button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition text-left"
          >
            <LogOut className="w-4 h-4 text-rose-500" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
