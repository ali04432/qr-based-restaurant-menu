'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  ArrowDownLeft,
  ArrowUpRight,
  DollarSign,
  Wallet,
  RotateCcw,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
  Layers,
} from 'lucide-react';
import { CashierShell } from '../../../components/cashier/CashierShell';
import { StatCard } from '../../../components/cashier/StatCard';
import { PillTabs } from '../../../components/cashier/PillTabs';
import { SearchInput } from '../../../components/cashier/SearchInput';
import { DataTable } from '../../../components/cashier/DataTable';
import { EmptyState } from '../../../components/cashier/EmptyState';
import { StatusBadge } from '../../../components/cashier/Badge';
import { useAuthContext } from '../../../context/AuthContext';
import { cashierService } from '../../../services/cashier.service';

const METHOD_TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'CASH', label: 'Cash' },
  { id: 'CARD', label: 'Card / POS' },
  { id: 'DIGITAL', label: 'Wallets' },
];

export default function CashierLedgerPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [openingFloat] = useState<number>(10000); // Standard shift opening float in PKR

  const fetchLedger = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await cashierService.getTransactions(
        {
          search: searchQuery || undefined,
          limit: 100,
        },
        token
      );
      setTransactions(data || []);
    } catch (err) {
      console.error('Failed to load ledger transactions:', err);
    } finally {
      setLoading(false);
    }
  }, [token, searchQuery]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  // Compute ledger entries with running balance
  const ledgerEntries = useMemo(() => {
    // Sort chronologically ascending to compute running balance
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    let currentBalance = openingFloat;

    const entriesWithBalance = sorted.map((tx) => {
      const isRefund = tx.status === 'REFUNDED';
      const isCredit = tx.status === 'COMPLETED';
      const amount = Number(tx.amount || 0);

      if (isCredit) {
        currentBalance += amount;
      } else if (isRefund) {
        currentBalance -= amount;
      }

      return {
        ...tx,
        isCredit,
        isRefund,
        runningBalance: currentBalance,
      };
    });

    // Display newest first in the table
    return entriesWithBalance.reverse();
  }, [transactions, openingFloat]);

  // Filtered entries by method
  const filteredEntries = useMemo(() => {
    return ledgerEntries.filter((entry) => {
      if (methodFilter === 'ALL') return true;
      if (methodFilter === 'CASH') return entry.method === 'CASH';
      if (methodFilter === 'CARD') return entry.method === 'CARD';
      if (methodFilter === 'DIGITAL')
        return ['JAZZCASH', 'EASYPAISA', 'BANK_TRANSFER', 'OTHER'].includes(entry.method);
      return true;
    });
  }, [ledgerEntries, methodFilter]);

  // KPI Calculations
  const totalIn = transactions
    .filter((t) => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalOut = transactions
    .filter((t) => t.status === 'REFUNDED')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const closingBalance = openingFloat + totalIn - totalOut;

  const renderMethodBadge = (method: string) => {
    switch (method) {
      case 'CASH':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(34,197,94,0.14)] text-[#22C55E] border border-[rgba(34,197,94,0.4)] text-[10px] font-bold">
            <Banknote className="w-3 h-3" />
            <span>Cash</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(34,211,238,0.14)] text-[#22D3EE] border border-[rgba(34,211,238,0.4)] text-[10px] font-bold">
            <CreditCard className="w-3 h-3" />
            <span>Card / POS</span>
          </span>
        );
      case 'JAZZCASH':
      case 'EASYPAISA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(245,179,66,0.14)] text-[#F5B342] border border-[rgba(245,179,66,0.4)] text-[10px] font-bold">
            <Smartphone className="w-3 h-3" />
            <span>Wallet</span>
          </span>
        );
      case 'BANK_TRANSFER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[rgba(139,92,246,0.16)] text-[#8B5CF6] border border-[rgba(139,92,246,0.4)] text-[10px] font-bold">
            <Landmark className="w-3 h-3" />
            <span>Bank</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[6px] bg-[#1B1E23] text-[#A1A1AA] border border-[#25282D] text-[10px] font-bold">
            <Layers className="w-3 h-3" />
            <span>Other</span>
          </span>
        );
    }
  };

  return (
    <CashierShell
      title="Cashier General Ledger"
      subtitle="Shift transaction ledger, cash movements, and running drawer balance"
      onRefresh={fetchLedger}
      isRefreshing={loading}
    >
      {/* 4 Stat Cards */}
      <section aria-label="Ledger summary" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="OPENING BALANCE"
          value={`PKR ${openingFloat.toLocaleString()}`}
          sub="Shift opening drawer float"
          color="#F5B342"
          tint="rgba(245,179,66,0.14)"
          icon={<Wallet className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="TOTAL IN (CREDIT)"
          value={`PKR ${totalIn.toLocaleString()}`}
          sub="Settled guest orders"
          color="#22C55E"
          tint="rgba(34,197,94,0.14)"
          icon={<ArrowDownLeft className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="TOTAL OUT (DEBIT)"
          value={`PKR ${totalOut.toLocaleString()}`}
          sub="Refunds & payouts"
          color="#F97316"
          tint="rgba(249,115,22,0.14)"
          icon={<RotateCcw className="w-5 h-5" strokeWidth={1.8} />}
        />
        <StatCard
          label="CLOSING BALANCE"
          value={`PKR ${closingBalance.toLocaleString()}`}
          sub="Current drawer expected total"
          color="#22D3EE"
          tint="rgba(34,211,238,0.14)"
          icon={<DollarSign className="w-5 h-5" strokeWidth={1.8} />}
        />
      </section>

      {/* Filter Bar */}
      <div className="bg-[#15171A] border border-[#25282D] rounded-[16px] p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <PillTabs
          tabs={METHOD_TABS}
          activeTab={methodFilter}
          onChange={setMethodFilter}
          ariaLabel="Filter ledger method"
        />

        <div className="flex items-center gap-2.5 flex-1 max-w-sm">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search reference or order..."
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="w-full">
        {loading ? (
          <div className="p-16 text-center text-xs text-[#A1A1AA] bg-[#15171A] border border-[#25282D] rounded-[16px]">
            Calculating ledger balances...
          </div>
        ) : filteredEntries.length === 0 ? (
          <EmptyState message="No ledger transactions found matching filters." />
        ) : (
          <DataTable
            headers={[
              'Date & Time',
              'Reference',
              'Table / Source',
              'Payment Method',
              'Debit / Credit',
              'Running Balance',
            ]}
            alignRightIndices={[4, 5]}
          >
            {filteredEntries.map((entry) => {
              const isCredit = entry.isCredit;
              const isRefund = entry.isRefund;

              return (
                <tr key={entry.id} className="hover:bg-[#1B1E23]/60 transition-colors">
                  <td className="p-[14px_16px] text-[#A1A1AA]">
                    <div className="text-[#F8FAFC] font-medium">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA]/80 font-mono">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>

                  <td className="p-[14px_16px]">
                    <div className="font-mono font-bold text-[#F8FAFC]">
                      #{entry.id.slice(-8).toUpperCase()}
                    </div>
                    <div className="text-[11px] text-[#A1A1AA]">
                      Order #{entry.order?.orderNumber || entry.orderId?.slice(-6) || 'WALK-IN'}
                    </div>
                  </td>

                  <td className="p-[14px_16px]">
                    <span className="font-semibold text-xs px-2 py-0.5 rounded-md bg-[#1B1E23] border border-[#25282D] text-[#F5B342]">
                      {entry.order?.table?.tableNumber ? `Table ${entry.order.table.tableNumber}` : 'Direct Register'}
                    </span>
                  </td>

                  <td className="p-[14px_16px]">{renderMethodBadge(entry.method)}</td>

                  <td className="p-[14px_16px] text-right font-mono font-bold">
                    {isCredit ? (
                      <span className="text-[#22C55E]">
                        + PKR {Number(entry.amount || 0).toFixed(2)}
                      </span>
                    ) : isRefund ? (
                      <span className="text-[#F97316]">
                        - PKR {Number(entry.amount || 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="text-[#A1A1AA]">
                        PKR {Number(entry.amount || 0).toFixed(2)}
                      </span>
                    )}
                  </td>

                  <td className="p-[14px_16px] text-right font-mono font-bold text-[#F8FAFC] text-[13px]">
                    PKR {entry.runningBalance.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </div>
    </CashierShell>
  );
}
