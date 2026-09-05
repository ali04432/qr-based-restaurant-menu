'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Crown,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Calendar,
  Grid,
  Users,
  Store,
  Sparkles,
  Zap,
  ShieldCheck,
  Check,
  X,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { Subscription, SubscriptionPlan, UserRole } from '@qr-menu/shared';

interface CurrentSubscriptionData {
  subscription: Subscription;
  usage: {
    tables: { current: number; limit: number; percent: number };
    staff: { current: number; limit: number; percent: number };
    branches: { current: number; limit: number; percent: number };
    ordersThisMonth: { current: number; limit: number; percent: number };
    features: {
      hasAiFeatures: boolean;
      hasAdvancedAnalytics: boolean;
      hasIntegrations: boolean;
      hasCustomBranding: boolean;
    };
  };
}

export default function AdminSubscriptionPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [currentData, setCurrentData] = useState<CurrentSubscriptionData | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);

      const [subRes, plansRes] = await Promise.all([
        adminService.getCurrentSubscription(restaurantId, token),
        adminService.getSubscriptionPlans(token),
      ]);

      setCurrentData(subRes as any);
      setPlans(plansRes || []);
      if (subRes?.subscription?.billingCycle) {
        setBillingCycle(subRes.subscription.billingCycle as any);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load subscription details');
    } finally {
      setIsLoading(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (planTier: string) => {
    if (!token) return;
    try {
      setIsUpgrading(true);
      setError(null);

      await adminService.upgradeSubscription(planTier, billingCycle, token, restaurantId);
      setSuccessMessage(`Subscription upgraded to ${planTier} plan!`);
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Plan upgrade failed');
    } finally {
      setIsUpgrading(false);
    }
  };

  const handleCancel = async () => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to cancel your subscription? Features will remain active until your renewal date.')) {
      return;
    }

    try {
      setIsLoading(true);
      await adminService.cancelSubscription(restaurantId, token);
      setSuccessMessage('Subscription cancelled.');
      await fetchData();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel subscription');
    } finally {
      setIsLoading(false);
    }
  };

  const currentPlan = currentData?.subscription?.plan;
  const isStarter = currentPlan?.tier === 'STARTER';
  const isPro = currentPlan?.tier === 'PRO';
  const isBusiness = currentPlan?.tier === 'BUSINESS';
  const isEnterprise = currentPlan?.tier === 'ENTERPRISE';

  return (
    <AdminLayout
      title="Plan & SaaS Subscription"
      subtitle="Manage your platform tier, monitor quota limits, and unlock enterprise capabilities"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}
      onRefresh={fetchData}
      isRefreshing={isLoading}
    >
      <div className="space-y-6">
        {/* Error / Success Banners */}
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

        {/* Current Subscription Card */}
        {currentData && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-slate-900">{currentPlan?.name || 'Standard Plan'}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                      {currentPlan?.tier || 'ACTIVE'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${
                        currentData.subscription.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {currentData.subscription.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Renews on{' '}
                      <strong>{new Date(currentData.subscription.renewalDate).toLocaleDateString()}</strong> (
                      {currentData.subscription.billingCycle})
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                {currentData.subscription.status === 'ACTIVE' && currentPlan?.tier !== 'STARTER' && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition"
                  >
                    Cancel Subscription
                  </button>
                )}
                <div className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold">
                  ${currentData.subscription.billingCycle === 'YEARLY' ? currentPlan?.priceYearly : currentPlan?.priceMonthly} /{' '}
                  {currentData.subscription.billingCycle.toLowerCase()}
                </div>
              </div>
            </div>

            {/* Quota & Entitlement Usage Meters */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-slate-500" />
                    Tables Quota
                  </span>
                  <span className="font-bold text-slate-900">
                    {currentData.usage.tables.current} / {currentData.usage.tables.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentData.usage.tables.percent > 85 ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${currentData.usage.tables.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{currentData.usage.tables.percent}% used</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-500" />
                    Staff Accounts
                  </span>
                  <span className="font-bold text-slate-900">
                    {currentData.usage.staff.current} / {currentData.usage.staff.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentData.usage.staff.percent > 85 ? 'bg-rose-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${currentData.usage.staff.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{currentData.usage.staff.percent}% used</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-500" />
                    Branch Outlets
                  </span>
                  <span className="font-bold text-slate-900">
                    {currentData.usage.branches.current} / {currentData.usage.branches.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      currentData.usage.branches.percent > 85 ? 'bg-rose-500' : 'bg-indigo-500'
                    }`}
                    style={{ width: `${currentData.usage.branches.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{currentData.usage.branches.percent}% used</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                    Monthly Orders
                  </span>
                  <span className="font-bold text-slate-900">
                    {currentData.usage.ordersThisMonth.current} / {currentData.usage.ordersThisMonth.limit}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${currentData.usage.ordersThisMonth.percent}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{currentData.usage.ordersThisMonth.percent}% used</p>
              </div>
            </div>
          </div>
        )}

        {/* Pricing Plan Selection Matrix */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Available Subscription Plans</h3>
              <p className="text-xs text-slate-500">Choose the plan that fits your restaurant scale and operational needs</p>
            </div>

            {/* Billing Cycle Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setBillingCycle('MONTHLY')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition ${
                  billingCycle === 'MONTHLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('YEARLY')}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
                  billingCycle === 'YEARLY' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Annual Billing
                <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-100 text-emerald-700 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {plans.map((p) => {
              const isCurrent = currentPlan?.tier === p.tier;
              const price = billingCycle === 'YEARLY' ? p.priceYearly : p.priceMonthly;

              return (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl border p-6 flex flex-col justify-between transition shadow-xs hover:shadow-md relative ${
                    isCurrent
                      ? 'border-amber-500 ring-2 ring-amber-500/20'
                      : p.tier === 'PRO'
                      ? 'border-indigo-200'
                      : 'border-slate-200'
                  }`}
                >
                  {isCurrent && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
                      Current Plan
                    </span>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-base font-bold text-slate-900">{p.name}</h4>
                      {p.tier === 'PRO' && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <div className="mt-4">
                      <span className="text-3xl font-extrabold text-slate-900">${price}</span>
                      <span className="text-xs text-slate-500 font-medium">
                        {' '}/ {billingCycle === 'YEARLY' ? 'year' : 'month'}
                      </span>
                    </div>

                    {/* Features list */}
                    <ul className="mt-6 space-y-2.5 text-xs text-slate-600">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to <strong>{p.maxTables} Tables</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to <strong>{p.maxStaff} Staff Accounts</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to <strong>{p.maxBranches} Branch Location{p.maxBranches > 1 ? 's' : ''}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Up to <strong>{p.maxOrdersPerMonth.toLocaleString()} Orders/mo</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        {p.hasAiFeatures ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={p.hasAiFeatures ? 'font-medium text-slate-900' : 'text-slate-400 line-through'}>
                          AI Recommendations & BI
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {p.hasIntegrations ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={p.hasIntegrations ? 'font-medium text-slate-900' : 'text-slate-400 line-through'}>
                          Printers & Hardware APIs
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        {p.hasAdvancedAnalytics ? (
                          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300 shrink-0" />
                        )}
                        <span className={p.hasAdvancedAnalytics ? 'font-medium text-slate-900' : 'text-slate-400 line-through'}>
                          Demand Forecasting Engine
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      onClick={() => handleUpgrade(p.tier)}
                      disabled={isCurrent || isUpgrading}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        isCurrent
                          ? 'bg-slate-100 text-slate-400 cursor-default'
                          : p.tier === 'PRO'
                          ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                      }`}
                    >
                      {isCurrent ? (
                        'Active Plan'
                      ) : (
                        <>
                          <span>Switch to {p.name}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
