'use client';

import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Plus,
  Minus,
  Edit,
  History,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  ShieldCheck,
  X,
  Sparkles,
  DollarSign,
  Flame,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { InventoryItemSummary, InventoryIntelligenceResult, UserRole } from '@qr-menu/shared';

const STATUS_FILTERS = ['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];

export default function AdminInventoryPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [inventory, setInventory] = useState<InventoryItemSummary[]>([]);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [intelligence, setIntelligence] = useState<InventoryIntelligenceResult | null>(null);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'INTELLIGENCE' | 'HISTORY'>('ITEMS');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Stock Adjustment Modal
  const [adjustModalItem, setAdjustModalItem] = useState<InventoryItemSummary | null>(null);
  const [adjustmentType, setAdjustmentType] = useState<'SET' | 'INCREASE' | 'DECREASE'>('INCREASE');
  const [quantity, setQuantity] = useState<number>(10);
  const [reason, setReason] = useState('Restocked shipment from supplier');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Threshold Modal
  const [thresholdModalItem, setThresholdModalItem] = useState<InventoryItemSummary | null>(null);
  const [thresholdVal, setThresholdVal] = useState<number>(10);

  const fetchData = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [invData, histData, intelData] = await Promise.all([
        adminService.getInventory(
          restaurantId,
          {
            status: selectedStatus === 'ALL' ? undefined : selectedStatus,
            search: searchQuery || undefined,
          },
          token
        ),
        adminService.getInventoryHistory(restaurantId, token),
        adminService.getInventoryIntelligence(restaurantId, token).catch(() => null),
      ]);
      setInventory(invData || []);
      setHistoryLogs(histData || []);
      setIntelligence(intelData);
    } catch (err) {
      console.warn('[AdminInventory] Failed to fetch inventory data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [restaurantId, token, selectedStatus]);

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !adjustModalItem) return;
    setIsSubmitting(true);

    try {
      await adminService.adjustStock(
        adjustModalItem.menuItemId,
        {
          menuItemId: adjustModalItem.menuItemId,
          adjustmentType,
          quantity: Number(quantity),
          reason,
        },
        token
      );
      setAdjustModalItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickRestock = (menuItemId: string, suggestedQty: number) => {
    const item = inventory.find((i) => i.menuItemId === menuItemId);
    if (item) {
      setAdjustModalItem(item);
      setAdjustmentType('INCREASE');
      setQuantity(suggestedQty);
      setReason(`Suggested automated replenishment (+${suggestedQty} units)`);
    }
  };

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !thresholdModalItem) return;
    setIsSubmitting(true);

    try {
      await adminService.updateLowStockThreshold(
        thresholdModalItem.menuItemId,
        Number(thresholdVal),
        token
      );
      setThresholdModalItem(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update threshold');
    } finally {
      setIsSubmitting(false);
    }
  };

  const lowStockCount = inventory.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStockCount = inventory.filter((i) => i.status === 'OUT_OF_STOCK').length;

  return (
    <AdminLayout
      title="Inventory & Stock Control"
      subtitle="Atomic Stock Deductions, Minimum Thresholds & Phase 4 Velocity Intelligence"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Top Warning Banner if any low stock */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mb-6 p-4 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-rose-600 text-white shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wide">
                Replenishment Action Required
              </h3>
              <p className="text-xs text-rose-800 mt-0.5">
                {outOfStockCount} item(s) out of stock • {lowStockCount} item(s) below warning threshold.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatus('LOW_STOCK')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline"
          >
            View Low Stock →
          </button>
        </div>
      )}

      {/* View Tabs & Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main View Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'ITEMS'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Stock List ({inventory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INTELLIGENCE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'INTELLIGENCE'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Inventory Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History ({historyLogs.length})</span>
            </button>
          </div>

          {/* Search Box */}
          {activeTab === 'ITEMS' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                placeholder="Search dish or ingredient..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
              />
            </div>
          )}
        </div>

        {/* Status Filters when on ITEMS tab */}
        {activeTab === 'ITEMS' && (
          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Status:
            </span>
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                  selectedStatus === st
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── TAB 1: ITEMS STOCK TABLE ── */}
      {activeTab === 'ITEMS' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Menu Item & Category</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-right">Cost (COGS)</th>
                  <th className="py-3 px-4 text-right">Current Stock</th>
                  <th className="py-3 px-4 text-right">Min Threshold</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <Boxes className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const isLow = item.status === 'LOW_STOCK';
                    const isOut = item.status === 'OUT_OF_STOCK';

                    return (
                      <tr key={item.menuItemId} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-[10px] text-slate-500 font-normal">
                            {item.categoryName}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-medium text-slate-700">
                          Rs. {item.price.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          Rs. {item.costPrice.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-sm">
                          <span
                            className={
                              isOut
                                ? 'text-rose-700'
                                : isLow
                                ? 'text-amber-700'
                                : 'text-slate-900'
                            }
                          >
                            {item.stockCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              setThresholdModalItem(item);
                              setThresholdVal(item.lowStockThreshold);
                            }}
                            className="hover:underline text-slate-700 font-semibold"
                            title="Click to edit threshold"
                          >
                            {item.lowStockThreshold} ✎
                          </button>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                              isOut
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : isLow
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            {isOut ? (
                              <XCircle className="w-3 h-3" />
                            ) : isLow ? (
                              <AlertTriangle className="w-3 h-3" />
                            ) : (
                              <CheckCircle2 className="w-3 h-3" />
                            )}
                            {item.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalItem(item);
                                setAdjustmentType('INCREASE');
                                setQuantity(10);
                                setReason('Shipment restocked');
                              }}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition"
                            >
                              + Restock
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAdjustModalItem(item);
                                setAdjustmentType('DECREASE');
                                setQuantity(1);
                                setReason('Kitchen wastage / Spoilage');
                              }}
                              className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition"
                            >
                              - Waste
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
      )}

      {/* ── TAB 2: INVENTORY INTELLIGENCE (PHASE 4) ── */}
      {activeTab === 'INTELLIGENCE' && intelligence && (
        <div className="space-y-6">
          {/* Top Valuation KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Total Stock Valuation
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
                Rs. {intelligence.totalInventoryValuation.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Capital invested in current inventory</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Dead / Slow Stock Value
              </span>
              <div className="text-2xl font-black text-amber-700 mt-1 font-mono">
                Rs. {intelligence.deadStockValue.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Tied-up capital with low sales velocity</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Items Requiring Reorder
              </span>
              <div className="text-2xl font-black text-rose-700 mt-1 font-mono">
                {intelligence.reorderRecommendations.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">At risk of depletion within 4 days</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                High Velocity Items
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">
                {intelligence.fastMovingItems.length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Top recurring ingredient consumption</p>
            </div>
          </div>

          {/* Reorder Recommendations Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Automated Reorder & Replenishment Recommendations
                </h3>
                <p className="text-[11px] text-slate-500">
                  Based on 30-day order consumption velocities and safe lead times
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-2.5 px-3">Item Name</th>
                    <th className="py-2.5 px-3 text-right">Current Stock</th>
                    <th className="py-2.5 px-3 text-right">Recommended Reorder</th>
                    <th className="py-2.5 px-3">Urgency</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {intelligence.reorderRecommendations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                        All stock levels are optimal. No reorders needed at this time.
                      </td>
                    </tr>
                  ) : (
                    intelligence.reorderRecommendations.map((rec) => (
                      <tr key={rec.menuItemId} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{rec.name}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold">{rec.currentStock}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          +{rec.recommendedReorderQty} units
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              rec.urgency === 'CRITICAL'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : rec.urgency === 'SOON'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {rec.urgency}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => handleQuickRestock(rec.menuItemId, rec.recommendedReorderQty)}
                            className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white font-bold text-[11px] transition"
                          >
                            1-Click Restock
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fast vs Slow Moving Two-Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fast Moving */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                <Flame className="w-4 h-4 text-emerald-600" />
                <span className="uppercase tracking-wider">Fast-Moving High Velocity Dishes</span>
              </div>
              <div className="space-y-2">
                {intelligence.fastMovingItems.map((item) => (
                  <div key={item.menuItemId} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.categoryName} • Velocity: ~{item.dailyVelocity} units/day</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-slate-800">{item.currentStock} in stock</div>
                      <div className="text-[10px] text-slate-500">~{item.daysOfStockLeft} days left</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slow Moving */}
            <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 pb-2 border-b border-slate-100">
                <Clock className="w-4 h-4 text-amber-600" />
                <span className="uppercase tracking-wider">Slow-Moving & Dead Stock Risk</span>
              </div>
              <div className="space-y-2">
                {intelligence.slowMovingItems.map((item) => (
                  <div key={item.menuItemId} className="p-2.5 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{item.name}</div>
                      <div className="text-[10px] text-slate-500">{item.categoryName} • {item.daysWithoutSale} days since last sale</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-amber-700">Rs. {item.tiedUpCapital.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">tied-up capital</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: AUDIT HISTORY LOGS ── */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      No inventory audit logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {log.staffName}
                        <span className="block text-[10px] text-slate-500 font-normal">
                          {log.staffRole}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-800">
                        {log.action}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODAL: Adjust Stock ── */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Adjust Inventory Stock</h3>
            <p className="text-xs text-slate-500 mb-4">
              Item: <strong>{adjustModalItem.name}</strong> • Current Stock: {adjustModalItem.stockCount}
            </p>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adjustment Operation
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['INCREASE', 'DECREASE', 'SET'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAdjustmentType(type)}
                      className={`py-1.5 rounded text-xs font-bold transition border ${
                        adjustmentType === type
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {type === 'INCREASE' ? '+ Add' : type === 'DECREASE' ? '- Waste' : '= Set'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason / Audit Reference
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Shipment arrival, Spoilage, Physical recount"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Update Threshold ── */}
      {thresholdModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Edit Low Stock Warning Threshold</h3>
            <p className="text-xs text-slate-500 mb-4">
              Item: <strong>{thresholdModalItem.name}</strong>
            </p>

            <form onSubmit={handleUpdateThreshold} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Threshold Count
                </label>
                <input
                  type="number"
                  min="1"
                  value={thresholdVal}
                  onChange={(e) => setThresholdVal(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Item will be flagged as LOW_STOCK whenever available stock falls to or below this number.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setThresholdModalItem(null)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Update Threshold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
