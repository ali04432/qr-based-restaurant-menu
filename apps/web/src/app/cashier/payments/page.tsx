'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  Layers,
  Search,
  CheckCircle2,
  Clock,
  Printer,
  RefreshCw,
  Receipt,
  RotateCcw,
  Calendar,
  Filter,
  DollarSign,
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Phase5Layout } from '../../../components/phase5/Phase5Layout';
import { ThermalReceiptModal } from '../../../components/phase5/ThermalReceiptModal';
import { useAuthContext } from '../../../context/AuthContext';
import { cashierService } from '../../../services/cashier.service';
import { ThermalReceiptPayload, PaymentMethod } from '@qr-menu/shared';

export default function CashierPaymentsLedgerPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);

  // Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [refundReason, setRefundReason] = useState('Customer Request');
  const [refundAmount, setRefundAmount] = useState('');
  const [processingRefund, setProcessingRefund] = useState(false);

  // Thermal Receipt Modal State
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ThermalReceiptPayload | null>(null);

  const fetchTransactions = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await cashierService.getTransactions(
        {
          method: methodFilter === 'ALL' ? undefined : methodFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery || undefined,
          page,
          limit: 25,
        },
        token
      );
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [token, methodFilter, statusFilter, searchQuery, page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Open Refund Modal
  const openRefund = (tx: any) => {
    setSelectedTx(tx);
    setRefundAmount(tx.amount.toString());
    setRefundReason('Order cancellation / Customer dispute');
    setRefundModalOpen(true);
  };

  // Submit Refund
  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedTx) return;

    try {
      setProcessingRefund(true);
      await cashierService.refundPayment(
        selectedTx.id,
        {
          paymentId: selectedTx.id,
          amount: parseFloat(refundAmount) || selectedTx.amount,
          reason: refundReason,
        },
        token
      );

      alert(`Refund processed successfully for Transaction #${selectedTx.id.slice(-6)}`);
      setRefundModalOpen(false);
      setSelectedTx(null);
      fetchTransactions();
    } catch (err: any) {
      console.error('Failed to process refund:', err);
      alert(err.message || 'Refund processing failed');
    } finally {
      setProcessingRefund(false);
    }
  };

  // Open Receipt Modal
  const handleReprintReceipt = async (tx: any) => {
    if (!token) return;
    try {
      const receiptData = await cashierService.getReceipt(tx.id, token);
      setActiveReceipt(receiptData);
      setReceiptModalOpen(true);
    } catch (err) {
      console.error('Failed to load receipt:', err);
      alert('Could not fetch receipt data');
    }
  };

  // KPI Calculations
  const totalSettled = transactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const cashTotal = transactions
    .filter((t) => t.status === 'COMPLETED' && t.method === 'CASH')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const digitalTotal = transactions
    .filter((t) => t.status === 'COMPLETED' && t.method !== 'CASH')
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const refundTotal = transactions
    .filter((t) => t.status === 'REFUNDED')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const getMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <Banknote className="w-3 h-3" />
            <span>Cash</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">
            <CreditCard className="w-3 h-3" />
            <span>Card</span>
          </span>
        );
      case 'JAZZCASH':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
            <Smartphone className="w-3 h-3" />
            <span>JazzCash</span>
          </span>
        );
      case 'EASYPAISA':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
            <Smartphone className="w-3 h-3" />
            <span>Easypaisa</span>
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">
            <Landmark className="w-3 h-3" />
            <span>Bank</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
            <Layers className="w-3 h-3" />
            <span>{method}</span>
          </span>
        );
    }
  };

  return (
    <Phase5Layout
      role="CASHIER"
      title="Payments Ledger & Transactions"
      subtitle="Comprehensive audit trail of all register collections, digital payments, refunds, and receipts"
      headerAction={
        <div className="flex items-center space-x-2">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
            title="Refresh transaction ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Financial Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Total Settled
              </p>
              <h3 className="text-2xl font-black text-emerald-400 mt-1">
                PKR {totalSettled.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Across all channels</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Cash in Register
              </p>
              <h3 className="text-2xl font-black text-amber-400 mt-1">
                PKR {cashTotal.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Physical drawer cash</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Banknote className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Digital & Cards
              </p>
              <h3 className="text-2xl font-black text-sky-400 mt-1">
                PKR {digitalTotal.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">POS & Mobile Wallets</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Refunds Issued
              </p>
              <h3 className="text-2xl font-black text-rose-400 mt-1">
                PKR {refundTotal.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Disputes & Returns</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <RotateCcw className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          {/* Method Selector Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
            {['ALL', 'CASH', 'CARD', 'JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER'].map((method) => (
              <button
                key={method}
                onClick={() => setMethodFilter(method)}
                className={`px-3 py-1.5 rounded-xl border text-[11px] font-bold whitespace-nowrap transition-all ${
                  methodFilter === method
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md shadow-amber-500/20'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {method}
              </button>
            ))}
          </div>

          {/* Status filter & Search */}
          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500/60"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Settled</option>
              <option value="REFUNDED">Refunded</option>
              <option value="PENDING">Pending</option>
            </select>

            <div className="relative w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order # or Transaction ID..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table Container */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-bold border-b border-slate-800 text-[10px]">
                <tr>
                  <th className="p-4">Tx ID / Ref</th>
                  <th className="p-4">Order & Table</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Method</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Processed By</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                      <span>Loading ledger transactions...</span>
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                      <p className="text-sm font-bold text-slate-300">No Transactions Found</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Try clearing or adjusting filters.
                      </p>
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isRefunded = tx.status === 'REFUNDED';
                    const isCompleted = tx.status === 'COMPLETED';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-slate-300">
                          #{tx.id.slice(-8).toUpperCase()}
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-white">
                            Order #{tx.order?.orderNumber || tx.orderId?.slice(-6)}
                          </div>
                          <div className="text-[10px] text-amber-400/90 font-medium">
                            {tx.order?.table?.tableNumber
                              ? `Table ${tx.order.table.tableNumber}`
                              : 'Walk-in'}
                          </div>
                        </td>

                        <td className="p-4 text-slate-400">
                          <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {new Date(tx.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        <td className="p-4">{getMethodBadge(tx.method)}</td>

                        <td className="p-4">
                          <div className="font-mono font-black text-white text-sm">
                            PKR {(tx.amount || 0).toLocaleString()}
                          </div>
                          {tx.changeAmount > 0 && (
                            <div className="text-[10px] text-emerald-400 font-mono">
                              Change: PKR {tx.changeAmount}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-slate-300 font-medium">
                          {tx.processedBy?.name || 'Cashier Register'}
                        </td>

                        <td className="p-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isCompleted
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : isRefunded
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleReprintReceipt(tx)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all"
                              title="Reprint 80mm receipt"
                            >
                              <Printer className="w-3.5 h-3.5 text-amber-400" />
                            </button>

                            {isCompleted && (
                              <button
                                onClick={() => openRefund(tx)}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[11px] font-bold transition-all flex items-center space-x-1"
                                title="Issue Refund"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Refund</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Showing Page {page}</span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={transactions.length < 25}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 disabled:opacity-40 hover:bg-slate-700 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Refund Processing Modal */}
      {refundModalOpen && selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Process Refund</h3>
                  <p className="text-xs text-slate-400">
                    Tx #{selectedTx.id.slice(-8).toUpperCase()} • Order #
                    {selectedTx.order?.orderNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Refund Amount (PKR) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedTx.amount}
                  step="any"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none focus:border-rose-500/60"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Maximum refundable: PKR {selectedTx.amount.toLocaleString()}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Reason for Refund <span className="text-rose-400">*</span>
                </label>
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500/60"
                >
                  <option value="Customer Dispute">Customer Dispute</option>
                  <option value="Wrong Item Prepared">Wrong Item Prepared</option>
                  <option value="Kitchen Delay">Kitchen Delay</option>
                  <option value="Billing Discrepancy">Billing Discrepancy</option>
                  <option value="Order Cancelled">Order Cancelled</option>
                  <option value="Other">Other Reason</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>
                  This will reversibly update the payment status to <strong>REFUNDED</strong> and
                  log a permanent audit trail.
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                >
                  {processingRefund ? 'Refunding...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Preview Modal */}
      {receiptModalOpen && activeReceipt && (
        <ThermalReceiptModal
          isOpen={receiptModalOpen}
          receipt={activeReceipt}
          onClose={() => setReceiptModalOpen(false)}
        />
      )}
    </Phase5Layout>
  );
}
