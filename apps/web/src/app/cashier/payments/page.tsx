'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Banknote,
  CreditCard,
  RotateCcw,
  Smartphone,
  Landmark,
  Layers,
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';
import { CashierShell } from '../../../components/cashier/CashierShell';
import { StatCard } from '../../../components/cashier/StatCard';
import { StatusBadge } from '../../../components/cashier/Badge';
import { PillTabs } from '../../../components/cashier/PillTabs';
import { SearchInput } from '../../../components/cashier/SearchInput';
import { DataTable } from '../../../components/cashier/DataTable';
import { EmptyState } from '../../../components/cashier/EmptyState';
import { ThermalReceiptModal } from '../../../components/phase5/ThermalReceiptModal';
import { useAuthContext } from '../../../context/AuthContext';
import { cashierService } from '../../../services/cashier.service';
import { ThermalReceiptPayload } from '@qr-menu/shared';

const METHOD_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card / POS' },
  { id: 'JAZZCASH', label: 'JazzCash' },
  { id: 'EASYPAISA', label: 'Easypaisa' },
  { id: 'BANK_TRANSFER', label: 'Bank' },
];

export default function CashierPaymentsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

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
          limit: 50,
        },
        token
      );
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [token, methodFilter, statusFilter, searchQuery]);

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

  const renderMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[rgba(34,197,94,0.14)] text-[#22C55E] border border-[rgba(34,197,94,0.4)] text-[11px] font-bold">
            <Banknote className="w-3.5 h-3.5" />
            <span>Cash</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[rgba(34,211,238,0.14)] text-[#22D3EE] border border-[rgba(34,211,238,0.4)] text-[11px] font-bold">
            <CreditCard className="w-3.5 h-3.5" />
            <span>Card / POS</span>
          </span>
        );
      case 'JAZZCASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[rgba(249,115,22,0.14)] text-[#F97316] border border-[rgba(249,115,22,0.4)] text-[11px] font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>JazzCash</span>
          </span>
        );
      case 'EASYPAISA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[rgba(34,197,94,0.14)] text-[#22C55E] border border-[rgba(34,197,94,0.4)] text-[11px] font-bold">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Easypaisa</span>
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[rgba(139,92,246,0.16)] text-[#8B5CF6] border border-[rgba(139,92,246,0.4)] text-[11px] font-bold">
            <Landmark className="w-3.5 h-3.5" />
            <span>Bank</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#1B1E23] text-[#A1A1AA] border border-[#25282D] text-[11px] font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>Other</span>
          </span>
        );
    }
  };

  return (
    <CashierShell
      title="Payment Transactions"
      subtitle="Settled orders, digital channels, and payment refunds"
      onRefresh={fetchTransactions}
      isRefreshing={loading}
    >
      {/* 4 Stat Cards */}
      <section aria-label="Payments overview" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="TOTAL SETTLED"
          value={`PKR ${totalSettled.toLocaleString()}`}
          sub="Across all channels"
          color="#22C55E"
          tint="rgba(34,197,94,0.14)"
          icon={<DollarSign className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="CASH IN REGISTER"
          value={`PKR ${cashTotal.toLocaleString()}`}
          sub="Physical drawer cash"
          color="#F5B342"
          tint="rgba(245,179,66,0.14)"
          icon={<Banknote className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="DIGITAL & CARDS"
          value={`PKR ${digitalTotal.toLocaleString()}`}
          sub="POS & Mobile wallets"
          color="#22D3EE"
          tint="rgba(34,211,238,0.14)"
          icon={<CreditCard className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="REFUNDS ISSUED"
          value={`PKR ${refundTotal.toLocaleString()}`}
          sub="Disputes & returns"
          color="#F97316"
          tint="rgba(249,115,22,0.14)"
          icon={<RotateCcw className="w-5 h-5" strokeWidth={1.8} />}
        />
      </section>

      {/* Filter Bar */}
      <div className="bg-[#15171A] border border-[#25282D] rounded-[16px] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <PillTabs
          tabs={METHOD_TABS}
          activeTab={methodFilter}
          onChange={setMethodFilter}
          ariaLabel="Payment method filter"
        />

        <div className="flex items-center gap-2.5 flex-1 max-w-md">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="box-border min-h-[44px] px-3.5 rounded-[12px] border border-[#25282D] bg-[#1B1E23] text-[#F8FAFC] text-[13px] outline-none cursor-pointer focus:border-[#F5B342]"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Settled</option>
            <option value="REFUNDED">Refunded</option>
            <option value="PENDING">Pending</option>
          </select>

          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search Order # or Tx Ref..."
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="w-full">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#A1A1AA] bg-[#15171A] border border-[#25282D] rounded-[16px]">
            Loading transaction records...
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState message="No transactions match your criteria." />
        ) : (
          <DataTable
            headers={[
              'Tx Ref',
              'Order & Table',
              'Date & Time',
              'Method',
              'Amount',
              'Status',
              'Actions',
            ]}
            alignRightIndices={[4, 6]}
          >
            {transactions.map((tx) => {
              const isCompleted = tx.status === 'COMPLETED';
              const isRefunded = tx.status === 'REFUNDED';

              return (
                <tr key={tx.id} className="hover:bg-[#1B1E23]/60 transition-colors">
                  <td className="p-[14px_16px] font-mono font-bold text-[#F8FAFC]">
                    #{tx.id.slice(-8).toUpperCase()}
                  </td>
                  <td className="p-[14px_16px]">
                    <div className="font-semibold text-[#F8FAFC]">
                      Order #{tx.order?.orderNumber || tx.orderId?.slice(-6)}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA]">
                      {tx.order?.table?.tableNumber ? `Table ${tx.order.table.tableNumber}` : 'Walk-in'}
                    </div>
                  </td>
                  <td className="p-[14px_16px] text-[#A1A1AA]">
                    <div>{new Date(tx.createdAt).toLocaleDateString()}</div>
                    <div className="text-[11px] text-[#A1A1AA]/80 font-mono">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="p-[14px_16px]">{renderMethodBadge(tx.method)}</td>
                  <td className="p-[14px_16px] text-right font-mono font-bold text-[#F8FAFC]">
                    PKR {Number(tx.amount || 0).toFixed(2)}
                  </td>
                  <td className="p-[14px_16px]">
                    <StatusBadge
                      status={tx.status}
                      variant={isCompleted ? 'green' : isRefunded ? 'red' : 'amber'}
                    />
                  </td>
                  <td className="p-[14px_16px] text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReprintReceipt(tx)}
                        className="px-2.5 py-1.5 rounded-[8px] bg-[#1B1E23] hover:bg-[#25282D] border border-[#25282D] text-[11px] font-semibold text-[#F8FAFC] flex items-center gap-1 transition-all"
                        title="Reprint Thermal Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#F5B342]" />
                        <span>Receipt</span>
                      </button>

                      {isCompleted && (
                        <button
                          type="button"
                          onClick={() => openRefund(tx)}
                          className="px-2.5 py-1.5 rounded-[8px] bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-semibold text-rose-400 flex items-center gap-1 transition-all"
                          title="Process Refund"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Refund</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>

      {/* Refund Modal */}
      {refundModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in-50">
          <div className="w-full max-w-md bg-[#15171A] border border-[#25282D] rounded-[16px] p-5 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#25282D] mb-4">
              <h3 className="text-base font-bold text-[#F8FAFC] flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-[#F97316]" />
                <span>Issue Refund &middot; #{selectedTx.id.slice(-6).toUpperCase()}</span>
              </h3>
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="text-[#A1A1AA] hover:text-[#F8FAFC] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="space-y-4">
              <div>
                <label className="block text-[11px] uppercase font-bold text-[#A1A1AA] mb-1">
                  Refund Amount (PKR)
                </label>
                <input
                  type="number"
                  step="any"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  max={selectedTx.amount}
                  className="w-full min-h-[44px] px-3.5 rounded-[10px] border border-[#25282D] bg-[#0F1114] text-[#F8FAFC] font-mono font-bold text-sm outline-none focus:border-[#F5B342]"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-[#A1A1AA] mb-1">
                  Reason for Refund
                </label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-[10px] border border-[#25282D] bg-[#0F1114] text-[#F8FAFC] text-xs outline-none focus:border-[#F5B342]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-4 py-2 rounded-[10px] bg-[#1B1E23] text-xs font-semibold text-[#A1A1AA] hover:text-[#F8FAFC]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="px-4 py-2 rounded-[10px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {processingRefund ? 'Processing...' : 'Confirm Refund'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Thermal Receipt Modal */}
      {receiptModalOpen && activeReceipt && (
        <ThermalReceiptModal
          isOpen={receiptModalOpen}
          receipt={activeReceipt}
          onClose={() => setReceiptModalOpen(false)}
        />
      )}
    </CashierShell>
  );
}
