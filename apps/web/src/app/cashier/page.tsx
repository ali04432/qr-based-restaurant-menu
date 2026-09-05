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
  DollarSign,
  TrendingUp,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Percent,
} from 'lucide-react';
import { Phase5Layout } from '../../components/phase5/Phase5Layout';
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

  // Filter tabs
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'PAID'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');

  // Payment form state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodOption>('CASH');
  const [receivedAmount, setReceivedAmount] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [customerNotes, setCustomerNotes] = useState('');

  // Thermal Receipt Modal
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ThermalReceiptPayload | null>(null);

  // Success Confirmation Notification
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

      // Auto-select first order if none selected
      if (ordersData && ordersData.length > 0 && !selectedOrderId) {
        setSelectedOrderId(ordersData[0].id);
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
    if (!selectedOrderId || !token) return;
    let isCancelled = false;

    const fetchBill = async () => {
      try {
        setLoadingBill(true);
        const bill = await cashierService.getBillDetails(selectedOrderId, token);
        if (!isCancelled) {
          setSelectedBill(bill);
          setReceivedAmount(bill.total.toString());
          setDiscountPercent(0);
          setDiscountAmount(0);
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

  // Socket.IO events for live cashier updates
  const { isConnected, on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  useEffect(() => {
    const unsub1 = on('ORDER_CREATED', () => loadData());
    const unsub2 = on('ORDER_STATUS_UPDATED', () => loadData());
    const unsub3 = on('PAYMENT_COMPLETED', () => loadData());
    return () => {
      unsub1?.();
      unsub2?.();
      unsub3?.();
    };
  }, [on, loadData]);

  // Calculate bill adjustments
  const baseSubtotal = selectedBill?.subtotal || 0;
  const taxAmount = selectedBill?.tax || 0;
  const serviceCharge = selectedBill?.serviceCharge || 0;
  const discountVal =
    discountPercent > 0
      ? (baseSubtotal * discountPercent) / 100
      : discountAmount > 0
      ? discountAmount
      : 0;
  const payableTotal = Math.max(0, baseSubtotal + taxAmount + serviceCharge - discountVal);

  const parsedReceived = parseFloat(receivedAmount) || 0;
  const changeDue = Math.max(0, parsedReceived - payableTotal);
  const isCash = paymentMethod === 'CASH';
  const isInsufficientCash = isCash && parsedReceived < payableTotal;

  // Preset cash quick buttons
  const cashPresets = [
    payableTotal,
    Math.ceil(payableTotal / 500) * 500,
    Math.ceil(payableTotal / 1000) * 1000,
    Math.ceil(payableTotal / 5000) * 5000,
  ].filter((v, idx, arr) => arr.indexOf(v) === idx && v >= payableTotal);

  // Settle Payment Handler
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

      // Trigger Thermal Receipt Modal preview
      if (res.receipt) {
        setActiveReceipt(res.receipt);
        setReceiptModalOpen(true);
      }

      // Refresh list
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
    <Phase5Layout
      role="CASHIER"
      title="Point of Sale Register"
      subtitle="Rapid order billing, payment settlement, and thermal receipt printing"
      headerAction={
        <div className="flex items-center space-x-2">
          {paymentSuccessMsg && (
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold animate-pulse">
              <CheckCircle2 className="w-4 h-4" />
              <span>{paymentSuccessMsg}</span>
            </div>
          )}

          <button
            onClick={loadData}
            disabled={loadingOrders}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
            title="Refresh register orders"
          >
            <RefreshCw className={`w-4 h-4 ${loadingOrders ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      }
    >
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Today's Revenue
            </p>
            <h3 className="text-2xl font-black text-emerald-400 mt-1">
              PKR {(summary?.todaySales || 0).toLocaleString()}
            </h3>
            <p className="text-[10px] text-emerald-500/80 font-medium mt-0.5">
              Settled in register
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Pending Bills
            </p>
            <h3 className="text-2xl font-black text-amber-400 mt-1">
              {summary?.pendingPayments || 0}
            </h3>
            <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">Awaiting checkout</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Settled Orders
            </p>
            <h3 className="text-2xl font-black text-white mt-1">
              {summary?.paidOrders || 0}
            </h3>
            <p className="text-[10px] text-purple-400/80 font-medium mt-0.5">
              Completed transactions
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
              Avg Order Value
            </p>
            <h3 className="text-2xl font-black text-sky-400 mt-1">
              PKR {avgOrderValue.toFixed(0)}
            </h3>
            <p className="text-[10px] text-sky-500/80 font-medium mt-0.5">Per settled table</p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Split POS Layout: Left Orders Queue (40%) | Right Billing Register (60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Orders Queue */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-3 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs font-semibold">
              <button
                onClick={() => setStatusTab('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusTab === 'PENDING'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Unpaid
              </button>
              <button
                onClick={() => setStatusTab('PAID')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusTab === 'PAID'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Settled
              </button>
              <button
                onClick={() => setStatusTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusTab === 'ALL'
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>

            <div className="relative flex-1 ml-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search order / table..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
              />
            </div>
          </div>

          {/* Orders List Container */}
          <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
            {loadingOrders && orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">Loading order queue...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-white">No Orders Found</p>
                <p className="text-xs text-slate-500 mt-1">No orders match current filter.</p>
              </div>
            ) : (
              orders.map((o) => {
                const isSelected = selectedOrderId === o.id;
                const isPaid = o.paymentStatus === 'COMPLETED';

                return (
                  <div
                    key={o.id}
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-500/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
                        : 'bg-slate-900/70 border-slate-800/80 hover:bg-slate-900 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                          isPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {o.tableNumber ? `T${o.tableNumber}` : 'W/I'}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">#{o.orderNumber}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              isPaid
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            }`}
                          >
                            {isPaid ? 'PAID' : 'UNPAID'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {o.itemsCount} items • {o.tableNumber ? `Table ${o.tableNumber}` : 'Walk-in'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-white">
                        PKR {o.total.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {new Date(o.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: POS Billing Register */}
        <div className="lg:col-span-7">
          {loadingBill ? (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-12 text-center shadow-xl">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading itemized invoice details...</p>
            </div>
          ) : !selectedBill ? (
            <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-16 text-center shadow-xl flex flex-col items-center justify-center">
              <Receipt className="w-12 h-12 text-slate-600 mb-3" />
              <h4 className="text-base font-bold text-white mb-1">Select an Order</h4>
              <p className="text-xs text-slate-500 max-w-sm">
                Choose an order from the queue on the left to calculate bill, choose payment method, and issue a thermal receipt.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/95 border border-slate-800/80 rounded-2xl p-5 shadow-2xl space-y-5 relative">
              {/* Order Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-black text-lg">
                    {selectedBill.tableNumber ? `T${selectedBill.tableNumber}` : 'POS'}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-base font-bold text-white">
                        Order #{selectedBill.orderNumber}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isBillPaid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {isBillPaid ? 'PAID / SETTLED' : 'AWAITING PAYMENT'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Table {selectedBill.tableNumber || 'Walk-in'} •{' '}
                      {new Date(selectedBill.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                {isBillPaid && selectedBill.existingPaymentId && (
                  <button
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
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-all"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reprint Receipt</span>
                  </button>
                )}
              </div>

              {/* Itemized Breakdown Table */}
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                  Itemized Order Summary
                </p>
                <div className="max-h-52 overflow-y-auto pr-1 space-y-1.5">
                  {selectedBill.items.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center text-[10px]">
                          {item.quantity}x
                        </span>
                        <div>
                          <p className="font-semibold text-white">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-white font-mono">
                          PKR {item.subtotal.toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-500 font-mono">
                          @ PKR {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Subtotal, Tax, Service Charge Breakdown */}
              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">
                    PKR {baseSubtotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Sales Tax ({selectedBill.taxRate || 8}%)</span>
                  <span className="font-mono text-slate-200">
                    PKR {taxAmount.toLocaleString()}
                  </span>
                </div>
                {serviceCharge > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Service Charge</span>
                    <span className="font-mono text-slate-200">
                      PKR {serviceCharge.toLocaleString()}
                    </span>
                  </div>
                )}
                {discountVal > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Discount Applied</span>
                    <span className="font-mono font-bold">- PKR {discountVal.toFixed(2)}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-sm font-black">
                  <span className="text-amber-400 uppercase tracking-wider text-xs">
                    Payable Total
                  </span>
                  <span className="text-xl text-white font-mono">
                    PKR {payableTotal.toLocaleString()}
                  </span>
                </div>
              </div>

              {!isBillPaid ? (
                /* Payment Settlement Controls */
                <div className="space-y-4 pt-2">
                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Select Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'CASH' as const, label: 'Cash', icon: Banknote },
                        { id: 'CARD' as const, label: 'Card / POS', icon: CreditCard },
                        { id: 'JAZZCASH' as const, label: 'JazzCash', icon: Smartphone },
                        { id: 'EASYPAISA' as const, label: 'Easypaisa', icon: Smartphone },
                        { id: 'BANK_TRANSFER' as const, label: 'Bank', icon: Landmark },
                        { id: 'OTHER' as const, label: 'Other', icon: Layers },
                      ].map((m) => {
                        const Icon = m.icon;
                        const active = paymentMethod === m.id;
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setPaymentMethod(m.id)}
                            className={`p-2.5 rounded-xl border text-xs font-bold flex items-center space-x-2 transition-all ${
                              active
                                ? 'bg-amber-500/10 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-amber-400" />
                            <span>{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cash Calculator (Shown when Cash is selected) */}
                  {isCash && (
                    <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                          <Banknote className="w-4 h-4" />
                          <span>Cash Calculator</span>
                        </span>
                        {isInsufficientCash && (
                          <span className="text-[10px] text-rose-400 font-semibold flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Insufficient Cash</span>
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Amount Received (PKR)
                          </label>
                          <input
                            type="number"
                            value={receivedAmount}
                            onChange={(e) => setReceivedAmount(e.target.value)}
                            min={payableTotal}
                            step="any"
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-base font-bold text-white font-mono focus:outline-none focus:border-amber-500/60"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Change Due (PKR)
                          </label>
                          <div className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-base font-black text-emerald-400 font-mono">
                            PKR {changeDue.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      {/* Cash Presets */}
                      <div className="flex items-center space-x-1.5 pt-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">
                          Quick Presets:
                        </span>
                        {cashPresets.map((preset, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setReceivedAmount(preset.toString())}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-mono font-bold text-slate-200 border border-slate-700 transition-all"
                          >
                            PKR {preset.toLocaleString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Optional Discount & Notes Controls */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Manager Discount (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          value={discountPercent || ''}
                          onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                          placeholder="0%"
                          min="0"
                          max="100"
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3 pr-7 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                        />
                        <Percent className="w-3 h-3 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Cashier Memo
                      </label>
                      <input
                        type="text"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="e.g. VIP guest, split bill..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                      />
                    </div>
                  </div>

                  {/* Settle Payment Action */}
                  <button
                    type="button"
                    onClick={handleSettlePayment}
                    disabled={processingPayment || isInsufficientCash}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-400 hover:from-emerald-500 hover:to-emerald-300 text-slate-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
                    <span>
                      {processingPayment
                        ? 'Processing Atomic Settlement...'
                        : `Settle & Print Thermal Bill • PKR ${payableTotal.toLocaleString()}`}
                    </span>
                  </button>
                </div>
              ) : (
                /* Already Paid Status Display */
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400 stroke-[2.5]" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-300">
                        Payment Fully Settled
                      </h4>
                      <p className="text-xs text-emerald-400/80">
                        Status: COMPLETED • Processed by register
                      </p>
                    </div>
                  </div>

                  {selectedBill.existingPaymentId && (
                    <button
                      onClick={async () => {
                        if (!token || !selectedBill.existingPaymentId) return;
                        const receiptData = await cashierService.getReceipt(
                          selectedBill.existingPaymentId,
                          token
                        );
                        setActiveReceipt(receiptData);
                        setReceiptModalOpen(true);
                      }}
                      className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 hover:bg-emerald-400 transition-all"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print 80mm Receipt</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
