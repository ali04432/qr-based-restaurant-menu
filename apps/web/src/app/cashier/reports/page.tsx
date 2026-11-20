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
  Printer,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calculator,
  ArrowUpRight,
} from 'lucide-react';
import { CashierShell } from '../../../components/cashier/CashierShell';
import { StatCard } from '../../../components/cashier/StatCard';
import { PillTabs } from '../../../components/cashier/PillTabs';
import { EmptyState } from '../../../components/cashier/EmptyState';
import { useAuthContext } from '../../../context/AuthContext';
import { cashierService } from '../../../services/cashier.service';
import { PaymentMethodDistribution, CashierSummary } from '@qr-menu/shared';

const RANGE_TABS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
];

export default function CashierReportsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<CashierSummary | null>(null);
  const [distribution, setDistribution] = useState<PaymentMethodDistribution[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalTransactions, setTotalTransactions] = useState<number>(0);
  const [range, setRange] = useState<'today' | 'week' | 'month'>('today');

  // Cash Drawer Balancing (Shift Float)
  const [openingFloat] = useState<number>(10000);
  const [countedCash, setCountedCash] = useState<string>('');

  const fetchReportData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);

      const now = new Date();
      let startDate: string | undefined;
      if (range === 'today') {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        startDate = d.toISOString();
      } else if (range === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        startDate = d.toISOString();
      } else if (range === 'month') {
        const d = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        startDate = d.toISOString();
      }

      const [sumData, analyticsData] = await Promise.all([
        cashierService.getSummary(restaurantId, token),
        cashierService.getPaymentMethodAnalytics(
          { startDate, endDate: new Date().toISOString() },
          token
        ),
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
  }, [restaurantId, token, range]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Drawer calculations
  const cashSales = distribution.find((d) => d.method === 'CASH')?.amount || 0;
  const expectedClosingCash = openingFloat + cashSales;
  const parsedCountedCash = parseFloat(countedCash) || 0;
  const hasCounted = countedCash.trim() !== '';
  const cashVariance = hasCounted ? parsedCountedCash - expectedClosingCash : 0;

  const printShiftSummary = () => {
    window.print();
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CASH':
        return <Banknote className="w-5 h-5 text-[#22C55E]" />;
      case 'CARD':
        return <CreditCard className="w-5 h-5 text-[#22D3EE]" />;
      case 'JAZZCASH':
      case 'EASYPAISA':
        return <Smartphone className="w-5 h-5 text-[#F5B342]" />;
      case 'BANK_TRANSFER':
        return <Landmark className="w-5 h-5 text-[#8B5CF6]" />;
      default:
        return <Layers className="w-5 h-5 text-[#A1A1AA]" />;
    }
  };

  const getMethodColor = (index: number) => {
    const palette = ['#F5B342', '#22C55E', '#22D3EE', '#8B5CF6', '#F97316'];
    return palette[index % palette.length];
  };

  return (
    <CashierShell
      title="Register Reports & Shift Balancing"
      subtitle="Shift revenue breakdown, payment channel distributions, and cash-in-drawer reconciliation"
      onRefresh={fetchReportData}
      isRefreshing={loading}
      headerAction={
        <button
          type="button"
          onClick={printShiftSummary}
          className="min-h-[44px] box-border px-3.5 rounded-[12px] border border-[#25282D] bg-[#15171A] hover:bg-[#1B1E23] hover:border-[#F5B342]/40 text-[#F8FAFC] flex items-center gap-2 text-xs font-semibold cursor-pointer transition-all"
        >
          <Printer className="w-4 h-4 text-[#F5B342]" strokeWidth={1.8} />
          <span className="hidden sm:inline">Print Shift Audit</span>
        </button>
      }
    >
      {/* Range Pills Filter */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PillTabs
          tabs={RANGE_TABS}
          activeTab={range}
          onChange={(r) => setRange(r as any)}
          ariaLabel="Report date range"
        />
        <div className="text-xs text-[#A1A1AA]">
          Report Range: <span className="font-semibold text-[#F5B342] uppercase">{range}</span>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <section aria-label="Shift audit KPIs" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="TOTAL COLLECTIONS"
          value={`PKR ${totalRevenue.toLocaleString()}`}
          sub={`Across ${totalTransactions} settled transactions`}
          color="#F5B342"
          tint="rgba(245,179,66,0.14)"
          icon={<DollarSign className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="PAID INVOICES"
          value={summary?.paidOrders || 0}
          sub="Successfully settled orders"
          color="#22C55E"
          tint="rgba(34,197,94,0.14)"
          icon={<CheckCircle2 className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="PENDING CHECKS"
          value={summary?.pendingPayments || 0}
          sub="Awaiting checkout settlement"
          color="#F97316"
          tint="rgba(249,115,22,0.14)"
          icon={<Clock className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="AVG TICKET VALUE"
          value={`PKR ${((summary?.todaySales || 0) / Math.max(1, summary?.paidOrders || 1)).toFixed(0)}`}
          sub="Revenue per settled guest check"
          color="#22D3EE"
          tint="rgba(34,211,238,0.14)"
          icon={<TrendingUp className="w-5 h-5" strokeWidth={1.8} />}
        />
      </section>

      {/* Two Column Layout: Payment Distribution (Left) & Shift Drawer Balancing (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Payment Channels Distribution Card */}
        <div className="lg:col-span-7 bg-[#15171A] border border-[#25282D] rounded-[16px] p-5 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-[#25282D]">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Payment Method Distribution</h3>
              <p className="text-[11px] text-[#A1A1AA]">Volume settled across channels</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#A1A1AA]">Total Volume</span>
              <p className="text-sm font-bold text-[#F5B342] font-mono">
                PKR {totalRevenue.toLocaleString()}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-[#A1A1AA]">
              Loading payment channels...
            </div>
          ) : distribution.length === 0 ? (
            <EmptyState message="No payment transactions logged for this period." />
          ) : (
            <div className="flex flex-col gap-3.5">
              {distribution.map((item, idx) => {
                const pct = totalRevenue > 0 ? Math.round((item.amount / totalRevenue) * 100) : 0;
                const barColor = getMethodColor(idx);

                return (
                  <div
                    key={item.method}
                    className="p-3.5 rounded-[12px] bg-[#1B1E23] border border-[#25282D] flex flex-col gap-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-[8px] bg-[#0F1114] border border-[#25282D]">
                          {getMethodIcon(item.method)}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-[#F8FAFC]">{item.method}</p>
                          <p className="text-[10px] text-[#A1A1AA]">{item.count} orders settled</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs font-bold text-[#F8FAFC] font-mono">
                          PKR {item.amount.toLocaleString()}
                        </p>
                        <p className="text-[10px] font-semibold text-[#F5B342]">{pct}% share</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-1.5 rounded-full bg-[#0F1114] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: barColor }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shift Cash Drawer Balancing Card */}
        <div className="lg:col-span-5 bg-[#15171A] border border-[#25282D] rounded-[16px] p-5 flex flex-col gap-4 shadow-xl">
          <div className="pb-3 border-b border-[#25282D] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#F8FAFC]">Cash Drawer Balancing</h3>
              <p className="text-[11px] text-[#A1A1AA]">Physical drawer cash audit</p>
            </div>
            <Calculator className="w-4 h-4 text-[#F5B342]" />
          </div>

          <div className="space-y-3.5">
            {/* Opening Float */}
            <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#1B1E23] border border-[#25282D]">
              <span className="text-xs text-[#A1A1AA]">Opening Float (Float In)</span>
              <span className="font-mono font-bold text-[#F8FAFC] text-xs">
                PKR {openingFloat.toLocaleString()}
              </span>
            </div>

            {/* Total Cash Sales */}
            <div className="flex items-center justify-between p-3 rounded-[12px] bg-[#1B1E23] border border-[#25282D]">
              <span className="text-xs text-[#A1A1AA]">Register Cash Sales</span>
              <span className="font-mono font-bold text-[#22C55E] text-xs">
                + PKR {cashSales.toLocaleString()}
              </span>
            </div>

            {/* Expected Closing Cash */}
            <div className="flex items-center justify-between p-3.5 rounded-[12px] bg-[rgba(245,179,66,0.08)] border border-[rgba(245,179,66,0.35)]">
              <span className="text-xs font-bold text-[#F5B342] uppercase tracking-wider">
                Expected Cash
              </span>
              <span className="font-mono font-bold text-[#F8FAFC] text-base">
                PKR {expectedClosingCash.toLocaleString()}
              </span>
            </div>

            {/* Counted Cash Input */}
            <div>
              <label className="block text-[11px] uppercase font-bold text-[#A1A1AA] mb-1.5">
                Physical Cash Counted in Drawer (PKR)
              </label>
              <input
                type="number"
                step="any"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Enter physical drawer count..."
                className="w-full box-border min-h-[48px] px-3.5 rounded-[10px] border border-[#25282D] bg-[#0F1114] text-[#F8FAFC] text-[16px] font-mono font-bold outline-none focus:border-[#F5B342]"
              />
            </div>

            {/* Reconciliation Variance */}
            {hasCounted && (
              <div
                className={`p-3.5 rounded-[12px] border flex items-center justify-between ${
                  cashVariance === 0
                    ? 'bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.4)] text-[#22C55E]'
                    : cashVariance > 0
                    ? 'bg-[rgba(34,211,238,0.12)] border-[rgba(34,211,238,0.4)] text-[#22D3EE]'
                    : 'bg-[rgba(249,115,22,0.12)] border-[rgba(249,115,22,0.4)] text-[#F97316]'
                }`}
              >
                <div className="flex items-center gap-2">
                  {cashVariance === 0 ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span className="text-xs font-bold">
                    {cashVariance === 0 ? 'Drawer Balanced (Zero Discrepancy)' : cashVariance > 0 ? 'Cash Surplus (Over)' : 'Cash Shortage (Short)'}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm">
                  {cashVariance >= 0 ? `+ PKR ${cashVariance.toLocaleString()}` : `- PKR ${Math.abs(cashVariance).toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </CashierShell>
  );
}
