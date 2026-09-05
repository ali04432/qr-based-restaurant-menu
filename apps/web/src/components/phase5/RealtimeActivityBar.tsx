'use client';

import React, { useEffect, useState } from 'react';
import { Radio, Wifi, WifiOff, Bell, Utensils, CheckCircle2, DollarSign } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuthContext } from '../../context/AuthContext';

interface ActivityItem {
  id: string;
  type: 'ORDER' | 'READY' | 'SERVED' | 'PAYMENT' | 'REQUEST';
  message: string;
  timestamp: string;
}

export function RealtimeActivityBar() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const { isConnected, on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  const [activities, setActivities] = useState<ActivityItem[]>([
    {
      id: 'init-1',
      type: 'ORDER',
      message: 'System active & synchronized with kitchen',
      timestamp: 'just now',
    },
  ]);

  // Subscribe to live restaurant socket events
  useEffect(() => {
    const unsubCreated = on<any>('order.created', (order) => {
      const item: ActivityItem = {
        id: `created-${order.id}-${Date.now()}`,
        type: 'ORDER',
        message: `New Order #${order.orderNumber} for Table ${order.table?.tableNumber || order.tableId}`,
        timestamp: 'just now',
      };
      setActivities((prev) => [item, ...prev.slice(0, 9)]);
    });

    const unsubStatus = on<any>('order.statusChanged', (order) => {
      let type: ActivityItem['type'] = 'ORDER';
      let msg = `Order #${order.orderNumber} updated to ${order.status}`;

      if (order.status === 'READY') {
        type = 'READY';
        msg = `Order #${order.orderNumber} is READY for Table ${order.table?.tableNumber || order.tableId}`;
      } else if (order.status === 'SERVED') {
        type = 'SERVED';
        msg = `Order #${order.orderNumber} was SERVED to Table ${order.table?.tableNumber || order.tableId}`;
      }

      const item: ActivityItem = {
        id: `status-${order.id}-${Date.now()}`,
        type,
        message: msg,
        timestamp: 'just now',
      };
      setActivities((prev) => [item, ...prev.slice(0, 9)]);
    });

    const unsubPayment = on<any>('payment.completed', (data) => {
      const item: ActivityItem = {
        id: `pay-${data.payment?.id || Date.now()}`,
        type: 'PAYMENT',
        message: `Payment settled for Order #${data.order?.orderNumber} (Rs. ${data.payment?.amount || ''})`,
        timestamp: 'just now',
      };
      setActivities((prev) => [item, ...prev.slice(0, 9)]);
    });

    const unsubRequest = on<any>('customer.requestCreated', (req) => {
      const item: ActivityItem = {
        id: `req-${req.id || Date.now()}`,
        type: 'REQUEST',
        message: `Guest Call (${req.type}) at Table ${req.tableNumber || req.tableId}`,
        timestamp: 'just now',
      };
      setActivities((prev) => [item, ...prev.slice(0, 9)]);
    });

    return () => {
      unsubCreated();
      unsubStatus();
      unsubPayment();
      unsubRequest();
    };
  }, [on]);

  const getBadgeIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'ORDER':
        return <Utensils className="w-3.5 h-3.5 text-amber-400" />;
      case 'READY':
        return <Bell className="w-3.5 h-3.5 text-yellow-400 animate-bounce" />;
      case 'SERVED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
      case 'PAYMENT':
        return <DollarSign className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Radio className="w-3.5 h-3.5 text-amber-400" />;
    }
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 h-10 bg-slate-950/95 backdrop-blur-md border-t border-slate-850 flex items-center justify-between px-4 text-xs select-none">
      {/* Real-time Ticker */}
      <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-400 whitespace-nowrap bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>LIVE OPS</span>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap py-1">
          {activities.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors animate-in fade-in duration-300"
            >
              {getBadgeIcon(item.type)}
              <span className="font-medium text-xs text-slate-200">{item.message}</span>
              <span className="text-[10px] text-slate-500 font-mono">({item.timestamp})</span>
            </div>
          ))}
        </div>
      </div>

      {/* Socket.IO Connection State */}
      <div className="flex items-center gap-2 pl-3 border-l border-slate-800 text-[11px] whitespace-nowrap">
        {isConnected ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Wifi className="w-3 h-3" />
            <span className="hidden sm:inline">Socket.IO Online</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            <WifiOff className="w-3 h-3" />
            <span className="hidden sm:inline">Reconnecting...</span>
          </div>
        )}
      </div>
    </footer>
  );
}
