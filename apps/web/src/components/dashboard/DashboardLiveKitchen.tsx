'use client';

import React from 'react';
import Link from 'next/link';
import { ChefHat, Flame, CheckCircle2, Utensils, ArrowUpRight, Clock, AlertCircle } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';

export interface KitchenTicket {
  id: string;
  orderNumber: string;
  tableNumber: string;
  status: 'PENDING' | 'PREPARING' | 'COOKING' | 'IN_KITCHEN' | 'READY' | 'SERVED';
  itemCount: number;
  items?: Array<{ name: string; quantity: number; notes?: string }>;
  createdAt: string;
}

interface DashboardLiveKitchenProps {
  orders: KitchenTicket[];
  loading: boolean;
  isConnected: boolean;
}

export function DashboardLiveKitchen({ orders, loading, isConnected }: DashboardLiveKitchenProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const newOrders = orders.filter((o) => ['PENDING', 'RECEIVED'].includes(o.status));
  const preparingOrders = orders.filter((o) => ['PREPARING', 'COOKING', 'IN_KITCHEN'].includes(o.status));
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const servedOrders = orders.filter((o) => o.status === 'SERVED');

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
          <div className="p-2.5 rounded-xl bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-inherit">Live Kitchen Status</h3>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-[#22C55E] animate-pulse' : 'bg-amber-400'
                }`}
                title={isConnected ? 'Live Socket Connected' : 'Reconnecting'}
              />
            </div>
            <p className="text-[11px] text-[#A1A1AA]">Real-time prep station flow</p>
          </div>
        </div>
        <Link
          href="/kds"
          className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition"
        >
          <span>Open KDS</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-black/10 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* 4 Stage Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. New Orders */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-orange-50/50 border-orange-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#F97316] font-semibold">
                <span>New</span>
                <Clock className="w-3.5 h-3.5" />
              </div>
              <p className="text-2xl font-black text-inherit mt-2 font-mono">
                {newOrders.length}
              </p>
              <span className="text-[10px] text-[#A1A1AA] mt-0.5">Incoming queue</span>
            </div>

            {/* 2. Preparing */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#F5B342] font-semibold">
                <span>Cooking</span>
                <Flame className="w-3.5 h-3.5 text-[#F5B342]" />
              </div>
              <p className="text-2xl font-black text-inherit mt-2 font-mono">
                {preparingOrders.length}
              </p>
              <span className="text-[10px] text-[#A1A1AA] mt-0.5">On line stations</span>
            </div>

            {/* 3. Ready */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-cyan-50/50 border-cyan-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#22D3EE] font-semibold">
                <span>Ready</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#22D3EE]" />
              </div>
              <p className="text-2xl font-black text-inherit mt-2 font-mono">
                {readyOrders.length}
              </p>
              <span className="text-[10px] text-[#A1A1AA] mt-0.5">Pass window</span>
            </div>

            {/* 4. Served */}
            <div
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                isLight ? 'bg-emerald-50/50 border-emerald-200' : 'bg-[#1B1E23] border-[#25282D]'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-[#22C55E] font-semibold">
                <span>Served</span>
                <Utensils className="w-3.5 h-3.5 text-[#22C55E]" />
              </div>
              <p className="text-2xl font-black text-inherit mt-2 font-mono">
                {servedOrders.length}
              </p>
              <span className="text-[10px] text-[#A1A1AA] mt-0.5">Dispatched today</span>
            </div>
          </div>

          {/* Active Tickets List */}
          <div className="space-y-2 pt-2 border-t border-inherit/10">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1AA]">
              Active Kitchen Tickets
            </div>
            {orders.length === 0 ? (
              <div className="py-6 text-center text-xs text-[#A1A1AA]">
                No active orders in kitchen queue
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#1B1E23]/60 border-[#25282D]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-inherit">{order.orderNumber}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20">
                        Table {order.tableNumber}
                      </span>
                      <span className="text-[11px] text-[#A1A1AA] hidden sm:inline">
                        {order.itemCount} item(s)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          order.status === 'READY'
                            ? 'bg-[#22D3EE]/15 text-[#22D3EE] border border-[#22D3EE]/30'
                            : order.status === 'PREPARING' || order.status === 'COOKING'
                            ? 'bg-[#F5B342]/15 text-[#F5B342] border border-[#F5B342]/30'
                            : 'bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
