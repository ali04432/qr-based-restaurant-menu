'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Clock3,
  ExternalLink,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  ReceiptText,
  Utensils,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import CustomerLayout from '../../../components/customer/CustomerLayout';
import { orderService } from '../../../services/order.service';

interface LocalOrderHistoryItem {
  id: string;
  restaurantId: string;
  tableNumber: string;
  total: number;
  itemsCount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  status: string;
  paymentMethod?: string;
  createdAt: string;
}

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<LocalOrderHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('silver_sapoon_order_history');
        if (stored) {
          const parsed: LocalOrderHistoryItem[] = JSON.parse(stored);
          setOrders(parsed);
        }
      } catch (err) {
        console.error('Failed to parse order history:', err);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Ready
          </span>
        );
      case 'SERVED':
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
            Served
          </span>
        );
      case 'IN_KITCHEN':
      case 'COOKING':
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[var(--accent-gold)]/15 text-[var(--accent-gold)] border border-[var(--accent-gold)]/30 animate-pulse">
            Cooking
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-zinc-500/15 text-zinc-300 border border-zinc-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <CustomerLayout>
      <div className="mx-auto w-full max-w-[1200px] px-4 pb-16 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--text-secondary)] transition hover:text-[var(--accent-gold)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Menu
          </Link>

          <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--accent-gold)]">
                Dining History
              </p>
              <h1 className="mt-1 text-3xl font-black text-[var(--text-primary)]">
                Your Past Orders
              </h1>
            </div>

            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[var(--accent-gold)] px-5 text-xs font-bold text-black hover:brightness-110 transition w-fit"
            >
              <Utensils className="h-4 w-4" />
              Order More
            </Link>
          </div>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border-color)] bg-[var(--bg-card)] p-12 text-center max-w-lg mx-auto">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-muted)] mb-5">
              <ShoppingBag className="h-7 w-7" />
            </div>

            <h2 className="text-xl font-black text-[var(--text-primary)]">
              No orders placed yet
            </h2>

            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
              When you order from your table, your order details and receipts will appear here.
            </p>

            <Link
              href="/"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--accent-gold)] px-6 text-xs font-black text-black transition hover:brightness-105"
            >
              Explore Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-card)] p-5 sm:p-6 transition hover:border-[var(--accent-gold)]/30 hover:shadow-xl"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border-color)] pb-4">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black text-[var(--text-primary)]">
                          Order #{order.id.substring(0, 8).toUpperCase()}
                        </span>
                        {getStatusBadge(order.status)}
                      </div>

                      <div className="mt-1 flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>Table {order.tableNumber}</span>
                        <span>•</span>
                        <span>{formattedDate}</span>
                        {order.paymentMethod && (
                          <>
                            <span>•</span>
                            <span className="uppercase">{order.paymentMethod}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <div className="text-xs text-[var(--text-muted)]">Total Paid</div>
                      <div className="text-lg font-black text-[var(--accent-gold)]">
                        Rs. {Number(order.total).toLocaleString('en-PK')}
                      </div>
                    </div>
                  </div>

                  {/* Items preview */}
                  <div className="py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)] mb-2">
                      Items Ordered ({order.itemsCount || order.items?.length || 1})
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {order.items?.map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs text-[var(--text-primary)]"
                        >
                          <span className="font-bold text-[var(--accent-gold)]">{item.quantity}×</span>
                          <span>{item.name}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[var(--border-color)]">
                    <Link
                      href={`/orders/track?orderId=${encodeURIComponent(order.id)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--accent-gold)] text-black text-xs font-bold hover:brightness-110 transition shadow-md"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Live Status Tracker
                    </Link>

                    <Link
                      href={`/feedback?orderId=${encodeURIComponent(order.id)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] text-xs font-semibold hover:border-[var(--accent-gold)]/30 hover:text-[var(--accent-gold)] transition"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Review Dining Experience
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
