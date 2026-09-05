'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  TrendingUp,
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

  const fetchData = useCallback(async () => {
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
  }, [restaurantId, token, selectedStatus, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      setReason(`Automated replenishment (+${suggestedQty} units)`);
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

  const healthyCount = inventory.filter((i) => i.status === 'IN_STOCK').length;
  const lowStockCount = inventory.filter((i) => i.status === 'LOW_STOCK').length;
  const outOfStockCount = inventory.filter((i) => i.status === 'OUT_OF_STOCK').length;

  return (
    <AdminLayout
      title="Inventory & Stock Health"
      subtitle="Real-Time Stock Depletions, Minimum Thresholds & Automated Replenishment"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER, UserRole.CHEF]}
      onRefresh={fetchData}
      isRefreshing={refreshing}
    >
      {/* Top Warning Banner if any low stock (Section 19) */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 flex items-center justify-between shadow-xl backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-600 text-white shrink-0 shadow-lg shadow-rose-950/50">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                Restock Action Required
              </h3>
              <p className="text-xs text-rose-300/80 mt-0.5 font-medium">
                {outOfStockCount} item(s) out of stock • {lowStockCount} item(s) below low-stock threshold.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStatus('LOW_STOCK')}
            className="text-xs font-bold text-rose-300 hover:text-white underline transition"
          >
            View Low Stock →
          </button>
        </div>
      )}

      {/* Stock Health KPI Cards (Section 18) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Tracked Items
          </span>
          <div className="text-2xl font-black text-white mt-1">
            {inventory.length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Total inventory SKUs</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
            Healthy Stock
          </span>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {healthyCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Above safety thresholds</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
            Low Stock Alerts
          </span>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {lowStockCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires replenishment</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
            Out of Stock
          </span>
          <div className="text-2xl font-black text-rose-400 mt-1">
            {outOfStockCount}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dishes auto-hidden</p>
        </div>
      </div>

      {/* View Tabs & Filter Bar */}
      <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-4 shadow-xl backdrop-blur-sm mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Main View Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ITEMS')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'ITEMS'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              <Boxes className="w-3.5 h-3.5 text-amber-400" />
              <span>Stock Ledger ({inventory.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('INTELLIGENCE')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'INTELLIGENCE'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Velocity Intelligence</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                activeTab === 'HISTORY'
                  ? 'bg-slate-800 text-white border border-slate-700 shadow-xs'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/80'
              }`}
            >
              <History className="w-3.5 h-3.5 text-blue-400" />
              <span>Movement History ({historyLogs.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
            />
          </div>
        </div>

        {/* Status Pills */}
        {activeTab === 'ITEMS' && (
          <div className="flex items-center gap-1.5 pt-3 border-t border-slate-800/80 overflow-x-auto">
            {STATUS_FILTERS.map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                  selectedStatus === st
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800/60'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Tab 1: Stock Ledger Table (Section 18) */}
      {activeTab === 'ITEMS' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3.5 px-4">Item Details</th>
                  <th className="py-3.5 px-4">Stock Level</th>
                  <th className="py-3.5 px-4 text-center">Threshold</th>
                  <th className="py-3.5 px-4">Stock Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  inventory.map((item) => {
                    const threshold = item.lowStockThreshold || 10;
                    const maxStock = Math.max(item.stockCount, threshold * 2, 20);
                    const pct = Math.min(100, Math.round((item.stockCount / maxStock) * 100));

                    return (
                      <tr key={item.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs">{item.name}</div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            SKU: {item.menuItemId.slice(0, 8)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-white w-8">
                              {item.stockCount}
                            </span>
                            <div className="w-28 bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                style={{ width: `${pct}%` }}
                                className={`h-full rounded-full transition-all ${
                                  item.status === 'OUT_OF_STOCK'
                                    ? 'bg-rose-500'
                                    : item.status === 'LOW_STOCK'
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              setThresholdModalItem(item);
                              setThresholdVal(item.lowStockThreshold || 10);
                            }}
                            className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-semibold hover:text-amber-400 hover:bg-slate-700 transition"
                            title="Click to edit warning threshold"
                          >
                            {item.lowStockThreshold || 10} units
                          </button>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              item.status === 'OUT_OF_STOCK'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : item.status === 'LOW_STOCK'
                                ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.status === 'IN_STOCK' ? 'Healthy Stock' : item.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustModalItem(item);
                              setAdjustmentType('INCREASE');
                              setQuantity(10);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition shadow-xs"
                          >
                            <span>Adjust</span>
                          </button>
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

      {/* Tab 2: Velocity Intelligence */}
      {activeTab === 'INTELLIGENCE' && intelligence && (
        <div className="space-y-6">
          {/* Reorder Recommendations */}
          <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl p-5 shadow-xl backdrop-blur-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Automated Reorder Recommendations ({intelligence.reorderRecommendations?.length || 0})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {intelligence.reorderRecommendations?.map((rec: any) => (
                <div key={rec.menuItemId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{rec.name}</span>
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-400">
                        {rec.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Current: {rec.currentStock} • Daily Velocity: {rec.dailyVelocity} units
                    </p>
                    <p className="text-[11px] text-rose-400 mt-0.5 font-medium">
                      Estimated stockout in: {rec.estimatedDaysRemaining} days
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickRestock(rec.menuItemId, rec.suggestedReorderQuantity)}
                    className="mt-3 w-full py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-xs font-bold transition shadow-xs"
                  >
                    Replenish +{rec.suggestedReorderQuantity} Units
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Movement History Logs */}
      {activeTab === 'HISTORY' && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 divide-y divide-slate-800/80">
              <thead className="bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4 text-center">Change</th>
                  <th className="py-3 px-4 text-center">Final Stock</th>
                  <th className="py-3 px-4">Reason / Initiator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {historyLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500 text-xs">
                      No stock movement audit records yet.
                    </td>
                  </tr>
                ) : (
                  historyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        {log.name || 'Menu Item'}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={log.change > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                          {log.change > 0 ? `+${log.change}` : log.change}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-200">
                        {log.finalStock}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {log.reason || 'Order deduction / manual adjustment'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal (Section 31) */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Adjust Stock: {adjustModalItem.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">Current Balance: {adjustModalItem.stockCount} units</p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalItem(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="mt-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1.5">Adjustment Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['INCREASE', 'DECREASE', 'SET'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAdjustmentType(mode)}
                      className={`py-2 rounded-lg font-bold text-xs transition ${
                        adjustmentType === mode
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-950 text-slate-400 border border-slate-800'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Audit Log Reason</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Supplier delivery, Wastage deduction"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setAdjustModalItem(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Updating...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {thresholdModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white">Update Low-Stock Threshold</h3>
            <p className="text-xs text-slate-400 mt-1">Item: {thresholdModalItem.name}</p>

            <form onSubmit={handleUpdateThreshold} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Warning Threshold (Units)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={thresholdVal}
                  onChange={(e) => setThresholdVal(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setThresholdModalItem(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-amber-600 text-white rounded-lg font-bold shadow-md"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
