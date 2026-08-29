'use client';

import React, { useState, useEffect } from 'react';
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

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token, selectedStatus, selectedMethod]);

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
      subtitle="Reconcile Cash Collections, POS Card Swipes & Digital Wallets"
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
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total Revenue Collected
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            Rs. {summary?.totalCollected?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-emerald-700 font-semibold mt-1">Confirmed & Settled</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Pending Table Collections
          </span>
          <div className="text-xl sm:text-2xl font-black text-amber-700 mt-1 font-mono">
            Rs. {summary?.pendingAmount?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-amber-700 font-semibold mt-1">Awaiting cashier receipt</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Cash Collections
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            Rs. {summary?.cashTotal?.toLocaleString() || '0'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Physical cash in register</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Card & Digital Wallets
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 font-mono">
            Rs. {((summary?.cardTotal || 0) + (summary?.digitalTotal || 0)).toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">POS Card + JazzCash / EasyPaisa</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSelectedStatus(s)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition ${
                    selectedStatus === s
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
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
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-semibold focus:outline-hidden"
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
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Search Order # or Ref..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Order #</th>
                <th className="py-3 px-4">Table</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Txn Reference</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No payment records matching the selected filter.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {p.orderNumber}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-800">
                        Table {p.tableNumber || '01'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {p.method}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      Rs. {p.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          p.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'PENDING'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {p.transactionRef || '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(p.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {p.status === 'PENDING' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setActionPayment(p);
                            setActionStatus('COMPLETED');
                            setTransactionRef('');
                          }}
                          className="py-1 px-2.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-bold transition shadow-2xs"
                        >
                          Confirm Receipt
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setActionPayment(p);
                            setActionStatus('REFUNDED');
                            setTransactionRef('');
                          }}
                          className="text-[11px] text-slate-500 hover:text-slate-800 font-medium hover:underline"
                        >
                          Update Status
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Action Modal */}
      {actionPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Confirm Payment: {actionPayment.orderNumber}
              </h3>
              <button
                type="button"
                onClick={() => setActionPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePaymentStatus} className="space-y-3">
              <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bill Amount:</span>
                  <span className="font-mono font-bold text-slate-900">
                    Rs. {actionPayment.amount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Method:</span>
                  <span className="font-semibold text-slate-900">{actionPayment.method}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Status
                </label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                >
                  <option value="COMPLETED">COMPLETED (Funds Collected)</option>
                  <option value="REFUNDED">REFUNDED (Reversed)</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  POS Slip / Bank Reference # (Optional)
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder="e.g. TXN-99824, CASH-DRAWER-1"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActionPayment(null)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Update Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
