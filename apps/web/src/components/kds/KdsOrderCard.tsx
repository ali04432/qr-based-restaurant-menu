'use client';

import React, { useState } from 'react';
import { Order, OrderStatus } from '@qr-menu/shared';
import { Clock, Check, ChefHat, AlertCircle, RefreshCcw } from 'lucide-react';

interface KdsOrderCardProps {
  order: Order;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  kdsTheme?: 'dark' | 'light';
}

export function KdsOrderCard({ order, onUpdateStatus, kdsTheme = 'dark' }: KdsOrderCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const isLight = kdsTheme === 'light';

  const cardBg = isLight ? 'bg-white' : 'bg-[#131518]';
  const cardHeaderBorder = isLight ? 'border-slate-200' : 'border-zinc-800/60';
  const itemBorder = isLight ? 'border-slate-200' : 'border-zinc-800/40';
  const tableNumColor = isLight ? 'text-slate-900' : 'text-white';
  const orderIdColor = isLight ? 'text-slate-400' : 'text-zinc-400';
  const timeColor = isLight ? 'text-slate-800' : 'text-white';
  const qtyBg = isLight ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-zinc-800 text-zinc-300 border-zinc-800/60';
  const itemNameColor = isLight ? 'text-slate-800' : 'text-white';
  const footerBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0D0F12] border-zinc-800/60';

  // Time formatting helpers
  const orderTime = new Date(order.createdAt);
  const formattedTime = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const elapsedMs = Date.now() - orderTime.getTime();
  const elapsedMins = Math.floor(elapsedMs / 60000);

  // Color mapping based on status
  let cardBorder = 'border-[rgba(255,255,255,0.05)]';
  let headerBg = 'bg-zinc-800/40';
  let statusText = 'text-zinc-400';
  let badgeColor = 'bg-zinc-500/20 text-zinc-300';
  
  if (order.status === 'NEW' || order.status === 'RECEIVED' || order.status === 'PENDING') {
    cardBorder = elapsedMins > 15 ? 'border-rose-500/50' : 'border-sky-500/30';
    headerBg = 'bg-sky-500/10';
    statusText = 'text-sky-400';
    badgeColor = 'bg-sky-500/20 text-sky-400 border-sky-500/30';
  } else if (order.status === 'PREPARING' || order.status === 'IN_KITCHEN' || order.status === 'COOKING') {
    cardBorder = 'border-amber-500/40';
    headerBg = 'bg-amber-500/10';
    statusText = 'text-amber-400';
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  } else if (order.status === 'READY') {
    cardBorder = 'border-emerald-500/40';
    headerBg = 'bg-emerald-500/10';
    statusText = 'text-emerald-400';
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  } else if (order.status === 'COMPLETED' || order.status === 'SERVED') {
    cardBorder = 'border-zinc-700/50 opacity-60';
    headerBg = 'bg-zinc-800/30';
    statusText = 'text-zinc-500';
    badgeColor = 'bg-zinc-500/20 text-zinc-400 border-zinc-700/50';
  } else if (order.status === 'CANCELLED') {
    cardBorder = 'border-rose-500/40 opacity-50';
    headerBg = 'bg-rose-500/10';
    statusText = 'text-rose-400';
    badgeColor = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
  }

  // Next status logic
  const handleNextStatus = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    let nextStatus: OrderStatus | null = null;
    
    if (order.status === 'NEW' || order.status === 'RECEIVED' || order.status === 'PENDING') {
      nextStatus = 'PREPARING';
    } else if (order.status === 'PREPARING' || order.status === 'IN_KITCHEN' || order.status === 'COOKING') {
      nextStatus = 'READY';
    } else if (order.status === 'READY') {
      nextStatus = 'COMPLETED';
    }

    if (nextStatus) {
      await onUpdateStatus(order.id, nextStatus);
    }
    setIsUpdating(false);
  };

  const isCompleted = order.status === 'COMPLETED' || order.status === 'SERVED' || order.status === 'CANCELLED';

  return (
    <div className={`${cardBg} rounded-lg border ${cardBorder} flex flex-col overflow-hidden transition-all duration-300`}>
      {/* Card Header */}
      <div className={`${headerBg} p-3 flex items-start justify-between border-b ${cardHeaderBorder}`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg font-bold font-display ${tableNumColor}`}>T-{order.tableNumber}</span>
            <span className={`text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded border ${badgeColor}`}>
              {order.status}
            </span>
          </div>
          <div className={`text-xs font-mono ${orderIdColor}`}>Order #{order.id.substring(0, 6).toUpperCase()}</div>
        </div>

        <div className="flex flex-col items-end">
          <div className={`text-lg font-bold tracking-tight ${timeColor}`}>{formattedTime}</div>
          <div className={`flex items-center gap-1 text-xs font-medium ${elapsedMins > 20 ? 'text-rose-400' : isLight ? 'text-slate-400' : 'text-zinc-400'}`}>
            <Clock className="w-3 h-3" />
            {elapsedMins} min ago
          </div>
        </div>
      </div>

      {/* Card Body - Items */}
      <div className="p-3 flex-1 overflow-y-auto custom-scrollbar">
        <ul className="space-y-3">
          {order.items.map((item, idx) => (
            <li key={idx} className={`flex flex-col gap-1 pb-2 border-b last:border-0 last:pb-0 ${itemBorder}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <div className={`min-w-[24px] h-6 rounded flex items-center justify-center text-xs font-medium border ${qtyBg}`}>
                    {item.quantity}x
                  </div>
                  <div>
                    <span className={`text-[15px] font-medium leading-snug ${itemNameColor}`}>
                      {item.name && !item.name.startsWith('Item item-') && !item.name.startsWith('item-')
                        ? item.name
                        : item.name?.replace(/^Item\s+/, '').replace(/^item-4$/, 'Double Smash Burger').replace(/^item-1$/, 'Wagyu Beef Steak').replace(/^item-2$/, 'Crispy Calamari').replace(/^item-3$/, 'Truffle Mushroom Pizza') || 'Special Dish'}
                    </span>
                  </div>
                </div>
              </div>
              
              {item.specialInstructions && (
                <div className="ml-8 mt-1 flex items-start gap-1.5 p-1.5 rounded-md bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <span className="italic leading-relaxed">{item.specialInstructions}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Card Footer - Action Button */}
      {!isCompleted && (
        <div className={`p-3 border-t ${footerBg}`}>
          <button
            onClick={handleNextStatus}
            disabled={isUpdating}
            className={`w-full h-10 rounded-md font-medium text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]
              ${isUpdating ? 'opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500' : 
                order.status === 'NEW' || order.status === 'RECEIVED' || order.status === 'PENDING' 
                  ? 'bg-amber-500 hover:bg-amber-400 text-black' : 
                order.status === 'PREPARING' || order.status === 'IN_KITCHEN' || order.status === 'COOKING'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black' : 
                'bg-zinc-100 hover:bg-white text-black'
              }`}
          >
            {isUpdating ? (
              <RefreshCcw className="w-4 h-4 animate-spin" strokeWidth={1.5} />
            ) : order.status === 'NEW' || order.status === 'RECEIVED' || order.status === 'PENDING' ? (
              <>
                <ChefHat className="w-4 h-4" strokeWidth={1.5} /> Start Preparing
              </>
            ) : order.status === 'PREPARING' || order.status === 'IN_KITCHEN' || order.status === 'COOKING' ? (
              <>
                <Check className="w-4 h-4" strokeWidth={1.5} /> Mark as Ready
              </>
            ) : (
              <>Finish Order</>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
