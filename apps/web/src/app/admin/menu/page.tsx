'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  UtensilsCrossed,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  TrendingUp,
  Boxes,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { MenuItem, UserRole } from '@qr-menu/shared';

export default function AdminMenuPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [costPrice, setCostPrice] = useState<number>(0);
  const [stockCount, setStockCount] = useState<number>(50);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [prepTimeMin, setPrepTimeMin] = useState<number>(15);
  const [prepTimeMax, setPrepTimeMax] = useState<number>(25);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [badge, setBadge] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [items, cats] = await Promise.all([
        adminService.getMenuItems(
          restaurantId,
          {
            categoryId: selectedCategory === 'ALL' ? undefined : selectedCategory,
            search: searchQuery || undefined,
          },
          token
        ),
        adminService.getCategories(restaurantId, token),
      ]);
      setMenuItems(items || []);
      setCategories(cats || []);
    } catch (err) {
      console.warn('[AdminMenu] Failed to fetch menu data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token, selectedCategory]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setName('');
    setCategoryId(categories[0]?.id || '');
    setDescription('');
    setPrice(1000);
    setCostPrice(400);
    setStockCount(50);
    setLowStockThreshold(10);
    setPrepTimeMin(15);
    setPrepTimeMax(25);
    setIsAvailable(true);
    setIsFeatured(false);
    setBadge('');
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setName(item.name);
    setCategoryId(item.categoryId);
    setDescription(item.description || '');
    setPrice(item.price);
    setCostPrice(item.costPrice ?? 0);
    setStockCount(item.stockCount ?? 50);
    setLowStockThreshold(item.lowStockThreshold ?? 10);
    setPrepTimeMin(item.prepTimeMin ?? 15);
    setPrepTimeMax(item.prepTimeMax ?? 25);
    setIsAvailable(item.isAvailable ?? true);
    setIsFeatured(item.isFeatured ?? false);
    setBadge(item.badge || '');
    setFormError('');
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      const payload = {
        restaurantId,
        categoryId,
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        costPrice: Number(costPrice),
        stockCount: Number(stockCount),
        lowStockThreshold: Number(lowStockThreshold),
        prepTimeMin: Number(prepTimeMin),
        prepTimeMax: Number(prepTimeMax),
        isAvailable,
        isFeatured,
        badge: badge.trim() || undefined,
      };

      if (editingItem) {
        const updated = await adminService.updateMenuItem(editingItem.id, payload, token);
        setMenuItems((prev) => prev.map((i) => (i.id === editingItem.id ? { ...i, ...updated } : i)));
      } else {
        const created = await adminService.createMenuItem(payload, token);
        setMenuItems((prev) => [...prev, created]);
      }
      setModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save menu item');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item: any) => {
    if (!token) return;
    try {
      const nextVal = !item.isAvailable;
      await adminService.updateMenuItem(item.id, { isAvailable: nextVal }, token);
      setMenuItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isAvailable: nextVal } : i))
      );
    } catch (err) {
      console.error('[AdminMenu] Failed to toggle availability', err);
    }
  };

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete or deactivate "${itemName}"?`)) return;

    try {
      await adminService.deleteMenuItem(itemId, token);
      setMenuItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete dish');
    }
  };

  return (
    <AdminLayout
      title="Menu Items Management"
      subtitle="Catalog Pricing, Cost of Goods & Stock Availability"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Top Filter & Search */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 font-semibold focus:outline-hidden focus:border-slate-900"
          >
            <option value="ALL">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Search Box */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchData()}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Menu Items Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Dish Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Price</th>
                <th className="py-3 px-4 text-right">Cost</th>
                <th className="py-3 px-4 text-right">Profit / Margin</th>
                <th className="py-3 px-4">Stock Status</th>
                <th className="py-3 px-4">Available</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {menuItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                    No menu items found. Click &quot;Add New Dish&quot; to expand your culinary menu.
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => {
                  const profit = item.price - (item.costPrice || 0);
                  const margin = item.price > 0 ? ((profit / item.price) * 100).toFixed(0) : 0;
                  const stock = item.stockCount ?? 0;
                  const threshold = item.lowStockThreshold ?? 10;
                  const isLow = stock <= threshold && stock > 0;
                  const isOut = stock <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[11px] text-slate-500 max-w-xs truncate">
                          {item.description || 'No description provided'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {item.category?.name || item.categoryName || 'General'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        Rs. {item.price.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-500">
                        Rs. {(item.costPrice || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">
                        <span className="text-emerald-700 font-bold block">
                          +Rs. {profit.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{margin}% margin</span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {stock} portions ({isOut ? 'OUT' : isLow ? 'LOW' : 'OK'})
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border transition ${
                            item.isAvailable
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                              : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {item.isAvailable ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                            title="Edit Dish"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                            title="Delete Dish"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dish Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingItem ? 'Edit Menu Item' : 'Create New Menu Item'}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Dish Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Wagyu Beef Tenderloin"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900 font-semibold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description & Ingredients
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fresh grilled Angus cut served with truffle mash..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cost Price (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Count
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={stockCount}
                    onChange={(e) => setStockCount(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Low Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono focus:outline-hidden focus:border-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prep Time (Mins)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="1"
                      value={prepTimeMin}
                      onChange={(e) => setPrepTimeMin(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono"
                      placeholder="Min"
                    />
                    <span className="text-slate-400 text-xs">-</span>
                    <input
                      type="number"
                      min="1"
                      value={prepTimeMax}
                      onChange={(e) => setPrepTimeMax(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono"
                      placeholder="Max"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Badge / Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Chef's Special, Spicy"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">Available on Menu</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-0"
                  />
                  <span className="text-xs font-semibold text-slate-700">Featured Dish</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
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
                  {isSubmitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
