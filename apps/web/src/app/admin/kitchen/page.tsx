'use client';

import React, { useState, useEffect } from 'react';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Volume2,
  VolumeX,
  Flame,
  Utensils,
  Maximize2,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../hooks/useSocket';
import { UserRole } from '@qr-menu/shared';

export default function KitchenDisplayPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [orders, setOrders] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  // Subscribe to live kitchen events
  useEffect(() => {
    const unsubNew = on<any>('order.created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });
    const unsubUpd = on<any>('order.statusUpdated', (updated) => {
      setOrders((prev) => {
        if (['READY', 'SERVED', 'COMPLETED', 'CANCELLED'].includes(updated.status)) {
          return prev.filter((o) => o.id !== updated.id);
        }
        return prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o));
      });
    });
    return () => {
      unsubNew();
      unsubUpd();
    };
  }, [on]);

  const fetchKitchenOrders = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getKitchenOrders(restaurantId, token);
      setOrders(data || []);
    } catch (err) {
      console.warn('[KitchenKDS] Failed to fetch orders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchKitchenOrders();
    const interval = setInterval(fetchKitchenOrders, 15000); // 15s polling sync fallback
    return () => clearInterval(interval);
  }, [restaurantId, token]);

  const handleAdvanceStatus = async (orderId: string, nextStatus: string) => {
    if (!token) return;
    try {
      await adminService.updateKitchenStatus(orderId, nextStatus, token);
      if (['READY', 'SERVED', 'COMPLETED'].includes(nextStatus)) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      console.error('[KitchenKDS] Failed to advance stage', err);
    }
  };

  const calculateMinutesElapsed = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    return Math.max(0, Math.floor(elapsedMs / 60000));
  };

  return (
    <AdminLayout
      title="Kitchen Display System (KDS)"
      subtitle="Live Prep Station & Cooking Progress Queue"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF]}
      onRefresh={fetchKitchenOrders}
      isRefreshing={refreshing}
    >
      {/* KDS Header Controls */}
      <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-600 flex items-center justify-center font-bold">
            <ChefHat className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Kitchen Prep Queue
              </h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 font-mono">
                {orders.length} Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Orders ordered chronologically by arrival time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border transition ${
              soundEnabled
                ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'Chime Active' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* KDS Orders Cards Grid */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center shadow-xs">
          <ChefHat className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">Kitchen Queue Clear</h3>
          <p className="text-xs text-slate-500 mt-1">
            No pending or cooking orders in the kitchen. New orders will appear here in real time.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {orders.map((ord) => {
            const mins = calculateMinutesElapsed(ord.createdAt);
            const isUrgent = mins >= 20;
            const isCooking = ['COOKING', 'PREPARING', 'IN_KITCHEN'].includes(ord.status);

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-lg border shadow-xs flex flex-col justify-between overflow-hidden transition ${
                  isUrgent
                    ? 'border-rose-500 ring-1 ring-rose-500'
                    : isCooking
                    ? 'border-amber-400'
                    : 'border-slate-200'
                }`}
              >
                {/* Card Header */}
                <div
                  className={`p-3.5 border-b flex items-center justify-between ${
                    isUrgent
                      ? 'bg-rose-50 border-rose-200 text-rose-950'
                      : isCooking
                      ? 'bg-amber-50 border-amber-200 text-amber-950'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm">{ord.orderNumber}</span>
                      <span className="px-2 py-0.5 rounded font-bold text-xs bg-white border border-slate-200 shadow-2xs">
                        Table {ord.table?.tableNumber || ord.tableNumber || ord.tableId?.replace(/^t-/, '') || '01'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                    <Clock className={`w-3.5 h-3.5 ${isUrgent ? 'text-rose-600' : 'text-slate-500'}`} />
                    <span className={isUrgent ? 'text-rose-600 animate-pulse' : 'text-slate-700'}>
                      {mins}m ago
                    </span>
                  </div>
                </div>

                {/* Card Items List */}
                <div className="p-4 flex-1 divide-y divide-slate-100">
                  {ord.items?.map((item: any) => (
                    <div key={item.id} className="py-2.5 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-slate-900">
                          <span className="inline-block min-w-[24px] font-black text-amber-700 text-sm">
                            {item.quantity}x
                          </span>
                          <span>{item.name}</span>
                        </div>
                      </div>

                      {item.specialInstructions && (
                        <div className="mt-1.5 p-1.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-medium">
                          Note: {item.specialInstructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 bg-slate-50 border-t border-slate-200">
                  {!isCooking ? (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(ord.id, 'PREPARING')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-bold transition shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Cooking</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAdvanceStatus(ord.id, 'READY')}
                      className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-xs font-bold transition shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Ready for Waiter</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AdminLayout>
  );
}
