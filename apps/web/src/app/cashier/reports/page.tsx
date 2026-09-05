'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  Landmark,
  Layers,
  RefreshCw,
  Printer,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Phase5Layout } from '../../../components/phase5/Phase5Layout';
import { useAuthContext } from '../../../context/AuthContext';
import { cashierService } from '../../../services/cashier.service';
import { PaymentMethodDistribution, CashierSummary } from '@qr-menu/shared';

export default function CashierReportsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CashierSummary | null>(null);
  const [distribution, setDistribution] = useState<PaymentMethodDistribution[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);

  // Cash Drawer Balancing (Shift Float)
  const [openingFloat, setOpeningFloat] = useState<number>(10000);
  const [countedCash, setCountedCash] = useState<string>('');

  const fetchReportData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [sumData, analyticsData] = await Promise.all([
        cashierService.getSummary(restaurantId, token),
        cashierService.getPaymentMethodAnalytics({}, token),
      ]);

      setSummary(sumData);
      setDistribution(analyticsData.breakdown || []);
      setTotalRevenue(analyticsData.totalRevenue || 0);
      setTotalTransactions(analyticsData.totalTransactions || 0);
    } catch (err) {
      console.error('Failed to load cashier reports:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Drawer calculations
  const cashSales = distribution.find((d) => d.method === 'CASH')?.amount || 0;
  const expectedClosingCash = openingFloat + cashSales;
  const parsedCountedCash = parseFloat(countedCash) || 0;
  const hasCounted = countedCash.trim() !== '';
  const cashVariance = hasCounted ? parsedCountedCash - expectedClosingCash : 0;

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-5 h-5 text-emerald-400" />;
      case 'CARD':
        return <CreditCard className="w-5 h-5 text-sky-400" />;
      case 'JAZZCASH':
        return <Smartphone className="w-5 h-5 text-rose-400" />;
      case 'EASYPAISA':
        return <Smartphone className="w-5 h-5 text-emerald-400" />;
      case 'BANK_TRANSFER':
        return <Landmark className="w-5 h-5 text-purple-400" />;
      default:
        return <Layers className="w-5 h-5 text-slate-400" />;
    }
  };

  const printShiftSummary = () => {
    window.print();
  };

  return (
    <Phase5Layout
      role="CASHIER"
      title="Register Reports & Shift Balancing"
      subtitle="Comprehensive revenue breakdown, payment channel distributions, and cash-in-drawer reconciliation"
      headerAction={
        <div className="flex items-center space-x-2">
          <button
            onClick={printShiftSummary}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-200 transition-all"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Shift Audit</span>
          </button>

          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
            title="Refresh analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden flex flex-wrap items-center justify-between gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div>
            <span className="text-[11px] uppercase tracking-widest font-black text-amber-400 px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">
              Shift Closing Audit
            </span>
            <h2 className="text-3xl font-black text-white mt-3 font-serif">
              PKR {totalRevenue.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Total register collections across {totalTransactions} settled transactions
            </p>
          </div>

          <div className="flex items-center space-x-4">
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center min-w-[130px]">
              <p className="text-[10px] uppercase font-bold text-slate-400">Paid Invoices</p>
              <h4 className="text-xl font-black text-emerald-400 mt-0.5">
                {summary?.paidOrders || 0}
              </h4>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center min-w-[130px]">
              <p className="text-[10px] uppercase font-bold text-slate-400">Pending Bills</p>
              <h4 className="text-xl font-black text-amber-400 mt-0.5">
                {summary?.pendingPayments || 0}
              </h4>
            </div>

            <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-center min-w-[130px]">
              <p className="text-[10px] uppercase font-bold text-slate-400">Avg Ticket</p>
              <h4 className="text-xl font-black text-sky-400 mt-0.5">
                PKR {((summary?.todaySales || 0) / Math.max(1, summary?.paidOrders || 1)).toFixed(0)}
              </h4>
            </div>
          </div>
        </div>

        {/* 2-Column Grid: Payment Method Distribution & Cash Float Reconciliation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Payment Methods Distribution (7 cols) */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <PieChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Payment Method Distribution</h3>
                  <p className="text-xs text-slate-400">
                    Breakdown of revenue captured by payment gateway
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-slate-400">
                {distribution.length} Channels Active
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">
                <RefreshCw className="w-6 h-6 text-amber-500 animate-spin mx-auto mb-2" />
                <span>Computing payment shares...</span>
              </div>
            ) : distribution.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Receipt className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-400">No Transactions Settled Today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {distribution.map((item) => {
                  const percentage =
                    totalRevenue > 0
                      ? Math.round((item.amount / totalRevenue) * 100)
                      : 0;

                  return (
                    <div
                      key={item.method}
                      className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2 hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                            {getMethodIcon(item.method)}
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                              {item.method.replace('_', ' ')}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              {item.count} transaction{item.count !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-black text-white font-mono">
                            PKR {item.amount.toLocaleString()}
                          </p>
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            {percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Visual progress bar */}
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(4, percentage)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Cash Drawer Reconciliation (5 cols) */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-5">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-800">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Cash Drawer Balancing</h3>
                <p className="text-xs text-slate-400">
                  Shift opening float & physical cash count
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Opening Float Input */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                  Shift Starting Cash Float (PKR)
                </label>
                <input
                  type="number"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white font-mono focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Tally Breakdown */}
              <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Starting Float</span>
                  <span className="font-mono text-slate-200">
                    PKR {openingFloat.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cash Collected (Orders)</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    + PKR {cashSales.toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-300 uppercase tracking-wider">
                    Expected Drawer Total
                  </span>
                  <span className="text-sm text-white font-mono">
                    PKR {expectedClosingCash.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Physical Cash Counted Input */}
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-400 mb-1">
                  Physical Cash Counted at Close (PKR)
                </label>
                <input
                  type="number"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Enter counted register cash..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-bold text-white font-mono focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              {/* Variance Indicator */}
              {hasCounted && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    cashVariance === 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : cashVariance > 0
                      ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    {cashVariance === 0 ? (
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                    <span>
                      {cashVariance === 0
                        ? 'Drawer Balanced Perfectly'
                        : cashVariance > 0
                        ? 'Cash Overage Detected'
                        : 'Cash Shortage Detected'}
                    </span>
                  </div>

                  <span className="font-mono text-sm">
                    {cashVariance > 0 ? '+' : ''}PKR {cashVariance.toLocaleString()}
                  </span>
                </div>
              )}

              {/* Final Shift Lock Button */}
              <button
                type="button"
                onClick={() => {
                  alert(
                    `Shift closed successfully! Expected: PKR ${expectedClosingCash.toLocaleString()}, Counted: PKR ${(
                      parsedCountedCash || expectedClosingCash
                    ).toLocaleString()}`
                  );
                }}
                className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Verify & Close Register Shift</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Phase5Layout>
  );
}
