'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  RefreshCw,
  Utensils,
  Receipt,
  Check,
  X,
  Radio,
} from 'lucide-react';
import { Phase5Layout } from '../../../components/phase5/Phase5Layout';
import { ThermalReceiptModal } from '../../../components/phase5/ThermalReceiptModal';
import { waiterService } from '../../../services/waiter.service';
import { useAuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../hooks/useSocket';
import { OrderStatus, ThermalReceiptPayload } from '@qr-menu/shared';

export default function WaiterOrdersPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for Timeline Drawer
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Thermal Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ThermalReceiptPayload | null>(null);

  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await waiterService.getOrders(
        {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery || undefined,
        },
        token
      );
      setOrders(data || []);

      if (selectedOrder) {
        const updated = data?.find((o: any) => o.id === selectedOrder.id);
        if (updated) setSelectedOrder(updated);
      }
    } catch (err) {
      console.error('Failed to load waiter orders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, statusFilter, searchQuery, selectedOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time socket updates
  useEffect(() => {
    const unsubCreated = on('order.created', () => fetchOrders());
    const unsubStatus = on('order.statusChanged', () => fetchOrders());
    const unsubPayment = on('payment.completed', () => fetchOrders());

    return () => {
      unsubCreated();
      unsubStatus();
      unsubPayment();
    };
  }, [on, fetchOrders]);

  const handleServeOrder = async (orderId: string) => {
    if (!token) return;
    try {
      setActionLoading(true);
      await waiterService.serveOrder(orderId, token);
      fetchOrders();
    } catch (err: any) {
      alert(err.message || 'Could not mark order served');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintReceipt = (order: any) => {
    const receipt: ThermalReceiptPayload = {
      restaurantName: 'Silver Sapoon Restaurant',
      address: 'Main Boulevard, Gulberg III, Lahore',
      phone: '+92 42 111 727 666',
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber || '01',
      date: new Date(order.createdAt).toLocaleDateString('en-GB'),
      time: new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      cashierName: user?.name || 'Captain',
      items: (order.items || []).map((i: any) => ({
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice || 0,
        subtotal: i.subtotal || i.price * i.quantity || 0,
      })),
      subtotal: order.total ? parseFloat((order.total / 1.08).toFixed(2)) : 0,
      serviceCharge: 5.0,
      tax: order.total ? parseFloat((order.total - order.total / 1.08).toFixed(2)) : 0,
      discount: 0,
      total: order.total,
      paymentMethod: order.paymentStatus === 'COMPLETED' ? 'PAID' : 'PENDING',
    };

    setReceiptData(receipt);
    setReceiptModalOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
      case 'RECEIVED':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PREPARING':
      case 'COOKING':
      case 'IN_KITCHEN':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'READY':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse font-bold';
      case 'SERVED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'COMPLETED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <Phase5Layout
      role="WAITER"
      title="Waiter Orders Ledger"
      subtitle="Floor order progression, kitchen status & delivery tracking"
      headerAction={
        <button
          onClick={fetchOrders}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          title="Refresh orders"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'READY', label: 'Ready to Serve' },
            { id: 'PREPARING', label: 'Preparing' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'SERVED', label: 'Served' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, table..."
            className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800/80"></div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <ClipboardList className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No orders found</h3>
          <p className="text-xs text-slate-400 mt-1">There are currently no orders in this queue.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order) => {
            const isReady = order.status === 'READY';
            return (
              <div
                key={order.id}
                className={`bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between transition-all backdrop-blur-md ${
                  isReady
                    ? 'border-yellow-500/60 bg-amber-500/5 shadow-lg shadow-yellow-500/10'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">#{order.orderNumber}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                      Table {order.tableNumber}
                    </span>
                  </div>

                  {/* Timestamps */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3 font-mono">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span>•</span>
                    <span>{order.itemsCount} Items</span>
                  </div>

                  {/* Items Preview */}
                  <div className="space-y-1.5 py-2.5 border-t border-slate-850 text-xs text-slate-300">
                    {(order.items || []).slice(0, 3).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="truncate pr-2 font-medium">{item.name}</span>
                        <span className="text-slate-400 font-mono text-[11px]">x{item.quantity}</span>
                      </div>
                    ))}
                    {(order.items || []).length > 3 && (
                      <p className="text-[10px] text-slate-500 italic">
                        +{(order.items || []).length - 3} more items...
                      </p>
                    )}
                  </div>
                </div>

                {/* Card Bottom: Total & Actions */}
                <div className="mt-3 pt-3 border-t border-slate-850 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase block">Total</span>
                    <span className="text-xs font-bold text-white font-mono">
                      PKR {order.total?.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handlePrintReceipt(order)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition-colors"
                      title="Print Order Receipt"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {isReady ? (
                      <button
                        onClick={() => handleServeOrder(order.id)}
                        disabled={actionLoading}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-md shadow-yellow-500/20 transition-all active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Deliver</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium transition-colors"
                      >
                        <span>Timeline</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Status Timeline Drawer (Requirement 15) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl p-6 text-slate-100 animate-in slide-in-from-right-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white">Order #{selectedOrder.orderNumber}</h3>
                <p className="text-xs text-slate-400">Table {selectedOrder.tableNumber} Timeline</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 5-Stage Status Progression Timeline */}
            <div className="py-4 space-y-4 text-xs">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-white">1. ORDER PLACED</p>
                  <p className="text-[11px] text-slate-400">
                    Created at {new Date(selectedOrder.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    ['PREPARING', 'READY', 'SERVED', 'COMPLETED'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  ✓
                </div>
                <div>
                  <p className="font-bold text-white">2. KITCHEN ACCEPTED</p>
                  <p className="text-[11px] text-slate-400">Ticket routed to Chef station</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    ['READY', 'SERVED', 'COMPLETED'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : selectedOrder.status === 'PREPARING'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {['READY', 'SERVED', 'COMPLETED'].includes(selectedOrder.status) ? '✓' : '3'}
                </div>
                <div>
                  <p className="font-bold text-white">3. PREPARING & COOKING</p>
                  <p className="text-[11px] text-slate-400">Chefs preparing dishes</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    ['SERVED', 'COMPLETED'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : selectedOrder.status === 'READY'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-bounce'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {['SERVED', 'COMPLETED'].includes(selectedOrder.status) ? '✓' : '4'}
                </div>
                <div>
                  <p className="font-bold text-white">4. READY AT PASS</p>
                  <p className="text-[11px] text-slate-400">Order plated & ready for delivery</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                    ['SERVED', 'COMPLETED'].includes(selectedOrder.status)
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {['SERVED', 'COMPLETED'].includes(selectedOrder.status) ? '✓' : '5'}
                </div>
                <div>
                  <p className="font-bold text-white">5. SERVED TO GUESTS</p>
                  <p className="text-[11px] text-slate-400">Delivered to table</p>
                </div>
              </div>
            </div>

            {/* Quick Deliver Action */}
            {selectedOrder.status === 'READY' && (
              <button
                onClick={() => {
                  handleServeOrder(selectedOrder.id);
                  setSelectedOrder(null);
                }}
                className="mt-6 w-full py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold text-xs shadow-lg shadow-yellow-500/20 transition-all flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Mark Order Delivered to Table {selectedOrder.tableNumber}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        receipt={receiptData}
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />
    </Phase5Layout>
  );
}
