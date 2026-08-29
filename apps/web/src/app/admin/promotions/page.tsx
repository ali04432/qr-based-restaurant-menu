'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Calendar,
  Percent,
  DollarSign,
  RefreshCw,
  X,
  Copy,
  CheckCircle2,
  AlertCircle,
  Search,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { Promotion, CreatePromotionInput, PromotionType, UserRole } from '@qr-menu/shared';

export default function AdminPromotionsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDiscountType, setFormDiscountType] = useState<PromotionType>('PERCENTAGE');
  const [formDiscountValue, setFormDiscountValue] = useState<number>(10);
  const [formMinOrderAmount, setFormMinOrderAmount] = useState<number>(0);
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getPromotions(restaurantId, token);
      setPromotions(data || []);
    } catch (err) {
      console.warn('[AdminPromotions] Failed to fetch promotions', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token]);

  const openCreateModal = () => {
    setEditing(null);
    setFormName('');
    setFormCode('');
    setFormDiscountType('PERCENTAGE');
    setFormDiscountValue(10);
    setFormMinOrderAmount(0);
    setFormStartDate('');
    setFormEndDate('');
    setFormIsActive(true);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (promo: Promotion) => {
    setEditing(promo);
    setFormName(promo.name);
    setFormCode(promo.code);
    setFormDiscountType(promo.discountType);
    setFormDiscountValue(promo.discountValue);
    setFormMinOrderAmount(promo.minOrderAmount || 0);
    setFormStartDate(promo.startDate ? new Date(promo.startDate).toISOString().split('T')[0] : '');
    setFormEndDate(promo.endDate ? new Date(promo.endDate).toISOString().split('T')[0] : '');
    setFormIsActive(promo.isActive);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');

    if (!formName.trim() || !formCode.trim()) {
      setFormError('Name and promo code are required.');
      return;
    }
    if (formDiscountValue <= 0) {
      setFormError('Discount value must be greater than 0.');
      return;
    }
    if (formDiscountType === 'PERCENTAGE' && formDiscountValue > 100) {
      setFormError('Percentage discount cannot exceed 100%.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editing) {
        await adminService.updatePromotion(
          editing.id,
          {
            name: formName,
            code: formCode.toUpperCase(),
            discountType: formDiscountType,
            discountValue: formDiscountValue,
            minOrderAmount: formMinOrderAmount,
            startDate: formStartDate || undefined,
            endDate: formEndDate || undefined,
            isActive: formIsActive,
          },
          token
        );
      } else {
        const input: CreatePromotionInput = {
          restaurantId,
          name: formName,
          code: formCode.toUpperCase(),
          discountType: formDiscountType,
          discountValue: formDiscountValue,
          minOrderAmount: formMinOrderAmount,
          startDate: formStartDate || undefined,
          endDate: formEndDate || undefined,
          isActive: formIsActive,
        };
        await adminService.createPromotion(input, token);
      }
      setModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err?.message || 'Failed to save promotion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    if (!token) return;
    try {
      await adminService.updatePromotion(promo.id, { isActive: !promo.isActive }, token);
      fetchData();
    } catch (err) {
      console.warn('[AdminPromotions] Failed to toggle promotion', err);
    }
  };

  const handleDelete = async () => {
    if (!token || !deleteId) return;
    setIsDeleting(true);
    try {
      await adminService.deletePromotion(deleteId, token);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.warn('[AdminPromotions] Failed to delete promotion', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const filteredPromotions = promotions.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.code.toLowerCase().includes(q)
    );
  });

  const activeCount = promotions.filter((p) => p.isActive).length;
  const inactiveCount = promotions.filter((p) => !p.isActive).length;

  return (
    <AdminLayout
      title="Promotions & Discounts"
      subtitle="Manage Promo Codes, Discounts & Campaigns"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Summary Cards ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Total Promotions</p>
                  <p className="text-2xl font-bold text-slate-900">{promotions.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Active</p>
                  <p className="text-2xl font-bold text-slate-900">{activeCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Inactive</p>
                  <p className="text-2xl font-bold text-slate-900">{inactiveCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-xs bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
              />
            </div>
            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 transition"
            >
              <Plus className="w-4 h-4" />
              Create Promotion
            </button>
          </div>

          {/* ── Promotions Table ── */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            {filteredPromotions.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No promotions found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Name</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Code</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Discount</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Min Order</th>
                      <th className="text-left px-4 py-3 font-semibold text-slate-600">Period</th>
                      <th className="text-center px-4 py-3 font-semibold text-slate-600">Status</th>
                      <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPromotions.map((promo) => (
                      <tr key={promo.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{promo.name}</td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleCopyCode(promo.code)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono font-semibold hover:bg-slate-200 transition"
                          >
                            {promo.code}
                            {copiedCode === promo.code ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1">
                            {promo.discountType === 'PERCENTAGE' ? (
                              <Percent className="w-3 h-3 text-amber-500" />
                            ) : (
                              <DollarSign className="w-3 h-3 text-emerald-500" />
                            )}
                            <span className="font-semibold text-slate-800">
                              {promo.discountType === 'PERCENTAGE'
                                ? `${promo.discountValue}%`
                                : `Rs. ${promo.discountValue.toFixed(0)}`}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {promo.minOrderAmount > 0 ? `Rs. ${promo.minOrderAmount.toFixed(0)}` : '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {promo.startDate || promo.endDate ? (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {promo.startDate
                                ? new Date(promo.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '—'}
                              {' → '}
                              {promo.endDate
                                ? new Date(promo.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : 'Open'}
                            </span>
                          ) : (
                            <span className="text-slate-400">No date limit</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(promo)}
                            title={promo.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {promo.isActive ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold">
                                <ToggleRight className="w-3.5 h-3.5" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded-full text-xs font-semibold">
                                <ToggleLeft className="w-3.5 h-3.5" />
                                Inactive
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(promo)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteId(promo.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Create/Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? 'Edit Promotion' : 'Create Promotion'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promotion Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Summer Sale 20%"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Promo Code *</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                  placeholder="e.g., SUMMER20"
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs font-mono uppercase focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Discount Type</label>
                  <select
                    value={formDiscountType}
                    onChange={(e) => setFormDiscountType(e.target.value as PromotionType)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED">Fixed Amount (Rs.)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Discount Value {formDiscountType === 'PERCENTAGE' ? '(%)' : '(Rs.)'}
                  </label>
                  <input
                    type="number"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(Number(e.target.value))}
                    min={0}
                    step={formDiscountType === 'PERCENTAGE' ? 1 : 10}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minimum Order Amount (Rs.)</label>
                <input
                  type="number"
                  value={formMinOrderAmount}
                  onChange={(e) => setFormMinOrderAmount(Number(e.target.value))}
                  min={0}
                  step={10}
                  className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-slate-700">Active</label>
                <button
                  type="button"
                  onClick={() => setFormIsActive(!formIsActive)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    formIsActive ? 'bg-emerald-500' : 'bg-slate-300'
                  } relative`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                      formIsActive ? 'left-5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Saving...' : editing ? 'Update Promotion' : 'Create Promotion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">Delete Promotion</h3>
            <p className="text-xs text-slate-600 mb-4">
              Are you sure you want to delete this promotion? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-md hover:bg-rose-700 disabled:opacity-50 transition"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
