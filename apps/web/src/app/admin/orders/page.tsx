'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
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

export default function AdminOrdersPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [orders, setOrders] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Order Details Drawer
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

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
  }, [on]);

  const fetchOrders = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await adminService.getOrders(
        restaurantId,
        {
          status: selectedStatus === 'ALL' ? undefined : selectedStatus,
          search: searchQuery || undefined,
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
  };

  useEffect(() => {
    fetchOrders();
  }, [restaurantId, token, selectedStatus]);

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
      const updated = await adminService.updateOrderStatus(orderId, nextStatus, token);
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

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'RECEIVED':
      case 'PENDING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'PREPARING':
      case 'COOKING':
      case 'IN_KITCHEN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'READY':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'SERVED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <AdminLayout
      title="Order Management"
      subtitle="Live Kitchen & Dining Room Transaction Control"
      onRefresh={fetchOrders}
      isRefreshing={refreshing}
    >
      {/* Top Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSelectedStatus(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                  selectedStatus === tab
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
              placeholder="Search Order # or Table..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Items / Details</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No orders matching the selected filter.
                  </td>
                </tr>
              ) : (
                orders.map((ord) => (
                  <tr
                    key={ord.id}
                    onClick={() => handleOpenDetails(ord.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {ord.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        Table {ord.table?.tableNumber || ord.tableNumber || ord.tableId?.replace(/^t-/, '') || '01'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 max-w-[220px] truncate">
                      {ord.items?.map((i: any) => `${i.quantity}x ${i.name}`).join(', ') ||
                        `${ord.items?.length || 1} items`}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {ord.total.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                          ord.paymentStatus === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {ord.paymentMethod} • {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadgeClass(
                          ord.status
                        )}`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(ord.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetails(ord.id);
                        }}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSelectedOrder(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="h-16 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black font-mono text-slate-900">
                      {selectedOrder.orderNumber}
                    </h3>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${getStatusBadgeClass(
                        selectedOrder.status
                      )}`}
                    >
                      {selectedOrder.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Table{' '}
                    {selectedOrder.table?.tableNumber ||
                      selectedOrder.tableNumber ||
                      selectedOrder.tableId?.replace(/^t-/, '') ||
                      '01'}{' '}
                    • {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-900 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Itemized Breakdown */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Itemized Order Details
                  </h4>
                  <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
                    {selectedOrder.items?.map((item: any) => (
                      <div key={item.id} className="p-3 bg-white text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-slate-900">
                            <span className="font-bold text-amber-700">{item.quantity}x </span>
                            {item.name}
                          </div>
                          <span className="font-mono font-bold text-slate-900 whitespace-nowrap">
                            Rs. {item.subtotal.toLocaleString()}
                          </span>
                        </div>
                        {item.costPriceAtOrder ? (
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>Cost: Rs. {item.costPriceAtOrder * item.quantity}</span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold">
                              Profit: Rs.{' '}
                              {(item.subtotal - item.costPriceAtOrder * item.quantity).toLocaleString()}
                            </span>
                          </div>
                        ) : null}
                        {item.specialInstructions && (
                          <p className="text-[11px] text-amber-800 bg-amber-50 p-1.5 rounded mt-1.5 border border-amber-200">
                            Note: {item.specialInstructions}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-mono">Rs. {selectedOrder.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Tax (GST)</span>
                    <span className="font-mono">Rs. {selectedOrder.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Service Charge</span>
                    <span className="font-mono">Rs. {selectedOrder.serviceCharge.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                    <span>Grand Total</span>
                    <span className="font-mono">Rs. {selectedOrder.total.toLocaleString()}</span>
                  </div>

                  {selectedOrder.financialBreakdown && (
                    <div className="pt-2 border-t border-slate-200 text-[11px]">
                      <div className="flex justify-between text-slate-500">
                        <span>Cost of Goods (COGS)</span>
                        <span className="font-mono">
                          Rs. {selectedOrder.financialBreakdown.costOfGoodsSold.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold mt-1">
                        <span>Gross Profit</span>
                        <span className="font-mono">
                          Rs. {selectedOrder.financialBreakdown.grossProfit.toLocaleString()} (
                          {selectedOrder.financialBreakdown.profitMargin}%)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stage Progression Actions */}
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Advance Operational Stage
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedOrder.status === 'RECEIVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'PREPARING' as any)}
                        className="py-2 px-3 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-bold transition shadow-xs"
                      >
                        Start Cooking (PREPARING)
                      </button>
                    )}
                    {selectedOrder.status === 'PREPARING' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'READY' as any)}
                        className="py-2 px-3 bg-purple-600 hover:bg-purple-500 text-white rounded-md text-xs font-bold transition shadow-xs col-span-2"
                      >
                        Mark Ready for Table (READY)
                      </button>
                    )}
                    {selectedOrder.status === 'READY' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'SERVED' as any)}
                        className="py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white rounded-md text-xs font-bold transition shadow-xs col-span-2"
                      >
                        Delivered to Table (SERVED)
                      </button>
                    )}
                    {selectedOrder.status === 'SERVED' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'COMPLETED' as any)}
                        className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold transition shadow-xs col-span-2"
                      >
                        Close & Complete Order
                      </button>
                    )}
                  </div>
                </div>

                {/* Cancel Action */}
                {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' && (
                  <div className="pt-4 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setCancelModalOpen(true)}
                      className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-bold transition"
                    >
                      Cancel Order & Restore Inventory
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-sm font-bold text-slate-900">Cancel Order #{selectedOrder?.orderNumber}</h3>
            </div>

            <p className="text-xs text-slate-600">
              Cancelling this order will mark it as cancelled, restore deducted stock count back to inventory, and log the action in the staff audit logs.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Customer changed mind, out of ingredient"
                className="w-full p-2 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalOpen(false)}
                className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100 transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                className="py-1.5 px-3 rounded text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
