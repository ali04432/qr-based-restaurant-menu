'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Users,
  Grid,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  MapPin,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  PieChart,
  ShieldCheck,
  Building2,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { useBranchContext } from '../../../context/BranchContext';
import { Branch, CreateBranchInput, UpdateBranchInput, UserRole } from '@qr-menu/shared';

interface BranchWithCounts extends Branch {
  _count?: {
    tables: number;
    users: number;
    orders: number;
  };
}

interface ConsolidatedAnalytics {
  summary: {
    totalLocations: number;
    grandTotalRevenue: number;
    grandTotalOrders: number;
    avgRevenuePerLocation: number;
  };
  locations: Array<{
    branchId: string;
    name: string;
    code: string;
    isActive: boolean;
    tablesCount: number;
    staffCount: number;
    totalOrders: number;
    completedOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    revenueSharePercent: number;
  }>;
}

export default function AdminBranchesPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';
  const { refreshBranches } = useBranchContext();

  const [branches, setBranches] = useState<BranchWithCounts[]>([]);
  const [analytics, setAnalytics] = useState<ConsolidatedAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'LOCATIONS' | 'ANALYTICS'>('LOCATIONS');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateBranchInput>({
    name: '',
    code: '',
    address: '',
    phone: '',
    email: '',
    isActive: true,
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);

      const [branchesRes, analyticsRes] = await Promise.allSettled([
        adminService.getBranches(restaurantId, token),
        adminService.getConsolidatedBranchAnalytics(restaurantId, token),
      ]);

      if (branchesRes.status === 'fulfilled') {
        setBranches((branchesRes.value as any) || []);
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load branch data');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateModal = () => {
    setEditingBranch(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      phone: '',
      email: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (branch: Branch) => {
    setEditingBranch(branch);
    setFormData({
      name: branch.name,
      code: branch.code,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      isActive: branch.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsSubmitting(true);
      setError(null);

      if (editingBranch) {
        await adminService.updateBranch(
          editingBranch.id,
          {
            name: formData.name,
            code: (formData.code || '').toUpperCase(),
            address: formData.address || undefined,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            isActive: formData.isActive,
          },
          token
        );
        setSuccessMessage(`Branch '${formData.name}' updated successfully.`);
      } else {
        await adminService.createBranch(
          {
            restaurantId,
            name: formData.name,
            code: (formData.code || '').toUpperCase(),
            address: formData.address || undefined,
            phone: formData.phone || undefined,
            email: formData.email || undefined,
            isActive: formData.isActive,
          },
          token
        );
        setSuccessMessage(`Branch '${formData.name}' created successfully.`);
      }

      setIsModalOpen(false);
      await fetchData();
      await refreshBranches();
    } catch (err: any) {
      setError(err?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!token) return;
    const confirmMsg = `Are you sure you want to delete or deactivate '${branch.name}'? Active order histories will be preserved safely.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsLoading(true);
      await adminService.deleteBranch(branch.id, token);
      setSuccessMessage(`Branch '${branch.name}' processed.`);
      await fetchData();
      await refreshBranches();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete branch');
    } finally {
      setIsLoading(false);
    }
  };

  // KPI Calculations
  const totalLocations = branches.length;
  const activeLocations = branches.filter((b) => b.isActive).length;
  const totalTables = branches.reduce((acc, b) => acc + (b._count?.tables || 0), 0);
  const totalStaff = branches.reduce((acc, b) => acc + (b._count?.users || 0), 0);

  return (
    <AdminLayout
      title="Multi-Branch & Location Management"
      subtitle="Configure franchise outlets, compare location revenue, and manage multi-unit operations"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}
      onRefresh={fetchData}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        {/* Top Notification Banner */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
            <button type="button" onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button type="button" onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Operational KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Outlets / Branches</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalLocations}</h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {activeLocations} Active • {totalLocations - activeLocations} Inactive
              </p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <Grid className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Tables</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalTables}</h3>
              <p className="text-xs text-slate-500 mt-1">Across all franchise units</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Deployed Staff</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalStaff}</h3>
              <p className="text-xs text-slate-500 mt-1">Waiters, chefs, managers</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Franchise Revenue</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">
                ${analytics?.summary.grandTotalRevenue?.toLocaleString() || '0.00'}
              </h3>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {analytics?.summary.grandTotalOrders || 0} Total Orders
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation & Action Bar */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('LOCATIONS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'LOCATIONS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Building2 className="w-4 h-4" />
              Branch Outlets ({branches.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ANALYTICS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === 'ANALYTICS'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              Consolidated Performance
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Add New Branch
          </button>
        </div>

        {/* TAB 1: LOCATIONS LIST */}
        {activeTab === 'LOCATIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {branches.length === 0 ? (
              <div className="col-span-full bg-white p-12 rounded-xl border border-slate-200 text-center">
                <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Branch Locations Configured</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Add your restaurant's branches or franchise outlets to enable location-based menus, tables, staff scheduling, and consolidated reporting.
                </p>
                <button
                  type="button"
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create First Branch
                </button>
              </div>
            ) : (
              branches.map((b) => (
                <div
                  key={b.id}
                  className={`bg-white rounded-xl border transition shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden ${
                    b.isActive ? 'border-slate-200' : 'border-slate-200 opacity-70 bg-slate-50/50'
                  }`}
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-bold text-slate-900">{b.name}</h3>
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[10px] font-mono font-bold text-slate-700">
                            {b.code}
                          </span>
                        </div>
                        {b.address && (
                          <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{b.address}</span>
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          b.isActive
                            ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            : 'bg-slate-100 border border-slate-300 text-slate-500'
                        }`}
                      >
                        {b.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    {/* Contact Info */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                      {b.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.phone}</span>
                        </div>
                      )}
                      {b.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{b.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Operational KPI counts */}
                    <div className="mt-4 grid grid-cols-3 gap-2 bg-slate-50 rounded-lg p-2.5 text-center">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Tables</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{b._count?.tables ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Staff</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{b._count?.users ?? 0}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-semibold text-slate-500 uppercase">Orders</span>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">{b._count?.orders ?? 0}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Added {new Date(b.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(b)}
                        className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white border border-slate-200 transition"
                        title="Edit branch"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(b)}
                        className="p-1.5 rounded-md text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 transition"
                        title="Delete or deactivate branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: CONSOLIDATED ANALYTICS */}
        {activeTab === 'ANALYTICS' && (
          <div className="space-y-6">
            {/* Franchise Performance Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Franchise Revenue & Order Performance</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Real-time breakdown of volume, revenue share, and table metrics by location</p>
                </div>
                <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {analytics?.locations.length || 0} Outlets Reporting
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Location Name</th>
                      <th className="py-3 px-4">Code</th>
                      <th className="py-3 px-4 text-center">Tables</th>
                      <th className="py-3 px-4 text-center">Staff</th>
                      <th className="py-3 px-4 text-center">Total Orders</th>
                      <th className="py-3 px-4 text-right">Revenue</th>
                      <th className="py-3 px-4 text-right">Avg Order</th>
                      <th className="py-3 px-4 text-right">Franchise Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analytics?.locations.map((loc) => (
                      <tr key={loc.branchId} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                          <Store className="w-4 h-4 text-amber-600" />
                          <span>{loc.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono font-semibold text-slate-600">
                          {loc.code}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">
                          {loc.tablesCount}
                        </td>
                        <td className="py-3 px-4 text-center font-medium text-slate-700">
                          {loc.staffCount}
                        </td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-900">
                          {loc.totalOrders}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600">
                          ${loc.totalRevenue.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-700">
                          ${loc.avgOrderValue.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-bold text-slate-800">{loc.revenueSharePercent}%</span>
                            <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, loc.revenueSharePercent)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: CREATE / EDIT BRANCH */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-50">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Store className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-bold text-slate-900">
                    {editingBranch ? `Edit Branch: ${editingBranch.name}` : 'Add New Branch Location'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Branch Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Downtown Flagship"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Branch Code <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="e.g. DT-01"
                      className="w-full text-xs font-mono uppercase px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Physical Address</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g. 104 Main Street, Commercial Area"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 019-2834"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="branch@restaurant.com"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive ?? true}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 cursor-pointer"
                  />
                  <label htmlFor="isActive" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Branch is currently operational and accepting orders
                  </label>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingBranch ? 'Update Branch' : 'Create Branch'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
