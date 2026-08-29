'use client';

import React, { useState, useEffect } from 'react';
import {
  ConciergeBell,
  CheckCircle2,
  Clock,
  UtensilsCrossed,
  Layers,
  Sparkles,
  RefreshCw,
  UserCheck,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../hooks/useSocket';
import { UserRole } from '@qr-menu/shared';

export default function WaiterPanelPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [readyOrders, setReadyOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  // Subscribe to live order status events
  useEffect(() => {
    const unsub = on<any>('order.statusUpdated', (updated) => {
      if (updated.status === 'READY') {
        setReadyOrders((prev) => {
          if (prev.some((o) => o.id === updated.id)) return prev;
          return [updated, ...prev];
        });
      } else if (['SERVED', 'COMPLETED', 'CANCELLED'].includes(updated.status)) {
        setReadyOrders((prev) => prev.filter((o) => o.id !== updated.id));
      }
    });
    return unsub;
  }, [on]);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [ordersData, tablesData] = await Promise.all([
        adminService.getReadyOrders(restaurantId, token),
        adminService.getWaiterTables(restaurantId, token),
      ]);
      setReadyOrders(ordersData || []);
      setTables(tablesData || []);
    } catch (err) {
      console.warn('[WaiterPanel] Error fetching waiter data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token]);

  const handleMarkServed = async (orderId: string) => {
    if (!token) return;
    try {
      await adminService.serveOrder(orderId, token);
      setReadyOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      console.error('[WaiterPanel] Failed to mark served', err);
    }
  };

  const handleOpenTable = async (tableId: string) => {
    if (!token) return;
    try {
      await adminService.openTable(tableId, token);
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: 'OCCUPIED' } : t))
      );
    } catch (err) {
      console.error('[WaiterPanel] Failed to open table', err);
    }
  };

  const handleClearTable = async (tableId: string) => {
    if (!token) return;
    try {
      await adminService.updateTable(tableId, { isActive: true } as any, token);
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? { ...t, status: 'AVAILABLE', activeOrderCount: 0, currentBill: 0 } : t))
      );
    } catch (err) {
      console.error('[WaiterPanel] Failed to clear table', err);
    }
  };

  return (
    <AdminLayout
      title="Waiter Operations Panel"
      subtitle="Floor Matrix, Table Seating & Ready-to-Serve Delivery"
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.WAITER,
        UserRole.CASHIER,
      ]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Ready to Serve Orders Banner / Queue */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ConciergeBell className="w-5 h-5 text-purple-700" />
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Ready for Table Delivery ({readyOrders.length})
            </h2>
          </div>
          {readyOrders.length > 0 && (
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Deliver hot dishes to guests
            </span>
          )}
        </div>

        {readyOrders.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-6 text-center shadow-xs">
            <p className="text-xs text-slate-500">
              No orders waiting in the pass. When kitchen marks an order READY, it will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {readyOrders.map((ord) => (
              <div
                key={ord.id}
                className="bg-white rounded-lg border-2 border-purple-500 shadow-md p-4 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="font-mono font-bold text-slate-900">{ord.orderNumber}</span>
                    <span className="px-2 py-0.5 rounded font-black text-xs bg-purple-100 text-purple-900 border border-purple-300">
                      Table {ord.table?.tableNumber || ord.tableNumber || ord.tableId?.replace(/^t-/, '') || '01'}
                    </span>
                  </div>

                  <div className="py-3 space-y-1 text-xs">
                    {ord.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between font-semibold text-slate-900">
                        <span>
                          <strong className="text-purple-700">{item.quantity}x </strong>
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleMarkServed(ord.id)}
                  className="w-full mt-2 py-2 px-3 bg-purple-700 hover:bg-purple-600 text-white rounded-md text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Delivered to Table (Mark SERVED)</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Table Floor Plan Matrix */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Restaurant Floor & Table Status ({tables.length} Tables)
          </h2>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Available
            </span>
            <span className="flex items-center gap-1.5 font-medium text-amber-700">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Occupied
            </span>
            <span className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              Dirty / Reset
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const isOccupied = table.status === 'OCCUPIED' || table.activeOrderCount > 0;
            const isAvailable = table.status === 'AVAILABLE' && !isOccupied;

            return (
              <div
                key={table.id}
                className={`bg-white rounded-lg border p-4 shadow-xs flex flex-col justify-between transition ${
                  isOccupied
                    ? 'border-amber-300 bg-amber-50/30'
                    : isAvailable
                    ? 'border-slate-200 hover:border-emerald-400'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-slate-900 font-mono">
                      Table {table.tableNumber}
                    </span>
                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                        isOccupied
                          ? 'bg-amber-100 text-amber-800'
                          : isAvailable
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {table.status}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500 space-y-0.5">
                    <p>Capacity: {table.capacity || 4} Guests</p>
                    {isOccupied ? (
                      <p className="font-semibold text-slate-800">
                        Bill: Rs. {table.currentBill?.toLocaleString() || '0'} ({table.activeOrderCount || 1} ord)
                      </p>
                    ) : (
                      <p className="text-emerald-700 font-medium">Ready for guests</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-100">
                  {isAvailable ? (
                    <button
                      type="button"
                      onClick={() => handleOpenTable(table.id)}
                      className="w-full py-1.5 px-2 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition"
                    >
                      Seat Guests
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleClearTable(table.id)}
                      className="w-full py-1.5 px-2 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                    >
                      Clear & Reset
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AdminLayout>
  );
}
