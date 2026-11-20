'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign,
  Clock,
  Receipt,
  TrendingUp,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
  Layers,
  Calculator,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Percent,
} from 'lucide-react';
import { CashierShell } from '../../components/cashier/CashierShell';
import { StatCard } from '../../components/cashier/StatCard';
import { TableBadge, StatusBadge } from '../../components/cashier/Badge';
import { PillTabs } from '../../components/cashier/PillTabs';
import { SearchInput } from '../../components/cashier/SearchInput';
import { EmptyState } from '../../components/cashier/EmptyState';
import { ThermalReceiptModal } from '../../components/phase5/ThermalReceiptModal';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { cashierService } from '../../services/cashier.service';
import {
  CashierSummary,
  CashierOrderListItem,
  BillingDetail,
  ThermalReceiptPayload,
} from '@qr-menu/shared';

type PaymentMethodOption = 'CASH' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'BANK_TRANSFER' | 'OTHER';

const PAYMENT_METHODS = [
  { id: 'CASH' as const, label: 'Cash', icon: Banknote },
  { id: 'CARD' as const, label: 'Card / POS', icon: CreditCard },
  { id: 'JAZZCASH' as const, label: 'JazzCash', icon: Smartphone },
  { id: 'EASYPAISA' as const, label: 'Easypaisa', icon: Smartphone },
  { id: 'BANK_TRANSFER' as const, label: 'Bank', icon: Landmark },
  { id: 'OTHER' as const, label: 'Other', icon: Layers },
];

