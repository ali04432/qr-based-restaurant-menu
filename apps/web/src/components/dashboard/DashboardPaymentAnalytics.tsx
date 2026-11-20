'use client';

import React from 'react';
import Link from 'next/link';
import { CreditCard, Banknote, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { PaymentSummary } from '@qr-menu/shared';

interface DashboardPaymentAnalyticsProps {
  paymentSummary: PaymentSummary | null;
  loading: boolean;
}

export function DashboardPaymentAnalytics({ paymentSummary, loading }: DashboardPaymentAnalyticsProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const total = paymentSummary?.totalCollected || 0;
  const pending = paymentSummary?.pendingAmount || 0;
  const cash = paymentSummary?.cashTotal || 0;
  const card = paymentSummary?.cardTotal || 0;
  const digital = paymentSummary?.digitalTotal || 0;

  const grandTotal = total + pending;
  const cashPct = grandTotal > 0 ? Math.round((cash / grandTotal) * 100) : 0;
  const digitalPct = grandTotal > 0 ? Math.round(((card + digital) / grandTotal) * 100) : 0;

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Payment Analytics</h3>
            <p className="text-[11px] text-[#A1A1AA]">Settlements & methods</p>
          </div>
        </div>
        <Link
          href="/admin/payments"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>All Payments</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="h-16 rounded-xl bg-black/10 animate-pulse" />
          <div className="h-16 rounded-xl bg-black/10 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Main Status Blocks */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#22C55E] font-semibold mb-1">
                <span>Collected</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-inherit font-mono">
                Rs. {total.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">
                {paymentSummary?.paymentCount || 0} completed records
              </p>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#F5B342] font-semibold mb-1">
                <span>Pending</span>
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-lg font-black text-inherit font-mono">
                Rs. {pending.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#A1A1AA] mt-0.5">Awaiting cashier checkout</p>
            </div>
          </div>

          {/* Payment Method Channels */}
          <div className="space-y-2 pt-2 border-t border-inherit/10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA] flex justify-between">
              <span>Method Breakdown</span>
              <span>Volume</span>
            </div>

            {/* Cash */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-inherit">
                  <Banknote className="w-3.5 h-3.5 text-[#22C55E]" />
                  <span>Cash Payments</span>
                </span>
                <span className="font-mono text-inherit font-semibold">
                  Rs. {cash.toLocaleString()} ({cashPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#22C55E] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, cashPct)}%` }}
                />
              </div>
            </div>

            {/* Digital / Card */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5 text-inherit">
                  <CreditCard className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>Online & Digital</span>
                </span>
                <span className="font-mono text-inherit font-semibold">
                  Rs. {(card + digital).toLocaleString()} ({digitalPct}%)
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-[#8B5CF6] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, digitalPct)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
