'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Clock, ArrowUpRight, Search } from 'lucide-react';
import { useDashboardTheme } from './DashboardThemeContext';
import { RecentOrderSummary } from '@qr-menu/shared';

interface DashboardRecentOrdersProps {
  orders: (RecentOrderSummary & { customerName?: string })[];
  loading: boolean;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
  SERVED: 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30',
  READY: 'bg-[#22D3EE]/15 text-[#22D3EE] border-[#22D3EE]/30',
  PREPARING: 'bg-[#F5B342]/15 text-[#F5B342] border-[#F5B342]/30',
  COOKING: 'bg-[#F5B342]/15 text-[#F5B342] border-[#F5B342]/30',
  IN_KITCHEN: 'bg-[#F5B342]/15 text-[#F5B342] border-[#F5B342]/30',
  PENDING: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  RECEIVED: 'bg-[#F97316]/15 text-[#F97316] border-[#F97316]/30',
  CANCELLED: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const PAYMENT_STYLES: Record<string, string> = {
  PAID: 'text-[#22C55E] bg-[#22C55E]/10 border-[#22C55E]/20',
  PENDING: 'text-[#F5B342] bg-[#F5B342]/10 border-[#F5B342]/20',
  FAILED: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
};

export function DashboardRecentOrders({ orders, loading }: DashboardRecentOrdersProps) {
  const { resolvedTheme } = useDashboardTheme();
  const isLight = resolvedTheme === 'light';

  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      o.orderNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      o.tableNumber.toLowerCase().includes(filterText.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(filterText.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div
      className={`rounded-2xl border p-5 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800'
          : 'bg-[#15171A] border-[#25282D] text-[#F8FAFC]'
      }`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/20">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-inherit">Recent Orders Ledger</h3>
            <p className="text-[11px] text-[#A1A1AA]">Real-time incoming dining orders</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A1A1AA]" />
            <input
              type="text"
              placeholder="Filter table/order..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className={`pl-8 pr-2.5 py-1.5 rounded-lg text-xs outline-none border transition ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-900 focus:border-[#F5B342]'
                  : 'bg-[#1B1E23] border-[#25282D] text-[#F8FAFC] placeholder-[#A1A1AA] focus:border-[#F5B342]'
              }`}
            />
          </div>

          <Link
            href="/admin/orders"
            className="flex items-center gap-1 text-xs font-semibold text-[#F5B342] hover:text-[#D6A84F] transition shrink-0 ml-1"
          >
            <span>View All</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-12 rounded-xl bg-black/10 animate-pulse" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#A1A1AA]">
          No orders found matching criteria
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr
                className={`border-b text-[10px] font-bold uppercase tracking-wider text-[#A1A1AA] ${
                  isLight ? 'border-slate-100' : 'border-[#25282D]'
                }`}
              >
                <th className="py-2.5 px-2">Order #</th>
                <th className="py-2.5 px-2">Table</th>
                <th className="py-2.5 px-2">Items</th>
                <th className="py-2.5 px-2">Status</th>
                <th className="py-2.5 px-2">Payment</th>
                <th className="py-2.5 px-2 text-right">Amount</th>
                <th className="py-2.5 px-2 text-right">Time</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-[#25282D]/60'}`}>
              {filteredOrders.slice(0, 7).map((order) => {
                const statusStyle = STATUS_STYLES[order.status] || STATUS_STYLES.PENDING;
                const paymentStyle = PAYMENT_STYLES[order.paymentStatus] || PAYMENT_STYLES.PENDING;

                return (
                  <tr
                    key={order.id}
                    className={`transition ${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1B1E23]/60'}`}
                  >
                    <td className="py-2.5 px-2 font-mono font-bold text-inherit">
                      {order.orderNumber}
                    </td>
                    <td className="py-2.5 px-2">
                      <span className="font-semibold px-2 py-0.5 rounded-md bg-[#F5B342]/10 text-[#F5B342] border border-[#F5B342]/20 text-[10px]">
                        Table {order.tableNumber}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-inherit font-medium">
                      {order.itemCount} items
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${statusStyle}`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${paymentStyle}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-[#F5B342]">
                      Rs. {order.total.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right text-[11px] text-[#A1A1AA]">
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
