'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Building2,
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  Store,
  Grid,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

interface TenantData {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  planTier: string;
  subscriptionStatus: string;
  branchesCount: number;
  tablesCount: number;
  staffCount: number;
  ordersCount: number;
  ownerEmail: string;
  ownerName: string;
}

interface OverviewData {
  totalRestaurants: number;
  totalUsers: number;
  totalOrders: number;
  platformGMV: number;
  mrr: number;
  arr: number;
  activeSubscriptions: number;
  planBreakdown: Record<string, number>;
}

export default function SuperAdminPage() {
  const { user, token } = useAuthContext();

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [tenants, setTenants] = useState<TenantData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<string>('ALL');

  // Provision Modal
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisionForm, setProvisionForm] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
    planTier: 'STARTER',
  });
  const [isSubmittingProvision, setIsSubmittingProvision] = useState(false);

  // Plan Override Modal
  const [editingTenant, setEditingTenant] = useState<TenantData | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<string>('PRO');
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;

  const fetchData = useCallback(async () => {
    if (!token || !isSuperAdmin) return;
    try {
      setIsLoading(true);
      setError(null);

      const [overviewRes, tenantsRes] = await Promise.all([
        adminService.getSuperAdminOverview(token),
        adminService.getSuperAdminRestaurants(token),
      ]);

      setOverview(overviewRes);
      setTenants(tenantsRes || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load platform data');
    } finally {
      setIsLoading(false);
    }
  }, [token, isSuperAdmin]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [fetchData, isSuperAdmin]);

  const handleSlugify = (name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setProvisionForm((prev) => ({
      ...prev,
      name,
      slug: handleSlugify(name),
    }));
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsSubmittingProvision(true);
      setError(null);

      await adminService.provisionTenant(provisionForm, token);
      setSuccessMessage(`Tenant '${provisionForm.name}' provisioned successfully!`);
      setIsProvisionOpen(false);
      setProvisionForm({
        name: '',
        slug: '',
        ownerName: '',
        ownerEmail: '',
        ownerPassword: '',
        planTier: 'STARTER',
      });
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to provision tenant');
    } finally {
      setIsSubmittingProvision(false);
    }
  };

  const handleUpdatePlanSubmit = async () => {
    if (!token || !editingTenant) return;

    try {
      setIsUpdatingPlan(true);
      setError(null);

      await adminService.updateTenantPlan(editingTenant.id, selectedNewPlan, token);
      setSuccessMessage(`Updated ${editingTenant.name} plan to ${selectedNewPlan}`);
      setEditingTenant(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to update plan');
    } finally {
      setIsUpdatingPlan(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
          <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mb-4 border border-red-800/40">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Restricted Access</h2>
          <p className="text-zinc-400 max-w-md">
            This console is reserved strictly for Platform Super Administrators. You do not have permissions to view multi-tenant infrastructure.
          </p>
        </div>
      </AdminLayout>
    );
  }

  const filteredTenants = tenants.filter((t) => {
    const matchesQuery =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = selectedPlanFilter === 'ALL' || t.planTier === selectedPlanFilter;

    return matchesQuery && matchesPlan;
  });

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'STARTER':
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
      case 'PRO':
        return 'bg-blue-900/40 text-blue-400 border-blue-800/50';
      case 'BUSINESS':
        return 'bg-purple-900/40 text-purple-400 border-purple-800/50';
      case 'ENTERPRISE':
        return 'bg-amber-900/40 text-amber-400 border-amber-800/50';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Platform Super Admin
                    <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Multi-Tenant Fleet
                    </span>
                  </h1>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    Platform-wide telemetry, SaaS billing revenue, tenant lifecycle, and plan enforcement
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-sm font-medium border border-zinc-700 transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                onClick={() => setIsProvisionOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                Provision Tenant
              </button>
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="flex-1">{successMessage}</span>
            <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* SaaS Overview Metrics */}
        {overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Monthly Recurring Revenue</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${overview.mrr.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-400 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>ARR: ${overview.arr.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Platform GMV</span>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <ShoppingBag className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                ${overview.platformGMV.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Processed across {overview.totalOrders.toLocaleString()} total orders
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Total Tenant Fleet</span>
                <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                  <Building2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {overview.totalRestaurants}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                {overview.activeSubscriptions} active SaaS subscriptions
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Plan Distribution</span>
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {Object.entries(overview.planBreakdown).map(([tier, count]) => (
                  <span
                    key={tier}
                    className="text-xs px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 font-mono"
                  >
                    {tier}: <strong className="text-white">{count}</strong>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tenant Directory Section */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Restaurant Tenants</h2>
              <p className="text-zinc-400 text-sm">
                Showing {filteredTenants.length} of {tenants.length} provisioned restaurant organizations
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by name, slug, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Plan Filter */}
              <select
                value={selectedPlanFilter}
                onChange={(e) => setSelectedPlanFilter(e.target.value)}
                className="px-3 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Plans</option>
                <option value="STARTER">Starter</option>
                <option value="PRO">Pro</option>
                <option value="BUSINESS">Business</option>
                <option value="ENTERPRISE">Enterprise</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-zinc-800/40 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Tenant Organization</th>
                  <th className="py-3 px-4 font-semibold">Owner Contact</th>
                  <th className="py-3 px-4 font-semibold">Plan Tier</th>
                  <th className="py-3 px-4 font-semibold">Outlets & Scale</th>
                  <th className="py-3 px-4 font-semibold">Orders</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isLoading && tenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      Loading platform tenant directory...
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No tenants match your search filter.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-semibold text-white">{t.name}</div>
                          <div className="text-xs text-zinc-400 font-mono">slug: {t.slug}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <div className="text-zinc-200">{t.ownerName}</div>
                          <div className="text-xs text-zinc-400">{t.ownerEmail}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getTierBadge(
                            t.planTier
                          )}`}
                        >
                          {t.planTier}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3 text-xs text-zinc-400">
                          <span title="Branches" className="flex items-center gap-1">
                            <Store className="w-3.5 h-3.5 text-zinc-500" /> {t.branchesCount}
                          </span>
                          <span title="Tables" className="flex items-center gap-1">
                            <Grid className="w-3.5 h-3.5 text-zinc-500" /> {t.tablesCount}
                          </span>
                          <span title="Staff" className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-zinc-500" /> {t.staffCount}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-medium text-zinc-300">
                        {t.ordersCount.toLocaleString()}
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-950/50 text-emerald-400 border border-emerald-800/50">
                          {t.subscriptionStatus}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => {
                            setEditingTenant(t);
                            setSelectedNewPlan(t.planTier);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium border border-zinc-700 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                          Change Plan
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Provision Tenant Modal */}
        {isProvisionOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Provision New Restaurant Tenant</h3>
                    <p className="text-xs text-zinc-400">Creates restaurant record, initial admin user, and subscription</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsProvisionOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleProvisionSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Restaurant Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Grand Bistro & Lounge"
                    value={provisionForm.name}
                    onChange={handleNameChange}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="grand-bistro"
                    value={provisionForm.slug}
                    onChange={(e) => setProvisionForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Sarah Jenkins"
                      value={provisionForm.ownerName}
                      onChange={(e) => setProvisionForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                      Initial Plan Tier
                    </label>
                    <select
                      value={provisionForm.planTier}
                      onChange={(e) => setProvisionForm((prev) => ({ ...prev, planTier: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    >
                      <option value="STARTER">Starter ($29/mo)</option>
                      <option value="PRO">Pro ($79/mo)</option>
                      <option value="BUSINESS">Business ($149/mo)</option>
                      <option value="ENTERPRISE">Enterprise ($299/mo)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                      Owner Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="owner@grandbistro.com"
                      value={provisionForm.ownerEmail}
                      onChange={(e) => setProvisionForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                      Temporary Password *
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={provisionForm.ownerPassword}
                      onChange={(e) => setProvisionForm((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsProvisionOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingProvision}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {isSubmittingProvision ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Provision Tenant
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Plan Modal */}
        {editingTenant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Override Tenant Plan</h3>
                  <p className="text-xs text-zinc-400">Updating plan for {editingTenant.name}</p>
                </div>
                <button
                  onClick={() => setEditingTenant(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 my-6">
                <div>
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-2">
                    Select New Tier
                  </label>
                  <div className="space-y-2">
                    {['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE'].map((tier) => (
                      <label
                        key={tier}
                        className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition ${
                          selectedNewPlan === tier
                            ? 'bg-indigo-600/10 border-indigo-500 text-white'
                            : 'bg-zinc-800/40 border-zinc-700/60 text-zinc-300 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="planTier"
                            value={tier}
                            checked={selectedNewPlan === tier}
                            onChange={(e) => setSelectedNewPlan(e.target.value)}
                            className="text-indigo-600 focus:ring-0"
                          />
                          <span className="font-semibold text-sm">{tier}</span>
                        </div>
                        <span className="text-xs text-zinc-400 font-mono">
                          {tier === 'STARTER' && '$29/mo'}
                          {tier === 'PRO' && '$79/mo'}
                          {tier === 'BUSINESS' && '$149/mo'}
                          {tier === 'ENTERPRISE' && '$299/mo'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpdatePlanSubmit}
                  disabled={isUpdatingPlan}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition flex items-center gap-2"
                >
                  {isUpdatingPlan ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Apply Plan Override
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
