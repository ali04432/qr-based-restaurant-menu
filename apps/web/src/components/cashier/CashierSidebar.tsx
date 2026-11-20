'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  CreditCard,
  BookOpen,
  BarChart3,
  Utensils,
  ChefHat,
  X,
} from 'lucide-react';

interface CashierSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const MAIN_MENU = [
  { label: 'Dashboard', href: '/cashier', icon: LayoutDashboard },
  { label: 'Billing', href: '/cashier/orders', icon: Receipt },
  { label: 'Payments', href: '/cashier/payments', icon: CreditCard },
  { label: 'Ledger', href: '/cashier/transactions', icon: BookOpen },
  { label: 'Reports', href: '/cashier/reports', icon: BarChart3 },
];

export function CashierSidebar({ isOpen, onClose }: CashierSidebarProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-[232px] shrink-0 bg-[#0F1114] border-r border-[#25282D] p-[24px_16px] flex flex-col gap-[28px] transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Block */}
        <div className="flex flex-col items-center gap-[10px] p-[4px_0_8px] relative">
          {/* Mobile close button */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden absolute -top-2 -right-2 p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#F8FAFC] hover:bg-[#1B1E23] transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 48x48 amber logo tile with fork/knife icon */}
          <div className="w-[48px] h-[48px] rounded-[12px] bg-[#F5B342] text-[#08090B] flex items-center justify-center shadow-lg shadow-[#F5B342]/20">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
            </svg>
          </div>

          {/* Playfair Display Brand Name */}
          <div
            className="font-bold text-[17px] tracking-[0.04em] text-[#F8FAFC]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            SILVER SAPOON
          </div>

          {/* Cashier Badge */}
          <div className="text-[10px] font-bold tracking-[0.14em] text-[#F5B342] border border-[rgba(245,179,66,0.4)] bg-[rgba(245,179,66,0.08)] rounded-full px-[12px] py-[4px] uppercase">
            CASHIER POS
          </div>
        </div>

        {/* MAIN MENU */}
        <nav aria-label="Main menu" className="flex flex-col gap-[6px]">
          <div className="text-[11px] font-semibold tracking-[0.1em] text-[#A1A1AA] uppercase px-[12px] pb-[6px]">
            MAIN MENU
          </div>
          {MAIN_MENU.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/cashier'
                ? pathname === '/cashier'
                : pathname === item.href || (item.href === '/cashier/orders' && pathname?.startsWith('/cashier/orders'));

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-[12px] min-h-[44px] box-border px-[12px] rounded-[10px] text-[14px] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1114] ${
                  isActive
                    ? 'font-semibold text-[#F5B342] bg-[rgba(245,179,66,0.14)] border border-[rgba(245,179,66,0.35)] shadow-sm'
                    : 'font-medium text-[#A1A1AA] border border-transparent hover:text-[#F8FAFC] hover:bg-[#15171A]'
                }`}
              >
                <Icon
                  className={`w-[18px] h-[18px] shrink-0 ${
                    isActive ? 'text-[#F5B342]' : 'text-[#A1A1AA]'
                  }`}
                  strokeWidth={1.8}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* QUICK SWITCH - EXACTLY: Waiter Panel and Chef KDS ONLY (NO Admin OS) */}
        <div className="flex flex-col gap-[6px] pt-[16px] border-t border-[#25282D]">
          <div className="text-[11px] font-semibold tracking-[0.1em] text-[#A1A1AA] uppercase px-[12px] pb-[6px]">
            QUICK SWITCH
          </div>
          <Link
            href="/waiter"
            onClick={onClose}
            className="flex items-center gap-[12px] min-h-[44px] box-border px-[12px] rounded-[10px] text-[14px] font-medium text-[#A1A1AA] border border-transparent hover:text-[#F8FAFC] hover:bg-[#15171A] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342]"
          >
            <Utensils className="w-[18px] h-[18px] shrink-0 text-[#F5B342]" strokeWidth={1.8} />
            <span>Waiter Panel</span>
          </Link>
          <Link
            href="/kds"
            onClick={onClose}
            className="flex items-center gap-[12px] min-h-[44px] box-border px-[12px] rounded-[10px] text-[14px] font-medium text-[#A1A1AA] border border-transparent hover:text-[#F8FAFC] hover:bg-[#15171A] transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342]"
          >
            <ChefHat className="w-[18px] h-[18px] shrink-0 text-[#22C55E]" strokeWidth={1.8} />
            <span>Chef KDS</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
