'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Minus,
  Search,
  ShoppingCart,
  Check,
  Loader2,
  Utensils,
  User,
  Users,
} from 'lucide-react';
import { waiterService } from '../../../services/waiter.service';
import { apiClient } from '../../../lib/api-client';

interface WalkInOrderModalProps {
  isOpen: boolean;
  tableId?: string;
  tableNumber?: string;
  restaurantId: string;
  token: string | null;
  tables: Array<{ id: string; tableNumber: string; status: string }>;
  onClose: () => void;
  onSuccess: (order: any) => void;
}

export function WalkInOrderModal({
  isOpen,
  tableId: initialTableId,
  tableNumber: initialTableNumber,
  restaurantId,
  token,
  tables,
  onClose,
  onSuccess,
}: WalkInOrderModalProps) {
  const [selectedTableId, setSelectedTableId] = useState(initialTableId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [guestsCount, setGuestsCount] = useState<number>(2);
  const [notes, setNotes] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<Array<{ item: any; quantity: number; instructions?: string }>>([]);

  const [loadingMenu, setLoadingMenu] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialTableId) setSelectedTableId(initialTableId);
  }, [initialTableId]);

  useEffect(() => {
    if (!isOpen || !restaurantId) return;

    const fetchMenu = async () => {
      try {
        setLoadingMenu(true);
        const [cats, items] = await Promise.all([
          apiClient.get<any[]>(`/api/menu/categories?restaurantId=${restaurantId}`).catch(() => []),
          apiClient.get<any[]>(`/api/menu/items?restaurantId=${restaurantId}`).catch(() => []),
        ]);
        setCategories(cats || []);
        setMenuItems(items || []);
      } catch (err: any) {
        console.error('Could not load menu items', err);
      } finally {
        setLoadingMenu(false);
      }
    };

    fetchMenu();
  }, [isOpen, restaurantId]);

  if (!isOpen) return null;

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.item.id === item.id);
      if (existing) {
        return prev.map((i) => (i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((i) => {
          if (i.item.id === itemId) {
            const newQ = i.quantity + delta;
            return newQ > 0 ? { ...i, quantity: newQ } : null;
          }
          return i;
        })
        .filter(Boolean) as any;
    });
  };

  const subtotal = cart.reduce((sum, i) => sum + i.item.price * i.quantity, 0);
  const TAX_RATE = 0.08;
  const SERVICE_CHARGE = 5.0;
  const tax = parseFloat((subtotal * TAX_RATE).toFixed(2));
  const total = parseFloat((subtotal + tax + (subtotal > 0 ? SERVICE_CHARGE : 0)).toFixed(2));

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = selectedCategory === 'ALL' || item.categoryId === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTableId) {
      setError('Please select a dining table');
      return;
    }
    if (cart.length === 0) {
      setError('Please add at least one dish to the order');
      return;
    }
    if (!token) {
      setError('Authentication token missing');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        restaurantId,
        tableId: selectedTableId,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        guestsCount,
        notes: notes.trim() || undefined,
        items: cart.map((c) => ({
          menuItemId: c.item.id,
          quantity: c.quantity,
          specialInstructions: c.instructions,
        })),
      };

      const newOrder = await waiterService.createWalkInOrder(payload, token);
      onSuccess(newOrder);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-5xl h-[90vh] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/80 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-wide">
                + Create Walk-in Table Order
              </h2>
              <p className="text-xs text-slate-400">Add dishes, set customer notes, and send ticket to KDS</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: 2 Columns (Menu on Left, Cart/Settings on Right) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Column: Menu Browsing (65%) */}
          <div className="flex-[3] flex flex-col border-r border-slate-800 p-5 overflow-hidden">
            {/* Search & Category Filter Bar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search dishes by name..."
                  className="w-full bg-slate-950 border border-slate-800 text-xs rounded-xl pl-9 pr-3 py-2 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[320px]">
                <button
                  onClick={() => setSelectedCategory('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === 'ALL'
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                  }`}
                >
                  All
                </button>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedCategory === c.id
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingMenu ? (
                <div className="h-full flex items-center justify-center text-slate-400 gap-2 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Loading menu dishes...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
                  <Utensils className="w-8 h-8 stroke-1 mb-2 opacity-40" />
                  <p>No dishes found matching selection.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredItems.map((item) => {
                    const inCart = cart.find((c) => c.item.id === item.id);
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between hover:border-amber-500/40 transition-all group"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-1 mb-1">
                            <h4 className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                              {item.name}
                            </h4>
                            {item.stockCount !== null && item.stockCount <= 5 && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded font-semibold border border-rose-500/30 whitespace-nowrap">
                                {item.stockCount} left
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {item.description || 'Delicious freshly prepared specialty.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-850">
                          <span className="text-xs font-bold text-amber-400 font-mono">
                            Rs. {item.price.toLocaleString()}
                          </span>

                          {inCart ? (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg p-0.5">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-amber-400 px-1 font-mono">
                                {inCart.quantity}
                              </span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-5 h-5 rounded flex items-center justify-center bg-amber-500 hover:bg-amber-400 text-slate-950"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              disabled={!item.isAvailable || item.stockCount === 0}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 transition-colors flex items-center gap-1 active:scale-95"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Order Cart & Seating Details (35%) */}
          <div className="flex-[2] flex flex-col bg-slate-950/60 p-5 overflow-y-auto">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Table & Seating Details</span>
            </h3>

            {/* Seating Form */}
            <div className="space-y-3 mb-4 text-xs">
              {/* Table Selection */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Select Table *</label>
                <select
                  value={selectedTableId}
                  onChange={(e) => setSelectedTableId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60"
                >
                  <option value="">-- Choose Dining Table --</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer Info (Optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Guest Name</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Mr. Tariq"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Phone</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0300-1234567"
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60"
                  />
                </div>
              </div>

              {/* Guest Count */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Number of Guests</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setGuestsCount(count)}
                      className={`flex-1 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        guestsCount === count
                          ? 'bg-amber-500 text-slate-950 border-amber-500'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Special Notes */}
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Order Notes / Kitchen Instructions</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Less spicy, serve drinks first"
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>

            {/* Cart Items Ledger */}
            <div className="flex-1 border-t border-slate-800 pt-3 flex flex-col">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                <span>Selected Dishes ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] text-rose-400 hover:underline"
                  >
                    Clear Cart
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[160px]">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-4">
                    No dishes selected yet. Click dishes on the left to add.
                  </p>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-xs"
                    >
                      <div className="truncate pr-2">
                        <p className="font-semibold text-white truncate">{item.item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Rs. {item.item.price} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={() => updateQuantity(item.item.id, -1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs px-1 font-mono text-amber-400">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.item)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Summary */}
              <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal</span>
                  <span className="font-mono text-slate-200">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tax (8%)</span>
                  <span className="font-mono text-slate-200">Rs. {tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Service Charge</span>
                  <span className="font-mono text-slate-200">Rs. {subtotal > 0 ? SERVICE_CHARGE : 0}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-white pt-1.5 border-t border-slate-800">
                  <span>Total Amount</span>
                  <span className="font-mono text-amber-400">PKR {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Error Warning */}
              {error && (
                <div className="mt-2 text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 p-2 rounded-xl">
                  {error}
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handleSubmit}
                disabled={submitting || cart.length === 0}
                className="mt-4 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:hover:bg-amber-500 text-slate-950 font-bold text-xs tracking-wide shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Placing Walk-in Order...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Send Order to Kitchen</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
