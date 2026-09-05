'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  Search,
  Calendar,
  Filter,
  Printer,
  Eye,
  RefreshCw,
  Utensils,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Phase5Layout } from '../../../components/phase5/Phase5Layout';
import { ThermalReceiptModal } from '../../../components/phase5/ThermalReceiptModal';
import { waiterService } from '../../../services/waiter.service';
import { useAuthContext } from '../../../context/AuthContext';
import { ThermalReceiptPayload } from '@qr-menu/shared';

export default function WaiterHistoryPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const [selectedReceipt, setSelectedReceipt] = useState<ThermalReceiptPayload | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await waiterService.getOrders(
        {
          status: statusFilter !== 'ALL' ? statusFilter : undefined,
          search: searchQuery || undefined,
          limit: 50,
        },
        token
      );
      setOrders(data || []);
    } catch (err) {
      console.error('Failed to load waiter order history', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, statusFilter, searchQuery]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handlePrint = (order: any) => {
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
        subtotal: i.subtotal || 0,
      })),
      subtotal: order.total ? parseFloat((order.total / 1.08).toFixed(2)) : 0,
      serviceCharge: 5.0,
      tax: order.total ? parseFloat((order.total - order.total / 1.08).toFixed(2)) : 0,
      discount: 0,
      total: order.total,
      paymentMethod: order.paymentStatus === 'COMPLETED' ? 'PAID' : 'PENDING',
    };

    setSelectedReceipt(receipt);
    setReceiptOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SERVED':
      case 'COMPLETED':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'READY':
        return 'bg-yellow-500/15 text-yellow-300 border-yellow-500/30';
      case 'CANCELLED':
        return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <Phase5Layout
      role="WAITER"
      title="Order History Archive"
      subtitle="Complete chronological record of all served and completed dining orders"
      headerAction={
        <button
          onClick={fetchHistory}
          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          title="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      }
    >
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {['ALL', 'COMPLETED', 'SERVED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === st
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {st === 'ALL' ? 'All Orders' : st}
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

      {/* Orders Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-bold">Order ID</th>
                <th className="px-4 py-3.5 font-bold">Table</th>
                <th className="px-4 py-3.5 font-bold">Items Count</th>
                <th className="px-4 py-3.5 font-bold">Total Amount</th>
                <th className="px-4 py-3.5 font-bold">Status</th>
                <th className="px-4 py-3.5 font-bold">Placed At</th>
                <th className="px-5 py-3.5 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                    Loading order archive...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate-500">
                    <Utensils className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-400">No order history found</p>
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-850/50 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white font-mono">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-amber-400">
                      Table {order.tableNumber}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 font-mono">
                      {order.itemsCount} dishes
                    </td>
                    <td className="px-4 py-3.5 font-bold text-white font-mono">
                      PKR {order.total?.toLocaleString()}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
                          order.status
                        )}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(order.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handlePrint(order)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Print Bill</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Thermal Receipt Modal */}
      <ThermalReceiptModal
        receipt={selectedReceipt}
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </Phase5Layout>
  );
}
