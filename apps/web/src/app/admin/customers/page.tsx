'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  DollarSign,
  ShoppingBag,
  Clock,
  Award,
  ChevronRight,
  TrendingUp,
  X,
  Phone,
  Calendar,
  Grid,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

interface CustomerProfile {
  id: string;
  phone: string;
  name: string;
  tier: string;
  pointsBalance: number;
  orderCount: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  lastOrderNumber: string | null;
  lastTable: string | null;
}

const TIER_BADGES: Record<string, { bg: string; text: string; border: string }> = {
  BRONZE: { bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-700/50' },
  SILVER: { bg: 'bg-slate-800', text: 'text-slate-200', border: 'border-slate-600' },
  GOLD: { bg: 'bg-yellow-950/40', text: 'text-yellow-400', border: 'border-yellow-600/50' },
  PLATINUM: { bg: 'bg-purple-950/40', text: 'text-purple-300', border: 'border-purple-600/50' },
};

export default function AdminCustomersPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [summary, setSummary] = useState({
    totalCustomers: 0,
    totalSpend: 0,
    totalOrders: 0,
    averageSpendPerCustomer: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);

  const fetchCustomers = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const res = await adminService.getCustomers(
        restaurantId,
        {
          search: searchQuery || undefined,
          tier: selectedTier === 'ALL' ? undefined : selectedTier,
        },
        token
      );
      setCustomers(res.customers || []);
      if (res.summary) setSummary(res.summary);
    } catch (err) {
      console.warn('[AdminCustomers] Error fetching customers', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, searchQuery, selectedTier]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  return (
    <AdminLayout
      title="Customer Directory & Order History"
      subtitle="Guest Records, Lifetime Value, Frequency, and Table Visit Activity"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchCustomers}
      isRefreshing={refreshing}
    >
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Customers */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Guests
            </span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white">
              {summary.totalCustomers.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unique dining accounts</p>
        </div>

        {/* Total Spend */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Lifetime Guest Spend
            </span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white">
              Rs. {summary.totalSpend.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            Across completed orders
          </p>
        </div>

        {/* Total Orders Placed */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Total Orders
            </span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white">
              {summary.totalOrders.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total visits recorded</p>
        </div>

        {/* Average Spend / Customer */}
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Average Guest Value
            </span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-black text-white">
              Rs. {Math.round(summary.averageSpendPerCustomer).toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Per unique customer</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-lg backdrop-blur-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by phone number or name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/80 transition"
          />
        </div>

        {/* Tier Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSelectedTier(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                selectedTier === t
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Customer Registry ({customers.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live PostgreSQL Records</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Loading customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <UserCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-300">No customer records found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Guests are automatically registered when they order with their phone or join the Silver Sapoon loyalty program.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Customer Phone</th>
                  <th className="py-3 px-4">Loyalty Tier</th>
                  <th className="py-3 px-4 text-center">Orders</th>
                  <th className="py-3 px-4">Total Spending</th>
                  <th className="py-3 px-4">Avg. Order Value</th>
                  <th className="py-3 px-4">Last Visit Table</th>
                  <th className="py-3 px-4">Last Order Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {customers.map((cust) => {
                  const badge = TIER_BADGES[cust.tier] || TIER_BADGES.BRONZE;

                  return (
                    <tr
                      key={cust.id || cust.phone}
                      className="hover:bg-slate-800/40 transition cursor-pointer group"
                      onClick={() => setSelectedCustomer(cust)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-amber-400/80 shrink-0" />
                        <span>{cust.phone}</span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg} ${badge.text} ${badge.border}`}
                        >
                          <Award className="w-3 h-3" />
                          {cust.tier}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-slate-200 px-2 py-0.5 rounded-md bg-slate-800 text-[11px]">
                          {cust.orderCount}
                        </span>
                      </td>

                      <td className="py-3 px-4 font-semibold text-emerald-400">
                        Rs. {cust.totalSpent.toLocaleString()}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-300">
                        Rs. {Math.round(cust.averageOrderValue).toLocaleString()}
                      </td>

                      <td className="py-3 px-4">
                        {cust.lastTable ? (
                          <span className="inline-flex items-center gap-1 text-slate-300 font-medium">
                            <Grid className="w-3 h-3 text-amber-400" />
                            Table {cust.lastTable}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {cust.lastOrderDate ? (
                          new Date(cust.lastOrderDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        ) : (
                          <span className="text-slate-500 italic">No orders yet</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(cust);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-medium transition"
                        >
                          <span>Profile</span>
                          <ChevronRight className="w-3 h-3 text-amber-400" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Slide-Over Profile Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-xs animate-in fade-in-50 duration-200">
          <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    {selectedCustomer.phone}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Guest Account Profile
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6 flex-1">
              {/* Status Badge */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Loyalty Tier
                  </span>
                  <span className="text-sm font-black text-amber-400 mt-0.5 block">
                    {selectedCustomer.tier} MEMBER
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Points Balance
                  </span>
                  <span className="text-sm font-black text-white mt-0.5 block">
                    {selectedCustomer.pointsBalance} pts
                  </span>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Total Lifetime Spend
                  </span>
                  <span className="text-base font-black text-emerald-400 mt-1 block">
                    Rs. {selectedCustomer.totalSpent.toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Total Visits
                  </span>
                  <span className="text-base font-black text-white mt-1 block">
                    {selectedCustomer.orderCount} Orders
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Average Order Value
                  </span>
                  <span className="text-base font-black text-slate-200 mt-1 block">
                    Rs. {Math.round(selectedCustomer.averageOrderValue).toLocaleString()}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Last Table
                  </span>
                  <span className="text-base font-black text-amber-400 mt-1 block">
                    {selectedCustomer.lastTable ? `Table ${selectedCustomer.lastTable}` : '—'}
                  </span>
                </div>
              </div>

              {/* Last Order Reference */}
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <span className="text-xs font-bold text-white block mb-2">
                  Most Recent Order Activity
                </span>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Order Reference:</span>
                    <span className="font-mono font-bold text-white">
                      {selectedCustomer.lastOrderNumber || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Date & Time:</span>
                    <span className="font-mono text-slate-300">
                      {selectedCustomer.lastOrderDate
                        ? new Date(selectedCustomer.lastOrderDate).toLocaleString()
                        : 'No orders'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
