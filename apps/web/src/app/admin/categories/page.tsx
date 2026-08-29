'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  MoveUp,
  MoveDown,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { MenuCategory, UserRole } from '@qr-menu/shared';

export default function AdminCategoriesPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCategories = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getCategories(restaurantId, token);
      setCategories(data || []);
    } catch (err) {
      console.warn('[AdminCategories] Failed to fetch categories', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [restaurantId, token]);

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setOrderIndex(categories.length + 1);
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: any) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setOrderIndex(cat.order ?? 0);
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        const updated = await adminService.updateCategory(
          editingCategory.id,
          { name: name.trim(), description: description.trim() || undefined, order: Number(orderIndex) },
          token
        );
        setCategories((prev) => prev.map((c) => (c.id === editingCategory.id ? { ...c, ...updated } : c)));
      } else {
        const created = await adminService.createCategory(
          { restaurantId, name: name.trim(), description: description.trim() || undefined, order: Number(orderIndex) },
          token
        );
        setCategories((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save category');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      await adminService.deleteCategory(catId, token);
      setCategories((prev) => prev.filter((c) => c.id !== catId));
    } catch (err: any) {
      alert(err.message || 'Could not delete category. Ensure no menu items are assigned to it.');
    }
  };

  return (
    <AdminLayout
      title="Category Management"
      subtitle="Organize Restaurant Menu Structure & Catalog Hierarchy"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchCategories}
      isRefreshing={refreshing}
    >
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs text-slate-500">
          Categories define the tabs and filter groups presented to guests on the QR digital menu.
        </p>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Dishes Count</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    No categories found. Click &quot;Add New Category&quot; to begin.
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => (
                  <tr key={cat.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-500 text-[11px]">
                      #{cat.order ?? idx + 1}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-sm truncate">
                      {cat.description || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {cat._count?.menuItems || cat.itemsCount || 0} items
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                          title="Edit Category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat.id, cat.name)}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Create/Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-2 rounded bg-rose-50 text-rose-700 text-xs flex items-center gap-1.5 border border-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Appetizers, Steaks & Grills, Desserts"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short tagline or notes"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={orderIndex}
                  onChange={(e) => setOrderIndex(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
