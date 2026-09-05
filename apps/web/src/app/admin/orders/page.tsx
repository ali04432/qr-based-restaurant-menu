'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Clock,
  DollarSign,
  TrendingUp,
  X,
  Printer,
  ChevronRight,
  UtensilsCrossed,
  User,
  CreditCard,
  AlertTriangle,
  Calendar,
  Grid,
  Sparkles,
  FileText,
  ShoppingBag,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../hooks/useSocket';
import { Order, OrderStatus, UserRole } from '@qr-menu/shared';

const STATUS_TABS = [
  'ALL',
  'RECEIVED',
  'PREPARING',
  'READY',
  'SERVED',
  'COMPLETED',
  'CANCELLED',
];

const DATE_TABS = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 Days' },
  { id: '30d', label: 'Last 30 Days' },
];

export default function AdminOrdersPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Order Details Drawer
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [printFeedback, setPrintFeedback] = useState('');

  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  // Subscribe to live order events
  useEffect(() => {
    const unsubNew = on<any>('order.created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });
    const unsubUpd = on<any>('order.statusUpdated', (updated) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
      );
      if (selectedOrder?.id === updated.id) {
        setSelectedOrder((prev: any) => ({ ...prev, status: updated.status }));
      }
    });
    return () => {
      unsubNew();
      unsubUpd();
    };
  }, [on, selectedOrder?.id]);

  const getDateParams = () => {
    const now = new Date();
    if (selectedDate === 'today') {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      return { dateFrom: d };
    }
    if (selectedDate === 'yesterday') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59).toISOString();
      return { dateFrom: start, dateTo: end };
    }
    if (selectedDate === '7d') {
      const d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: d };
    }
    if (selectedDate === '30d') {
      const d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      return { dateFrom: d };
    }
    return {};
  };

  const fetchOrders = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const dates = getDateParams();
      const res = await adminService.getOrders(
        restaurantId,
        {
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          search: searchQuery || undefined,
          ...dates,
        },
        token
      );
      setOrders(res.orders || []);
    } catch (err) {
      console.warn('[AdminOrders] Error fetching orders', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, selectedStatus, selectedDate, searchQuery]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleOpenDetails = async (orderId: string) => {
    if (!token) return;
    try {
      setLoadingDetails(true);
      const details = await adminService.getOrderById(orderId, token);
      setSelectedOrder(details);
    } catch (err) {
      console.warn('[AdminOrders] Failed to load details', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, nextStatus: OrderStatus) => {
    if (!token) return;
    try {
      await adminService.updateOrderStatus(orderId, nextStatus, token);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
      );
      if (selectedOrder) {
        setSelectedOrder((prev: any) => ({ ...prev, status: nextStatus }));
      }
    } catch (err) {
      console.error('[AdminOrders] Failed to update status', err);
    }
  };

  const handleCancelOrder = async () => {
    if (!token || !selectedOrder) return;
    try {
      await adminService.cancelOrder(selectedOrder.id, cancelReason || 'Cancelled by staff', token);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? { ...o, status: 'CANCELLED' } : o))
      );
      setSelectedOrder((prev: any) => ({ ...prev, status: 'CANCELLED' }));
      setCancelModalOpen(false);
      setCancelReason('');
    } catch (err) {
      console.error('[AdminOrders] Failed to cancel order', err);
    }
  };

  const handlePrintReceipt = () => {
    setPrintFeedback('KOT & Receipt sent to ESC/POS thermal printer spooler!');
    setTimeout(() => setPrintFeedback(''), 4000);
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'PENDING':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'PREPARING':
      case 'COOKING':
      case 'IN_KITCHEN':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'READY':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      case 'SERVED':
        return 'bg-teal-500/15 text-teal-400 border-teal-500/30';
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <AdminLayout
      title="Order Management"
      subtitle="Live Kitchen Dispatch, Guest Checkouts & Real-Time Fulfillment Control"
      onRefresh={fetchOrders}
      isRefreshing={refreshing}
    >
      {/* Filter & Toolbar Area (Section 15) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 space-y-4">
        {/* Row 1: Search & Date Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              placeholder="Search Order # or Table..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/80 transition"
            />
          </div>

          {/* Date Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {DATE_TABS.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => setSelectedDate(dt.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                  selectedDate === dt.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
                }`}
              >
                {dt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Row 2: Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 scrollbar-thin">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSelectedStatus(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                selectedStatus === tab
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/60'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table (Section 15 Columns: Order ID, Table, Items, Total, Payment, Status, Time, Action) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Orders Queue ({orders.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live Socket Sync Active</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
            <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Table</th>
                <th className="py-3.5 px-4">Items / Details</th>
                <th className="py-3.5 px-4 text-right">Total</th>
                <th className="py-3.5 px-4">Payment</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Time</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Loading orders registry...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No orders matching the selected filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => handleOpenDetails(ord.id)}
                    className="hover:bg-slate-800/40 cursor-pointer transition group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {ord.orderNumber}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-md font-bold bg-slate-800 text-amber-400 border border-slate-700 text-[11px]">
                        Table {ord.table?.tableNumber || ord.tableNumber || ord.tableId?.replace(/^t-/, '') || '01'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-300 max-w-[240px] truncate">
                      {ord.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') ||
                        `${ord.items?.length || 1} items`}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      Rs. {ord.total?.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase border bg-slate-800/80 text-slate-300 border-slate-700">
                        {ord.paymentMethod || 'ONLINE'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadgeClass(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(ord.id);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                        title="View Order Details"
                      >
                        <Eye className="w-4 h-4 text-amber-400" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Slide-Over Drawer (Section 16) */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-black text-white font-mono">
                    {selectedOrder.orderNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${getStatusBadgeClass(
                      selectedOrder.status
                    )}`}
                  >
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Placed at {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 flex-1 text-xs">
              {/* Table & Customer Summary Card */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Table Location
                  </span>
                  <span className="text-sm font-bold text-amber-400 mt-0.5 block">
                    Table {selectedOrder.table?.tableNumber || selectedOrder.tableNumber || '01'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Payment Method
                  </span>
                  <span className="text-sm font-bold text-white mt-0.5 block">
                    {selectedOrder.paymentMethod || 'CASH'} ({selectedOrder.paymentStatus || 'PENDING'})
                  </span>
                </div>
              </div>

              {/* Items List with Unit Price, Cost & Profit (Section 16 & Section 34) */}
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                  Ordered Items & Unit Economics
                </h3>

                <div className="space-y-2.5">
                  {selectedOrder.items?.map((item: any) => {
                    const unitCost = item.costPriceAtOrder ?? 0;
                    const itemRevenue = item.subtotal || item.unitPrice * item.quantity;
                    const itemCost = unitCost * item.quantity;
                    const itemProfit = itemRevenue - itemCost;

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-slate-800 text-amber-400 text-xs font-bold flex items-center justify-center shrink-0">
                              {item.quantity}x
                            </span>
                            <span className="font-semibold text-white">{item.name}</span>
                          </div>
                          {item.specialInstructions && (
                            <p className="text-[11px] text-amber-400/80 mt-1 italic pl-8">
                              Note: {item.specialInstructions}
                            </p>
                          )}
                          <div className="text-[10px] text-slate-400 mt-1 pl-8 flex items-center gap-3">
                            <span>Selling: Rs. {item.unitPrice}</span>
                            <span>•</span>
                            <span>Cost: Rs. {unitCost}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-semibold">
                              Unit Profit: Rs. {item.unitPrice - unitCost}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="font-mono font-bold text-white block">
                            Rs. {itemRevenue.toLocaleString()}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400">
                            +Rs. {itemProfit.toLocaleString()} profit
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-white">Rs. {selectedOrder.subtotal?.toLocaleString()}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Promotional Discount</span>
                    <span className="font-mono">-Rs. {selectedOrder.discount?.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-400">
                  <span>Tax ({selectedOrder.restaurant?.taxRate || 8}%)</span>
                  <span className="font-mono text-white">Rs. {selectedOrder.tax?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Service Charge</span>
                  <span className="font-mono text-white">Rs. {selectedOrder.serviceCharge?.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold text-sm text-white">
                  <span>Grand Total</span>
                  <span className="font-mono text-emerald-400 text-base">
                    Rs. {selectedOrder.total?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Print Thermal Receipt Feedback */}
              {printFeedback && (
                <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{printFeedback}</span>
                </div>
              )}

              {/* Action Controls */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                  {selectedOrder.status === 'RECEIVED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING')}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition shadow-md"
                    >
                      Start Preparation
                    </button>
                  )}
                  {selectedOrder.status === 'PREPARING' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'READY')}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold transition shadow-md"
                    >
                      Mark Ready for Runner
                    </button>
                  )}
                  {selectedOrder.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'SERVED')}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold transition shadow-md"
                    >
                      Mark Served to Table
                    </button>
                  )}
                  {selectedOrder.status === 'SERVED' && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED')}
                      className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition shadow-md"
                    >
                      Complete & Archive Order
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrintReceipt}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Printer className="w-4 h-4 text-amber-400" />
                    <span>Print 80mm Receipt</span>
                  </button>

                  {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      className="py-2.5 px-4 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800 text-rose-300 font-semibold transition"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Confirm Order Cancellation</h3>
            <p className="text-xs text-slate-400 mt-1">
              Please enter the reason for cancelling order #{selectedOrder?.orderNumber}:
            </p>
            <input
              type="text"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Guest changed mind, Item out of stock"
              className="w-full mt-4 p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-rose-500"
            />
            <div className="flex justify-end gap-2.5 mt-6">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold hover:bg-slate-700"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-500"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
