'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  X,
  Wallet,
  Building,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { PaymentRecord, PaymentSummary, UserRole } from '@qr-menu/shared';

const STATUS_FILTERS = ['ALL', 'COMPLETED', 'PENDING', 'FAILED', 'REFUNDED'];
const METHOD_FILTERS = ['ALL', 'CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'ONLINE'];

export default function AdminPaymentsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedMethod, setSelectedMethod] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mark Payment Modal
  const [actionPayment, setActionPayment] = useState<PaymentRecord | null>(null);
  const [actionStatus, setActionStatus] = useState('COMPLETED');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [payData, sumData] = await Promise.all([
        adminService.getPayments(
          restaurantId,
          {
            status: selectedStatus === 'ALL' ? undefined : selectedStatus,
            method: selectedMethod === 'ALL' ? undefined : selectedMethod,
            search: searchQuery || undefined,
          },
          token
        ),
        adminService.getPaymentSummary(restaurantId, token),
      ]);
      setPayments(payData || []);
      setSummary(sumData || null);
    } catch (err) {
      console.warn('[AdminPayments] Failed to fetch payments', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, selectedStatus, selectedMethod, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdatePaymentStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !actionPayment) return;
    setIsSubmitting(true);

    try {
      await adminService.markPaymentStatus(
        actionPayment.id,
        actionStatus,
        transactionRef.trim() || undefined,
        token
      );
      setActionPayment(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update payment status');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Payments & Cashier Register"
      subtitle="Reconcile Cash Collections, POS Card Swipes & Digital Wallet Receipts"
      requiredRoles={[
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MANAGER,
        UserRole.CASHIER,
        UserRole.WAITER,
      ]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Total Revenue Collected
          </span>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
            Rs. {summary?.totalCollected?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-emerald-400 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Confirmed & Settled
          </p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Pending Table Collections
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-400 mt-1 font-mono">
            Rs. {summary?.pendingAmount?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Awaiting cashier checkout</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Cash in Register
          </span>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
            Rs. {summary?.cashTotal?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Physical currency collected</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Card & Digital Wallets
          </span>
          <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">
            Rs. {((summary?.cardTotal || 0) + (summary?.digitalTotal || 0)).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">POS Card + JazzCash + EasyPaisa</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    selectedStatus === s
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                      : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Method Select */}
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="p-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              {METHOD_FILTERS.map((m) => (
                <option key={m} value={m}>
                  {m === 'ALL' ? 'All Payment Methods' : m}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order # or Ref..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
            <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Order #</th>
                <th className="py-3.5 px-4">Table</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Txn Reference</th>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    Loading payment records...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    No transactions recorded for this filter.
                  </td>
                </tr>
              ) : (
                payments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {pay.orderNumber || pay.orderId.slice(0, 8)}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold border border-slate-700">
                        Table {pay.tableNumber || '01'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                        {pay.method}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                      Rs. {pay.amount.toLocaleString()}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          pay.status === 'COMPLETED'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : pay.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {pay.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                      {pay.transactionRef || '—'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(pay.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {pay.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActionPayment(pay);
                            setActionStatus('COMPLETED');
                            setTransactionRef('');
                          }}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold transition shadow-xs"
                        >
                          Collect
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-semibold">Settled</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Payment Reconciliation Modal */}
      {actionPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Reconcile & Settle Payment</h3>
            <p className="text-xs text-slate-400 mt-1">
              Order: #{actionPayment.orderNumber || actionPayment.orderId.slice(0, 8)} • Amount: Rs. {actionPayment.amount.toLocaleString()}
            </p>

            <form onSubmit={handleUpdatePaymentStatus} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Payment Status</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                >
                  <option value="COMPLETED">COMPLETED (Received in Full)</option>
                  <option value="FAILED">FAILED (Declined)</option>
                  <option value="REFUNDED">REFUNDED (Returned)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  POS Slip / Transaction Reference (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TXN-928318 or Cash Slip"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setActionPayment(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Settlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
