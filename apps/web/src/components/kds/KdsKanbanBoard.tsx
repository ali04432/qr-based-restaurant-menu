'use client';

import React from 'react';
import { Order, OrderStatus } from '@qr-menu/shared';
import { KdsOrderCard } from './KdsOrderCard';

interface KdsKanbanBoardProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  kdsTheme?: 'dark' | 'light';
}

export function KdsKanbanBoard({ orders, onUpdateStatus, kdsTheme = 'dark' }: KdsKanbanBoardProps) {
  const isLight = kdsTheme === 'light';

  // Helper to group orders by logical KDS columns
  const getOrdersInStatus = (statusGroup: string[]) => {
    return orders
      .filter((o) => statusGroup.includes(o.status))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  };

  const newOrders = getOrdersInStatus(['NEW', 'RECEIVED', 'PENDING']);
  const preparingOrders = getOrdersInStatus(['PREPARING', 'IN_KITCHEN', 'COOKING']);
  const readyOrders = getOrdersInStatus(['READY']);

  // Theme-aware class helpers
  const colBg = isLight
    ? 'bg-white border-slate-200'
    : 'bg-[#0D0F12] border-zinc-800/60';
  const colHeaderBg = isLight
    ? 'bg-slate-50 border-slate-200'
    : 'bg-[#131518]/50 border-zinc-800/60';
  const colHeadingColor = isLight ? 'text-slate-600' : 'text-zinc-300';
  const colBadgeBg = isLight ? 'bg-slate-200 text-slate-600' : 'bg-zinc-800 text-zinc-300';
  const emptyColor = isLight ? 'text-slate-400' : 'text-zinc-600';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full overflow-hidden p-6 pb-24">
      {/* Column 1: New Orders */}
      <div className={`flex flex-col h-full rounded-xl border overflow-hidden transition-colors duration-200 ${colBg}`}>
        <div className={`p-4 border-b flex items-center justify-between ${colHeaderBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            <h3 className={`font-semibold text-xs tracking-wider uppercase ${colHeadingColor}`}>Incoming</h3>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${colBadgeBg}`}>
            {newOrders.length}
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
          {newOrders.length === 0 ? (
            <div className={`h-full flex items-center justify-center italic text-sm ${emptyColor}`}>
              No incoming orders
            </div>
          ) : (
            newOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} kdsTheme={kdsTheme} />
            ))
          )}
        </div>
      </div>

      {/* Column 2: Preparing */}
      <div className={`flex flex-col h-full rounded-xl border overflow-hidden transition-colors duration-200 ${colBg}`}>
        <div className={`p-4 border-b flex items-center justify-between ${colHeaderBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse-soft" />
            <h3 className={`font-semibold text-xs tracking-wider uppercase ${colHeadingColor}`}>Preparing</h3>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${colBadgeBg}`}>
            {preparingOrders.length}
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
          {preparingOrders.length === 0 ? (
            <div className={`h-full flex items-center justify-center italic text-sm ${emptyColor}`}>
              No orders currently preparing
            </div>
          ) : (
            preparingOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} kdsTheme={kdsTheme} />
            ))
          )}
        </div>
      </div>

      {/* Column 3: Ready */}
      <div className={`flex flex-col h-full rounded-xl border overflow-hidden transition-colors duration-200 ${colBg}`}>
        <div className={`p-4 border-b flex items-center justify-between ${colHeaderBg}`}>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <h3 className={`font-semibold text-xs tracking-wider uppercase ${colHeadingColor}`}>Ready for Pickup</h3>
          </div>
          <div className={`px-2 py-0.5 rounded-md text-xs font-medium ${colBadgeBg}`}>
            {readyOrders.length}
          </div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
          {readyOrders.length === 0 ? (
            <div className={`h-full flex items-center justify-center italic text-sm ${emptyColor}`}>
              No orders waiting for pickup
            </div>
          ) : (
            readyOrders.map((order) => (
              <KdsOrderCard key={order.id} order={order} onUpdateStatus={onUpdateStatus} kdsTheme={kdsTheme} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
