'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  UtensilsCrossed,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
  X,
  TrendingUp,
  Boxes,
  DollarSign,
  Layers,
  Sparkles,
  ToggleLeft,
  ToggleRight,
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
  const [price, setPrice] = useState<number>(1000);
  const [costPrice, setCostPrice] = useState<number>(400);
  const [stockCount, setStockCount] = useState<number>(50);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(10);
  const [prepTimeMin, setPrepTimeMin] = useState<number>(15);
  const [prepTimeMax, setPrepTimeMax] = useState<number>(25);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [badge, setBadge] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
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
  }, [restaurantId, token, selectedCategory, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const currentMargin = price > 0 ? Math.round(((price - costPrice) / price) * 100) : 0;

  return (
    <AdminLayout
      title="Menu Catalog Management"
      subtitle="Dish Pricing, Unit Cost Margins, Stock Availability & Categories"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Top Filter & Search Toolbar (Section 17) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Pills & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-3 flex-1">
          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/80 transition"
            />
          </div>

          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-200 font-semibold focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Add New Dish CTA */}
        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-md shadow-amber-950/40 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Menu Items Table (Visual Hierarchy: Name -> Category -> Price -> Stock -> Availability -> Actions) */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-white">
              Catalog Items ({menuItems.length})
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500">Live PostgreSQL Catalog</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
            <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="py-3.5 px-4">Dish Name</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4 text-right">Selling Price</th>
                <th className="py-3.5 px-4 text-right">Cost / Margin</th>
                <th className="py-3.5 px-4 text-center">Stock Count</th>
                <th className="py-3.5 px-4 text-center">Availability</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Loading menu catalog...
                  </td>
                </tr>
              ) : menuItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    No dishes found matching your criteria.
                  </td>
                </tr>
              ) : (
                menuItems.map((item) => {
                  const cost = item.costPrice ?? 0;
                  const margin = item.price > 0 ? Math.round(((item.price - cost) / item.price) * 100) : 0;
                  const isLow = item.stockCount !== null && item.stockCount <= (item.lowStockThreshold || 10);
                  const isOut = item.stockCount !== null && item.stockCount <= 0;

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      {/* Name & Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs">{item.name}</span>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-slate-400 max-w-xs truncate mt-0.5">
                            {item.description}
                          </p>
                        )}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category?.name || 'General'}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        Rs. {item.price?.toLocaleString()}
                      </td>

                      {/* Cost / Margin */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>Rs. {cost.toLocaleString()}</div>
                        <span className="text-[10px] text-emerald-400 font-bold">
                          {margin}% margin
                        </span>
                      </td>

                      {/* Stock Count */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {item.stockCount !== null ? (
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isOut
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                : isLow
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}
                          >
                            {isOut ? 'Out of Stock' : `${item.stockCount} left`}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic text-[11px]">Unlimited</span>
                        )}
                      </td>

                      {/* Availability Live Toggle */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleAvailability(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                            item.isAvailable
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                          }`}
                        >
                          {item.isAvailable ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3" />
                              <span>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                            title="Edit dish"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id, item.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition"
                            title="Delete dish"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
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

      {/* Add / Edit Dish Modal (Section 17 & 30) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingItem ? `Edit Dish: ${editingItem.name}` : 'Add New Catalog Dish'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-xs">
              {/* Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Dish Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Royal Chicken Biryani"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Category *</label>
                  <select
                    required
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-hidden focus:border-amber-500 cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ingredients, culinary notes, allergen warnings..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Price, Cost & Margin Preview */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-slate-300">Unit Economics & Margin</span>
                  <span className="font-bold text-emerald-400">
                    Gross Margin: {currentMargin}%
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Selling Price (Rs.) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-400 mb-1">Cost Price (COGS) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={costPrice}
                      onChange={(e) => setCostPrice(Number(e.target.value))}
                      className="w-full p-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Count & Low Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Available Stock Count</label>
                  <input
                    type="number"
                    min={0}
                    value={stockCount}
                    onChange={(e) => setStockCount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Deducted on every order</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Low-Stock Alert Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Triggers dashboard warning</span>
                </div>
              </div>

              {/* Badge & Kitchen Prep Time */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Badge</label>
                  <input
                    type="text"
                    value={badge}
                    onChange={(e) => setBadge(e.target.value)}
                    placeholder="e.g. Popular"
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Prep Min</label>
                  <input
                    type="number"
                    value={prepTimeMin}
                    onChange={(e) => setPrepTimeMin(Number(e.target.value))}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Prep Max</label>
                  <input
                    type="number"
                    value={prepTimeMax}
                    onChange={(e) => setPrepTimeMax(Number(e.target.value))}
                    className="w-full p-2 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-0"
                  />
                  <span className="font-semibold text-white">Visible on Customer QR Menu</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFeatured}
                    onChange={(e) => setIsFeatured(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-amber-600 focus:ring-0"
                  />
                  <span className="font-semibold text-white">Feature in Recommendations</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition shadow-md shadow-amber-950/40 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingItem ? 'Update Dish' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
