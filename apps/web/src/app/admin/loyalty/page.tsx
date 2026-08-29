'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Gift,
  Users,
  Award,
  Sparkles,
  Search,
  Plus,
  Edit2,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Coins,
  Shield,
  Clock,
  Tag,
  Percent,
  DollarSign,
  Utensils,
  ChevronRight,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import {
  LoyaltyAccount,
  Reward,
  CustomerTier,
  RewardType,
  CreateRewardInput,
  UpdateRewardInput,
  MenuItem,
  UserRole,
} from '@qr-menu/shared';

const TIER_COLORS: Record<CustomerTier, { bg: string; text: string; border: string }> = {
  BRONZE: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  SILVER: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  GOLD: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-300' },
  PLATINUM: { bg: 'bg-purple-50', text: 'text-purple-800', border: 'border-purple-200' },
};

export default function AdminLoyaltyPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'REWARDS'>('MEMBERS');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Members state
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [summary, setSummary] = useState<{ totalMembers: number; totalPointsCirculating: number; tierBreakdown: Record<string, number> }>({
    totalMembers: 0,
    totalPointsCirculating: 0,
    tierBreakdown: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('ALL');

  // Rewards state
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  // Modals
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<LoyaltyAccount | null>(null);
  const [adjustPoints, setAdjustPoints] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('Customer courtesy adjustment');
  const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false);

  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [rewardName, setRewardName] = useState('');
  const [rewardDescription, setRewardDescription] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('DISCOUNT_PERCENT');
  const [rewardValue, setRewardValue] = useState<number>(10);
  const [rewardMenuItemId, setRewardMenuItemId] = useState<string>('');
  const [rewardPointsCost, setRewardPointsCost] = useState<number>(200);
  const [rewardMinOrder, setRewardMinOrder] = useState<number>(0);
  const [rewardExpiryDays, setRewardExpiryDays] = useState<number>(30);
  const [rewardIsActive, setRewardIsActive] = useState<boolean>(true);
  const [isSubmittingReward, setIsSubmittingReward] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [loyaltyData, rewardsData, menuData] = await Promise.all([
        adminService.getLoyaltyAccounts(
          restaurantId,
          {
            search: searchQuery || undefined,
            tier: selectedTier === 'ALL' ? undefined : selectedTier,
          },
          token
        ),
        adminService.getRewards(restaurantId, token),
        adminService.getMenuItems(restaurantId, token),
      ]);

      setAccounts(loyaltyData.accounts || []);
      setSummary(loyaltyData.summary || {
        totalMembers: 0,
        totalPointsCirculating: 0,
        tierBreakdown: { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 },
      });
      setRewards(rewardsData || []);
      setMenuItems(menuData || []);
    } catch (err) {
      console.warn('[AdminLoyalty] Failed to fetch data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, searchQuery, selectedTier]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Adjust Points
  const handleOpenAdjust = (acc: LoyaltyAccount) => {
    setSelectedAccount(acc);
    setAdjustPoints(100);
    setAdjustReason('Customer courtesy adjustment');
    setAdjustModalOpen(true);
  };

  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedAccount) return;
    setIsSubmittingAdjust(true);
    try {
      await adminService.adjustLoyaltyPoints(
        selectedAccount.id,
        {
          points: Number(adjustPoints),
          description: adjustReason.trim(),
        },
        token
      );
      setAdjustModalOpen(false);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to adjust points');
    } finally {
      setIsSubmittingAdjust(false);
    }
  };

  // Reward Create / Edit
  const handleOpenCreateReward = () => {
    setEditingReward(null);
    setRewardName('');
    setRewardDescription('');
    setRewardType('DISCOUNT_PERCENT');
    setRewardValue(10);
    setRewardMenuItemId('');
    setRewardPointsCost(200);
    setRewardMinOrder(0);
    setRewardExpiryDays(30);
    setRewardIsActive(true);
    setFormError('');
    setRewardModalOpen(true);
  };

  const handleOpenEditReward = (r: Reward) => {
    setEditingReward(r);
    setRewardName(r.name);
    setRewardDescription(r.description || '');
    setRewardType(r.rewardType);
    setRewardValue(r.discountValue);
    setRewardMenuItemId(r.menuItemId || '');
    setRewardPointsCost(r.pointsCost);
    setRewardMinOrder(r.minOrderAmount);
    setRewardExpiryDays(r.expiryDays);
    setRewardIsActive(r.isActive);
    setFormError('');
    setRewardModalOpen(true);
  };

  const handleSubmitReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSubmittingReward(true);
    setFormError('');

    try {
      if (editingReward) {
        const payload: UpdateRewardInput = {
          name: rewardName.trim(),
          description: rewardDescription.trim() || undefined,
          rewardType,
          discountValue: Number(rewardValue),
          menuItemId: rewardType === 'FREE_ITEM' ? rewardMenuItemId : undefined,
          pointsCost: Number(rewardPointsCost),
          minOrderAmount: Number(rewardMinOrder),
          expiryDays: Number(rewardExpiryDays),
          isActive: rewardIsActive,
        };
        await adminService.updateReward(editingReward.id, payload, token);
      } else {
        const payload: CreateRewardInput & { restaurantId: string } = {
          restaurantId,
          name: rewardName.trim(),
          description: rewardDescription.trim() || undefined,
          rewardType,
          discountValue: Number(rewardValue),
          menuItemId: rewardType === 'FREE_ITEM' ? rewardMenuItemId : undefined,
          pointsCost: Number(rewardPointsCost),
          minOrderAmount: Number(rewardMinOrder),
          expiryDays: Number(rewardExpiryDays),
          isActive: rewardIsActive,
        };
        await adminService.createReward(payload, token);
      }
      setRewardModalOpen(false);
      fetchData();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save reward');
    } finally {
      setIsSubmittingReward(false);
    }
  };

  const handleDeleteReward = async (id: string, name: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete reward "${name}"?`)) return;
    try {
      await adminService.deleteReward(id, token);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete reward');
    }
  };

  return (
    <AdminLayout
      title="Customer Loyalty & Rewards"
      subtitle="Point Accruals, Tier Thresholds, and Redeemable Reward Vouchers"
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
          {/* ── Top Summary KPIs ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Total Members
                </span>
                <div className="p-1.5 rounded-md bg-slate-100 text-slate-700">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-slate-900 font-mono">
                {summary.totalMembers.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Registered customer accounts</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Active Points
                </span>
                <div className="p-1.5 rounded-md bg-amber-50 text-amber-700">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-amber-700 font-mono">
                {summary.totalPointsCirculating.toLocaleString()}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Available for customer redemption</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Active Rewards
                </span>
                <div className="p-1.5 rounded-md bg-purple-50 text-purple-700">
                  <Gift className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-purple-700 font-mono">
                {rewards.filter((r) => r.isActive).length}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Live in customer rewards catalog</p>
            </div>

            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  VIP Members (Gold+)
                </span>
                <div className="p-1.5 rounded-md bg-emerald-50 text-emerald-700">
                  <Award className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-emerald-700 font-mono">
                {(summary.tierBreakdown.GOLD || 0) + (summary.tierBreakdown.PLATINUM || 0)}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">High-frequency repeat diners</p>
            </div>
          </div>

          {/* ── Primary Navigation Tabs ── */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('MEMBERS')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                  activeTab === 'MEMBERS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Customer Members ({summary.totalMembers})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('REWARDS')}
                className={`px-4 py-2 rounded-md text-xs font-bold transition ${
                  activeTab === 'REWARDS'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rewards Catalog ({rewards.length})
              </button>
            </div>

            {activeTab === 'REWARDS' && (
              <button
                type="button"
                onClick={handleOpenCreateReward}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-md transition shadow-xs"
              >
                <Plus className="w-4 h-4" />
                Create Reward
              </button>
            )}
          </div>

          {/* ── TAB 1: MEMBERS ACCOUNTS ── */}
          {activeTab === 'MEMBERS' && (
            <div className="space-y-4">
              {/* Search & Tier Filter Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by phone number, customer name, or email..."
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                  />
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 mr-1">Tier:</span>
                  {['ALL', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTier(t)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition ${
                        selectedTier === t
                          ? 'bg-slate-800 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members Table */}
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Customer Details</th>
                        <th className="py-3 px-4">Tier Status</th>
                        <th className="py-3 px-4 text-right">Available Points</th>
                        <th className="py-3 px-4 text-right">Lifetime Points</th>
                        <th className="py-3 px-4">Enrolled Date</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {accounts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-10 text-center text-slate-400">
                            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="font-semibold text-xs text-slate-600">No loyalty accounts found</p>
                            <p className="text-[11px] mt-0.5">Customers are enrolled automatically when entering their phone at checkout</p>
                          </td>
                        </tr>
                      ) : (
                        accounts.map((acc) => {
                          const tierCfg = TIER_COLORS[acc.tier] || TIER_COLORS.BRONZE;
                          return (
                            <tr key={acc.id} className="hover:bg-slate-50">
                              <td className="py-3 px-4">
                                <div className="font-bold text-slate-900 font-mono">{acc.phone}</div>
                                {acc.customerName && (
                                  <div className="text-[11px] text-slate-600 font-medium">{acc.customerName}</div>
                                )}
                                {acc.email && (
                                  <div className="text-[10px] text-slate-400">{acc.email}</div>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}
                                >
                                  {acc.tier}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 text-sm">
                                {acc.pointsBalance.toLocaleString()} pts
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-slate-600">
                                {acc.lifetimePoints.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">
                                {new Date(acc.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleOpenAdjust(acc)}
                                  className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-[11px] border border-slate-200 transition"
                                >
                                  Adjust Points
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
            </div>
          )}

          {/* ── TAB 2: REWARDS CATALOG ── */}
          {activeTab === 'REWARDS' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="py-3 px-4">Reward Name & Benefit</th>
                        <th className="py-3 px-4">Reward Type</th>
                        <th className="py-3 px-4 text-right">Points Required</th>
                        <th className="py-3 px-4 text-right">Min. Order</th>
                        <th className="py-3 px-4">Expiry Window</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rewards.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400">
                            <Gift className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="font-semibold text-xs text-slate-600">No rewards configured</p>
                            <p className="text-[11px] mt-0.5">Create your first redeemable reward voucher above</p>
                          </td>
                        </tr>
                      ) : (
                        rewards.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{r.name}</div>
                              {r.description && (
                                <div className="text-[11px] text-slate-500 mt-0.5">{r.description}</div>
                              )}
                              {r.rewardType === 'FREE_ITEM' && (r as any).menuItem && (
                                <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                                  Free Item: {(r as any).menuItem.name} (Rs. {(r as any).menuItem.price})
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                                  r.rewardType === 'DISCOUNT_PERCENT'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : r.rewardType === 'DISCOUNT_FIXED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-purple-50 text-purple-700 border-purple-200'
                                }`}
                              >
                                {r.rewardType === 'DISCOUNT_PERCENT'
                                  ? `${r.discountValue}% OFF`
                                  : r.rewardType === 'DISCOUNT_FIXED'
                                  ? `Rs. ${r.discountValue} OFF`
                                  : 'FREE ITEM'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-amber-700 text-sm">
                              {r.pointsCost.toLocaleString()} pts
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-600">
                              {r.minOrderAmount > 0 ? `Rs. ${r.minOrderAmount.toLocaleString()}` : 'None'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                              {r.expiryDays} days
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  r.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {r.isActive ? 'ACTIVE' : 'DISABLED'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditReward(r)}
                                  className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 border border-slate-200 transition"
                                  title="Edit Reward"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReward(r.id, r.name)}
                                  className="p-1.5 rounded-md text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                                  title="Delete Reward"
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
            </div>
          )}

          {/* ── Modal: Manual Points Adjustment ── */}
          {adjustModalOpen && selectedAccount && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-1">Adjust Loyalty Points</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Account: <strong className="font-mono text-slate-700">{selectedAccount.phone}</strong> ({selectedAccount.tier} Tier)
                </p>

                <form onSubmit={handleSubmitAdjust} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Points Delta (+ for credit, - for deduction)
                    </label>
                    <input
                      type="number"
                      value={adjustPoints}
                      onChange={(e) => setAdjustPoints(Number(e.target.value))}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Current balance: {selectedAccount.pointsBalance} pts → New balance: {Math.max(0, selectedAccount.pointsBalance + Number(adjustPoints))} pts
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reason / Reference Note
                    </label>
                    <input
                      type="text"
                      value={adjustReason}
                      onChange={(e) => setAdjustReason(e.target.value)}
                      placeholder="e.g. Birthday gift, Courtesy adjustment"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setAdjustModalOpen(false)}
                      className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAdjust}
                      className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                    >
                      {isSubmittingAdjust ? 'Saving...' : 'Apply Points'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ── Modal: Create / Edit Reward ── */}
          {rewardModalOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto">
                <h3 className="text-sm font-bold text-slate-900 mb-1">
                  {editingReward ? 'Edit Reward Voucher' : 'Create New Reward Voucher'}
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Define points required and benefit details for customer redemption.
                </p>

                {formError && (
                  <div className="p-3 mb-4 rounded bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitReward} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Reward Name
                    </label>
                    <input
                      type="text"
                      value={rewardName}
                      onChange={(e) => setRewardName(e.target.value)}
                      placeholder="e.g. 15% Off Your Next Meal"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      rows={2}
                      placeholder="e.g. Valid on all dine-in orders above Rs. 1500"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Reward Type
                      </label>
                      <select
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value as RewardType)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                      >
                        <option value="DISCOUNT_PERCENT">Percentage Discount (%)</option>
                        <option value="DISCOUNT_FIXED">Fixed Amount Off (Rs.)</option>
                        <option value="FREE_ITEM">Free Menu Item</option>
                      </select>
                    </div>

                    {rewardType !== 'FREE_ITEM' ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          {rewardType === 'DISCOUNT_PERCENT' ? 'Discount Percentage (%)' : 'Discount Amount (Rs.)'}
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={rewardValue}
                          onChange={(e) => setRewardValue(Number(e.target.value))}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900 focus:outline-hidden focus:border-slate-900"
                          required
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Select Free Dish
                        </label>
                        <select
                          value={rewardMenuItemId}
                          onChange={(e) => setRewardMenuItemId(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                          required
                        >
                          <option value="">Select menu item...</option>
                          {menuItems.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (Rs. {m.price})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Points Cost
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={rewardPointsCost}
                        onChange={(e) => setRewardPointsCost(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-amber-700 focus:outline-hidden focus:border-slate-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Min. Order (Rs.)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={rewardMinOrder}
                        onChange={(e) => setRewardMinOrder(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:border-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Validity (Days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={rewardExpiryDays}
                        onChange={(e) => setRewardExpiryDays(Number(e.target.value))}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900 focus:outline-hidden focus:border-slate-900"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="isActiveReward"
                      checked={rewardIsActive}
                      onChange={(e) => setRewardIsActive(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                    />
                    <label htmlFor="isActiveReward" className="text-xs font-semibold text-slate-700 cursor-pointer">
                      Active (Visible to customers in Rewards Catalog)
                    </label>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setRewardModalOpen(false)}
                      className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingReward}
                      className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                    >
                      {isSubmittingReward ? 'Saving...' : editingReward ? 'Save Changes' : 'Create Reward'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