export default function CashierDashboardPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  // State
  const [summary, setSummary] = useState<CashierSummary | null>(null);
  const [orders, setOrders] = useState<CashierOrderListItem[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedBill, setSelectedBill] = useState<BillingDetail | null>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingBill, setLoadingBill] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Filter tabs: Unpaid | Settled | All
  const [statusTab, setStatusTab] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('CASH');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState('');

  // Thermal Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ThermalReceiptPayload | null>(null);

  // Success Notification
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Fetch summary and orders
  const loadData = useCallback(async () => {
    if (!token) return;
    try {
      setLoadingOrders(true);
      const [sumData, ordersData] = await Promise.all([
        cashierService.getSummary(restaurantId, token),
        cashierService.getOrders(
          {
            paymentStatus: statusTab === 'ALL' ? undefined : statusTab === 'PENDING' ? 'PENDING' : 'COMPLETED',
            search: searchQuery || undefined,
          },
          token
        ),
      ]);
      setSummary(sumData);
      setOrders(ordersData || []);

      // Auto-select first order if none selected or current selection is not in list
      if (ordersData && ordersData.length > 0) {
        if (!selectedOrderId || !ordersData.some((o) => o.id === selectedOrderId)) {
          setSelectedOrderId(ordersData[0].id);
        }
      } else {
        setSelectedOrderId(null);
        setSelectedBill(null);
      }
    } catch (err) {
      console.error('Failed to load cashier data:', err);
    } finally {
      setLoadingOrders(false);
    }
  }, [restaurantId, token, statusTab, searchQuery, selectedOrderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load bill details when selectedOrderId changes
  useEffect(() => {
    if (!selectedOrderId || !token) {
      setSelectedBill(null);
      return;
    }
    let isCancelled = false;

    const fetchBill = async () => {
      try {
        setLoadingBill(true);
        const bill = await cashierService.getBillDetails(selectedOrderId, token);
        if (!isCancelled) {
          setSelectedBill(bill);
          setReceivedAmount(bill.total.toString());
          setDiscountPercent(0);
          setCustomerNotes('');
        }
      } catch (err) {
        console.error('Failed to load bill details:', err);
      } finally {
        if (!isCancelled) setLoadingBill(false);
      }
    };

    fetchBill();
    return () => {
      isCancelled = true;
    };
  }, [selectedOrderId, token]);

  // Real-time socket updates
  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  useEffect(() => {
    const unsub1 = on('order.created', () => loadData());
    const unsub2 = on('order.statusChanged', () => loadData());
    const unsub3 = on('payment.completed', () => loadData());
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [on, loadData]);

  // Calculations
  const baseSubtotal = selectedBill?.subtotal || 0;
  const taxAmount = selectedBill?.tax || 0;
  const serviceCharge = selectedBill?.serviceCharge || 0;
  const discountVal = discountPercent > 0 ? (baseSubtotal * discountPercent) / 100 : 0;
  const payableTotal = Math.max(0, baseSubtotal + taxAmount + serviceCharge - discountVal);

  const parsedReceived = parseFloat(receivedAmount) || 0;
  const changeDue = Math.max(0, parsedReceived - payableTotal);
  const isCash = paymentMethod === 'CASH';
  const isInsufficientCash = isCash && parsedReceived < payableTotal;
  const shortAmount = Math.max(0, payableTotal - parsedReceived);

  // Preset cash quick buttons
  const cashPresets = [
    payableTotal,
    500,
    1000,
    5000,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && (v >= payableTotal || v === payableTotal));

  // Settlement Handler
  const handleSettlePayment = async () => {
    if (!token || !selectedBill || !selectedOrderId) return;
    if (isInsufficientCash) return;

    try {
      setProcessingPayment(true);
      const res = await cashierService.confirmPayment(
        {
          orderId: selectedOrderId,
          method: paymentMethod,
          amount: payableTotal,
          receivedAmount: isCash ? parsedReceived : payableTotal,
          changeAmount: isCash ? changeDue : 0,
          notes: customerNotes ? customerNotes : undefined,
        },
        token
      );

      setPaymentSuccessMsg(`Payment settled successfully for Order #${selectedBill.orderNumber}!`);
      setTimeout(() => setPaymentSuccessMsg(null), 4000);

      if (res.receipt) {
        setActiveReceipt(res.receipt);
        setReceiptModalOpen(true);
      }

      loadData();
    } catch (err: any) {
      console.error('Settlement error:', err);
      alert(err.message || 'Payment processing failed');
    } finally {
      setProcessingPayment(false);
    }
  };

  const isBillPaid = selectedBill?.paymentStatus === 'COMPLETED';
  const avgOrderValue = (summary?.todaySales || 0) / Math.max(1, summary?.paidOrders || 1);

  return (
    <CashierShell
      title="Point of Sale Register"
      subtitle="Rapid order billing, payment settlement, and thermal receipt printing"
      onRefresh={loadData}
      isRefreshing={loadingOrders}
      headerAction={
        paymentSuccessMsg ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 text-[#22C55E] text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4" />
            <span>{paymentSuccessMsg}</span>
          </div>
        ) : null
      }
    >
      {/* 4 Stat Cards */}
      <section aria-label="Today at a glance" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="TODAY'S REVENUE"
          value={`PKR ${(summary?.todaySales || 0).toFixed(2)}`}
          sub="Settled in register"
          color="#22C55E"
          tint="rgba(34,197,94,0.14)"
          icon={<DollarSign className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="PENDING BILLS"
          value={summary?.pendingPayments || 0}
          sub="Awaiting checkout"
          color="#F5B342"
          tint="rgba(245,179,66,0.14)"
          icon={<Clock className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="SETTLED ORDERS"
          value={summary?.paidOrders || 0}
          sub="Completed transactions"
          color="#8B5CF6"
          tint="rgba(139,92,246,0.16)"
          icon={<Receipt className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="AVG ORDER VALUE"
          value={`PKR ${avgOrderValue.toFixed(0)}`}
          sub="Per settled table"
          color="#22D3EE"
          tint="rgba(34,211,238,0.14)"
          icon={<TrendingUp className="w-5 h-5" strokeWidth={1.8} />}
        />
      </section>

      {/* Main Two-Column Layout */}
      <section className="flex flex-col lg:flex-row gap-5 items-start">
        {/* LEFT COLUMN: Orders Card (flex: 1 1 360px) */}
        <div className="w-full lg:w-[42%] shrink-0 bg-[#15171A] border border-[#25282D] rounded-[16px] p-4 flex flex-col gap-3.5 shadow-xl">
          {/* Tabs + Search */}
          <div className="flex flex-wrap items-center gap-2.5">
            <PillTabs
              tabs={[
                { id: 'PENDING', label: 'Unpaid' },
                { id: 'PAID', label: 'Settled' },
                { id: 'ALL', label: 'All' },
              ]}
              activeTab={statusTab}
              onChange={(tab) => setStatusTab(tab as any)}
              ariaLabel="Order status filter"
            />
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search order / table..."
            />
          </div>

          {/* Orders List */}
          <div className="flex flex-col gap-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
            {loadingOrders && orders.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#A1A1AA]">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                message={
                  statusTab === 'PENDING'
                    ? 'No unpaid bills match your search.'
                    : statusTab === 'PAID'
                    ? 'Settled bills for today are listed in the Ledger.'
                    : 'No orders found matching criteria.'
                }
              />
            ) : (
              orders.map((o) => {
                const isSelected = selectedOrderId === o.id;
                const isPaid = o.paymentStatus === 'COMPLETED';

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`flex items-center gap-3 p-[12px_14px] rounded-[12px] box-border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-[rgba(245,179,66,0.08)] border border-[#F5B342] shadow-sm'
                        : 'bg-[#1B1E23] border border-[#25282D] hover:border-[#F5B342]/40'
                    }`}
                  >
                    {/* Table Badge */}
                    <TableBadge tableNumber={o.tableNumber || '01'} />

                    {/* Order Details */}
                    <div className="min-w-0 flex-1 flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-[14px] text-[#F8FAFC]">
                          #{o.orderNumber}
                        </span>
                        <StatusBadge
                          status={isPaid ? 'PAID' : 'UNPAID'}
                          variant={isPaid ? 'green' : 'amber'}
                        />
                      </div>
                      <div className="text-[12px] text-[#A1A1AA]">
                        {o.itemsCount} items &middot; Table {o.tableNumber || 'Walk-in'}
                      </div>
                    </div>

                    {/* Total & Time */}
                    <div className="shrink-0 text-right flex flex-col gap-1">
                      <span className="font-bold text-[14px] text-[#F8FAFC] font-mono">
                        PKR {o.total.toFixed(2)}
                      </span>
                      <span className="text-[11px] text-[#A1A1AA]">
                        {new Date(o.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Checkout & Bill Detail Card (flex: 1.45 1 480px) */}
        <div className="w-full lg:flex-1 bg-[#15171A] border border-[#25282D] rounded-[16px] p-5 flex flex-col gap-[18px] shadow-xl">
          {loadingBill ? (
            <div className="py-24 text-center text-xs text-[#A1A1AA]">
              Loading bill details...
            </div>
          ) : !selectedBill ? (
            <div className="py-24 text-center flex flex-col items-center justify-center gap-2">
              <Receipt className="w-12 h-12 text-[#A1A1AA]/50 mb-2" strokeWidth={1.5} />
              <h3 className="text-base font-bold text-[#F8FAFC]">No Order Selected</h3>
              <p className="text-xs text-[#A1A1AA] max-w-xs">
                Select an order from the list on the left to calculate bill, process settlement, and print thermal receipt.
              </p>
            </div>
          ) : (
            <>
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#25282D]">
                <div className="flex items-center gap-3.5">
                  <TableBadge tableNumber={selectedBill.tableNumber || '01'} size="lg" />
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="m-0 text-[18px] font-bold text-[#F8FAFC]">
                        Order #{selectedBill.orderNumber}
                      </h2>
                      <StatusBadge
                        status={isBillPaid ? 'PAID / SETTLED' : 'AWAITING PAYMENT'}
                        variant={isBillPaid ? 'green' : 'amber'}
                      />
                    </div>
                    <div className="text-[12px] text-[#A1A1AA]">
                      Table {selectedBill.tableNumber || 'Walk-in'} &middot;{' '}
                      {new Date(selectedBill.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {isBillPaid && selectedBill.existingPaymentId && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (!token || !selectedBill.existingPaymentId) return;
                      try {
                        const receiptData = await cashierService.getReceipt(
                          selectedBill.existingPaymentId,
                          token
                        );
                        setActiveReceipt(receiptData);
                        setReceiptModalOpen(true);
                      } catch (err) {
                        console.error('Failed to get receipt:', err);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] bg-[#1B1E23] hover:bg-[#25282D] border border-[#25282D] text-xs font-semibold text-[#F8FAFC] transition-all cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#F5B342]" />
                    <span>Reprint Receipt</span>
                  </button>
                )}
              </div>

              {/* ITEMIZED ORDER SUMMARY */}
              <div className="flex flex-col gap-2.5">
                <div className="text-[11px] font-semibold tracking-[0.1em] text-[#A1A1AA] uppercase">
                  ITEMIZED ORDER SUMMARY
                </div>
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {selectedBill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-[#1B1E23] border border-[#25282D] rounded-[12px] p-[12px_14px]"
                    >
                      <span className="text-[12px] font-bold text-[#F5B342] bg-[rgba(245,179,66,0.12)] rounded-[6px] px-[8px] py-[4px]">
                        {item.quantity}x
                      </span>
                      <span className="flex-1 min-w-0 text-[14px] font-semibold text-[#F8FAFC] truncate">
                        {item.name}
                      </span>
                      <div className="text-right shrink-0 flex flex-col gap-0.5">
                        <span className="text-[14px] font-bold text-[#F8FAFC] font-mono">
                          PKR {item.subtotal.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-[#A1A1AA] font-mono">
                          PKR {item.unitPrice.toFixed(2)} each
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-[#1B1E23] border border-[#25282D] rounded-[12px] p-[14px_16px] flex flex-col gap-2.5 text-[13px]">
                <div className="flex justify-between gap-3">
                  <span className="text-[#A1A1AA]">Subtotal</span>
                  <span className="font-mono text-[#F8FAFC]">PKR {baseSubtotal.toFixed(2)}</span>
                </div>
                {discountVal > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[#A1A1AA]">Manager Discount ({discountPercent}%)</span>
                    <span className="text-[#22C55E] font-mono font-bold">- PKR {discountVal.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-[#A1A1AA]">Sales Tax ({selectedBill.taxRate || 8}%)</span>
                  <span className="font-mono text-[#F8FAFC]">PKR {taxAmount.toFixed(2)}</span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between gap-3">
                    <span className="text-[#A1A1AA]">Service Charge</span>
                    <span className="font-mono text-[#F8FAFC]">PKR {serviceCharge.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-3 pt-3 border-t border-[#25282D]">
                  <span className="text-[12px] font-bold tracking-[0.08em] text-[#F5B342] uppercase">
                    PAYABLE TOTAL
                  </span>
                  <span className="text-[22px] font-bold text-[#F8FAFC] font-mono">
                    PKR {payableTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {!isBillPaid ? (
                <>
                  {/* SELECT PAYMENT METHOD */}
                  <div className="flex flex-col gap-2.5">
                    <div className="text-[11px] font-semibold tracking-[0.1em] text-[#A1A1AA] uppercase">
                      SELECT PAYMENT METHOD
                    </div>
                    <div role="group" aria-label="Payment method" className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {PAYMENT_METHODS.map((m) => {
                        const Icon = m.icon;
                        const isSelected = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id)}
                            className={`min-h-[44px] px-3 rounded-[10px] text-[13px] transition-all flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#F5B342] ${
                              isSelected
                                ? 'bg-[rgba(245,179,66,0.14)] border border-[#F5B342] text-[#F5B342] font-semibold shadow-sm'
                                : 'bg-[#1B1E23] border border-[#25282D] text-[#F8FAFC] font-medium hover:border-[#F5B342]/40'
                            }`}
                          >
                            <Icon className="w-[18px] h-[18px]" strokeWidth={1.8} aria-hidden="true" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CASH CALCULATOR (When Cash is selected) */}
                  {isCash ? (
                    <div className="bg-[#1B1E23] border border-[rgba(245,179,66,0.35)] rounded-[12px] p-4 flex flex-col gap-3.5">
                      <div className="flex items-center gap-2 text-[12px] font-bold tracking-[0.08em] text-[#F5B342] uppercase">
                        <Calculator className="w-4 h-4" strokeWidth={1.8} />
                        <span>CASH CALCULATOR</span>
                      </div>

                      <div className="flex flex-wrap gap-3.5">
                        <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold tracking-[0.08em] text-[#A1A1AA] uppercase">
                            AMOUNT RECEIVED (PKR)
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            className="w-full box-border min-h-[48px] px-3.5 rounded-[10px] border border-[#25282D] bg-[#0F1114] text-[#F8FAFC] text-[18px] font-bold font-mono outline-none focus:border-[#F5B342]"
                          />
                        </label>

                        <div className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                          <span className="text-[11px] font-semibold tracking-[0.08em] text-[#A1A1AA] uppercase">
                            CHANGE DUE (PKR)
                          </span>
                          <div className="box-border min-h-[48px] px-3.5 rounded-[10px] border border-[#25282D] bg-[#0F1114] text-[#22C55E] text-[18px] font-bold font-mono flex items-center">
                            PKR {changeDue.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {isInsufficientCash && (
                        <div className="text-[12px] font-semibold text-[#F97316] flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>Amount received is PKR {shortAmount.toFixed(2)} below the payable total.</span>
                        </div>
                      )}

                      {/* Quick Presets */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-semibold tracking-[0.08em] text-[#A1A1AA] uppercase pr-1">
                          QUICK PRESETS
                        </span>
                        {cashPresets.map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReceivedAmount(preset.toFixed(2))}
                            className="min-h-[36px] px-3 rounded-[8px] border border-[#25282D] bg-[#0F1114] text-[12px] font-bold font-mono text-[#F8FAFC] hover:border-[#F5B342] hover:text-[#F5B342] transition-colors cursor-pointer"
                          >
                            PKR {preset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#1B1E23] border border-[#25282D] rounded-[12px] p-4 text-[13px] text-[#A1A1AA]">
                      No change calculation needed. Confirm the payment on{' '}
                      <strong className="text-[#F5B342]">
                        {PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label}
                      </strong>{' '}
                      before settling this bill.
                    </div>
                  )}

                  {/* Manager Discount & Cashier Memo */}
                  <div className="flex flex-wrap gap-3.5">
                    <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold tracking-[0.08em] text-[#A1A1AA] uppercase">
                        MANAGER DISCOUNT (%)
                      </span>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent || ''}
                          onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                          placeholder="0%"
                          className="w-full box-border min-h-[44px] pl-3.5 pr-8 rounded-[10px] border border-[#25282D] bg-[#1B1E23] text-[#F8FAFC] text-[13px] outline-none focus:border-[#F5B342]"
                        />
                        <Percent className="w-3.5 h-3.5 text-[#A1A1AA] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </label>

                    <label className="flex-1 min-w-[180px] flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold tracking-[0.08em] text-[#A1A1AA] uppercase">
                        CASHIER MEMO
                      </span>
                      <input
                        type="text"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="e.g. VIP guest, split bill..."
                        className="w-full box-border min-h-[44px] px-3.5 rounded-[10px] border border-[#25282D] bg-[#1B1E23] text-[#F8FAFC] text-[13px] placeholder-[#9A9AA3] outline-none focus:border-[#F5B342]"
                      />
                    </label>
                  </div>

                  {/* Settle & Print Thermal Bill Button */}
                  <button
                    type="button"
                    onClick={handleSettlePayment}
                    disabled={processingPayment || isInsufficientCash}
                    className="w-full box-border min-h-[52px] px-5 rounded-[12px] border-none bg-[#22C55E] hover:bg-[#1ea34d] text-[#08090B] text-[14px] font-bold tracking-[0.02em] flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_8px_24px_rgba(34,197,94,0.25)] transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-[18px] h-[18px]" strokeWidth={2} />
                    <span>
                      {processingPayment
                        ? 'Settling & Printing...'
                        : `Settle & Print Thermal Bill · PKR ${payableTotal.toFixed(2)}`}
                    </span>
                  </button>
                </>
              ) : (
                <div className="p-4 rounded-[12px] bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-[#22C55E]" strokeWidth={2} />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">
                        Payment Fully Settled
                      </h4>
                      <p className="text-xs text-emerald-400/80">
                        Status: COMPLETED &middot; Processed by register
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Thermal Receipt Preview Modal */}
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
