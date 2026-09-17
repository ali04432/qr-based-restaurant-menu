'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  TrendingUp,
  Package,
  Users,
  DollarSign,
  Clock,
  Trash2,
  BarChart3,
  Zap,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Target,
  ShoppingCart,
  Utensils,
  Star,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

// ── Types ─────────────────────────────────────────────────────
type TabId = 'assistant' | 'operations' | 'analytics' | 'optimization';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  recommendations?: any[];
  confidence?: string;
  intent?: string;
}

interface DashboardData {
  operations: any;
  analytics: any;
  optimization: any;
  topRecommendations: any[];
  generatedAt: string;
}

// ── Quick prompts ─────────────────────────────────────────────
const QUICK_PROMPTS = [
  { icon: DollarSign, label: "Today's Sales", query: "What are today's total sales and revenue?" },
  { icon: TrendingUp, label: 'Best Sellers', query: 'What are the top 5 best-selling items this week?' },
  { icon: Package, label: 'Low Stock', query: 'Which items have low stock or are out of stock?' },
  { icon: Clock, label: 'Peak Hours', query: "What are the restaurant's busiest hours?" },
  { icon: Users, label: 'Table Status', query: 'How many tables are currently active?' },
  { icon: Sparkles, label: 'Profit Margins', query: 'What are my most and least profitable menu items?' },
];

// ── Helper components ─────────────────────────────────────────
function ConfidenceBadge({ level }: { level?: string }) {
  const config: Record<string, { color: string; label: string }> = {
    high: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', label: 'High Confidence' },
    medium: { color: 'text-amber-700 bg-amber-50 border-amber-200', label: 'Medium Confidence' },
    low: { color: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Low Confidence' },
    insufficient_data: { color: 'text-slate-500 bg-slate-50 border-slate-200', label: 'Insufficient Data' },
  };
  const c = config[level ?? ''] ?? config.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${c.color}`}>
      {c.label}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const config: Record<string, string> = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-orange-700 bg-orange-50 border-orange-200',
    medium: 'text-amber-700 bg-amber-50 border-amber-200',
    low: 'text-slate-500 bg-slate-50 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${config[priority] ?? config.low}`}>
      {priority}
    </span>
  );
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'rising') return <ArrowUp className="w-3 h-3 text-emerald-500" />;
  if (trend === 'declining') return <ArrowDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-slate-400" />;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-amber-500" />
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AdminAIPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '';

  const [activeTab, setActiveTab] = useState<TabId>('assistant');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load dashboard data when switching to a passive pillar
  const loadDashboard = useCallback(async () => {
    if (!token || !restaurantId) return;
    setDashboardLoading(true);
    setDashboardError(null);
    try {
      const data = await adminService.aiDashboard(restaurantId, token);
      setDashboard(data);
    } catch (err: any) {
      setDashboardError(err?.message ?? 'Failed to load AI dashboard');
    } finally {
      setDashboardLoading(false);
    }
  }, [token, restaurantId]);

  useEffect(() => {
    if (activeTab !== 'assistant') {
      loadDashboard();
    }
  }, [activeTab, loadDashboard]);

  // ── Assistant Pillar ───────────────────────────────────────
  const sendMessage = async (query: string) => {
    if (!query.trim() || !token || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await adminService.aiAssistant(restaurantId, query.trim(), token);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: response.answer ?? response.reply ?? 'No response generated.',
        timestamp: response.generatedAt ?? new Date().toISOString(),
        recommendations: response.recommendations,
        confidence: response.confidence,
        intent: response.data?.intent,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠ Error: ${err?.message || 'Unknown error'}. Please try again.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Tabs config ─────────────────────────────────────────────
  const tabs: Array<{ id: TabId; label: string; icon: React.ElementType; description: string }> = [
    { id: 'assistant', label: 'Assistant', icon: Bot, description: 'Natural-language Q&A' },
    { id: 'operations', label: 'Operations', icon: Activity, description: 'Table & order flow' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Revenue & menu insights' },
    { id: 'optimization', label: 'Optimization', icon: Zap, description: 'Inventory & pricing' },
  ];

  // ── Shared loading / error states ─────────────────────────
  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      <p className="text-sm text-slate-500">Analyzing your restaurant data…</p>
    </div>
  );

  const renderError = (msg: string) => (
    <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
      <AlertTriangle className="w-8 h-8 text-red-400" />
      <p className="text-sm text-red-600">{msg}</p>
      <button
        onClick={loadDashboard}
        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 transition"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Retry
      </button>
    </div>
  );

  // ── Operations Panel ────────────────────────────────────────
  const renderOperations = () => {
    const ops = dashboard?.operations;
    if (!ops) return null;
    const { tableUtilization, peakHours, orderFlowHealth, staffingAlerts } = ops.data ?? {};

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Operations Analysis</h2>
            <p className="text-xs text-slate-400">{ops.timeRange} · <ConfidenceBadge level={ops.confidence} /></p>
          </div>
        </div>

        {/* Answer summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-500">AI SUMMARY</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{ops.answer}</p>
        </div>

        {/* Table Utilization */}
        {tableUtilization && (
          <div>
            <SectionHeader title="Table Utilization" icon={Utensils} />
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="Total Tables" value={tableUtilization.totalTables} />
              <StatCard label="Active Tables" value={tableUtilization.activeTables} />
              <StatCard label="Utilization" value={`${tableUtilization.utilizationPercent}%`} />
            </div>
            {/* Utilization bar */}
            <div className="mt-2">
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${tableUtilization.utilizationPercent >= 90 ? 'bg-red-500' : tableUtilization.utilizationPercent >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${tableUtilization.utilizationPercent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Peak Hours */}
        {peakHours && peakHours.length > 0 && (
          <div>
            <SectionHeader title="Peak Hours (Last 7 Days)" icon={Clock} />
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {peakHours.slice(0, 6).map((ph: any) => {
                const hour = ph.hour;
                const label = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
                return (
                  <div key={ph.hour} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                    <p className="text-xs font-bold text-amber-600">{label}</p>
                    <p className="text-xs text-slate-600 font-semibold">{ph.orderCount}</p>
                    <p className="text-[10px] text-slate-400">orders</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Flow */}
        {orderFlowHealth && (
          <div>
            <SectionHeader title="Order Flow Health" icon={ShoppingCart} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Cancel Rate" value={`${orderFlowHealth.cancelRate}%`} sub={orderFlowHealth.cancelRate <= 5 ? '✓ Healthy' : '⚠ Review needed'} />
              {orderFlowHealth.avgPrepTimeMinutes && (
                <StatCard label="Avg Prep Time" value={`${orderFlowHealth.avgPrepTimeMinutes}m`} />
              )}
            </div>
          </div>
        )}

        {/* Staffing Alerts */}
        {staffingAlerts && staffingAlerts.length > 0 && (
          <div>
            <SectionHeader title="Staffing Alerts" icon={Users} />
            <div className="space-y-2">
              {staffingAlerts.map((alert: any, i: number) => (
                <div key={i} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${
                  alert.severity === 'critical' ? 'bg-red-50 border-red-200 text-red-700' :
                  alert.severity === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                  'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold">{alert.role}</p>
                    <p>{alert.issue}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Analytics Panel ─────────────────────────────────────────
  const renderAnalytics = () => {
    const analytics = dashboard?.analytics;
    if (!analytics) return null;
    const { revenueBreakdown, menuPerformance, customerInsights, forecastedRevenue } = analytics.data ?? {};

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Analytics Intelligence</h2>
            <p className="text-xs text-slate-400">{analytics.timeRange} · <ConfidenceBadge level={analytics.confidence} /></p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-500">AI SUMMARY</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{analytics.answer}</p>
        </div>

        {/* Revenue Breakdown */}
        {revenueBreakdown && (
          <div>
            <SectionHeader title="Revenue Breakdown" icon={DollarSign} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard label="Today" value={`Rs. ${revenueBreakdown.today?.toLocaleString()}`} />
              <StatCard label="Yesterday" value={`Rs. ${revenueBreakdown.yesterday?.toLocaleString()}`} />
              <StatCard
                label="This Week"
                value={`Rs. ${revenueBreakdown.thisWeek?.toLocaleString()}`}
                sub={revenueBreakdown.growthPercent !== undefined
                  ? `${revenueBreakdown.growthPercent >= 0 ? '▲' : '▼'} ${Math.abs(revenueBreakdown.growthPercent)}% vs last week`
                  : undefined}
              />
              <StatCard label="Last Week" value={`Rs. ${revenueBreakdown.lastWeek?.toLocaleString()}`} />
              <StatCard label="This Month" value={`Rs. ${revenueBreakdown.thisMonth?.toLocaleString()}`} />
              {customerInsights && (
                <StatCard label="Avg Order Value" value={`Rs. ${customerInsights.avgOrderValue?.toLocaleString()}`} sub={`${customerInsights.totalOrdersThisWeek} orders this week`} />
              )}
            </div>
          </div>
        )}

        {/* Menu Performance */}
        {menuPerformance && menuPerformance.length > 0 && (
          <div>
            <SectionHeader title="Menu Performance (This Week)" icon={Star} />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {menuPerformance.slice(0, 8).map((item: any, i: number) => (
                <div key={item.menuItemId} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 transition">
                  <span className="text-xs text-slate-400 w-4 font-bold">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.category}</p>
                  </div>
                  <TrendIcon trend={item.trend} />
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-800">Rs. {item.revenue?.toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400">{item.quantitySold} sold · {item.profitMargin}% margin</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast */}
        {forecastedRevenue && (
          <div>
            <SectionHeader title="Revenue Forecast" icon={TrendingUp} />
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Next Day Est." value={`Rs. ${forecastedRevenue.nextDay?.toLocaleString()}`} sub={`Confidence: ${forecastedRevenue.confidence}`} />
              <StatCard label="Next 7 Days Est." value={`Rs. ${forecastedRevenue.nextWeek?.toLocaleString()}`} sub={`Confidence: ${forecastedRevenue.confidence}`} />
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Optimization Panel ──────────────────────────────────────
  const renderOptimization = () => {
    const opt = dashboard?.optimization;
    if (!opt) return null;
    const { inventoryOptimizations, pricingOpportunities, menuOptimizations, operationalSavings } = opt.data ?? {};

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Optimization Engine</h2>
            <p className="text-xs text-slate-400">{opt.timeRange} · <ConfidenceBadge level={opt.confidence} /></p>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bot className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold text-slate-500">AI SUMMARY</span>
          </div>
          <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{opt.answer}</p>
        </div>

        {/* Inventory */}
        {inventoryOptimizations && inventoryOptimizations.length > 0 && (
          <div>
            <SectionHeader title="Inventory Reorder Alerts" icon={Package} />
            <div className="space-y-2">
              {inventoryOptimizations.slice(0, 6).map((item: any) => (
                <div key={item.menuItemId} className={`flex items-center gap-3 p-3 rounded-lg border text-xs ${
                  item.urgency === 'critical' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                }`}>
                  <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${item.urgency === 'critical' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-slate-500">
                      {item.currentStock} in stock · Reorder: {item.recommendedReorderQty}
                      {item.estimatedDaysRemaining !== undefined ? ` · ~${item.estimatedDaysRemaining}d remaining` : ''}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-bold capitalize border ${
                    item.urgency === 'critical' ? 'text-red-700 bg-red-100 border-red-200' : 'text-amber-700 bg-amber-100 border-amber-200'
                  }`}>
                    {item.urgency}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pricing */}
        {pricingOpportunities && pricingOpportunities.length > 0 && (
          <div>
            <SectionHeader title="Pricing Opportunities" icon={Target} />
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
              {pricingOpportunities.slice(0, 5).map((item: any) => (
                <div key={item.menuItemId} className="flex items-center gap-3 px-3 py-2.5 bg-white hover:bg-slate-50 transition">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.rationale}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400 line-through">Rs. {item.currentPrice}</p>
                    <p className="text-xs font-bold text-emerald-600">Rs. {item.suggestedPrice}</p>
                    <p className="text-[10px] text-emerald-500">+Rs. {item.estimatedRevenueImpact?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu actions */}
        {menuOptimizations && menuOptimizations.length > 0 && (
          <div>
            <SectionHeader title="Menu Actions" icon={Utensils} />
            <div className="space-y-2">
              {menuOptimizations.slice(0, 6).map((item: any) => {
                const actionConfig: Record<string, string> = {
                  promote: 'text-emerald-700 bg-emerald-50 border-emerald-200',
                  bundle: 'text-blue-700 bg-blue-50 border-blue-200',
                  retire: 'text-red-700 bg-red-50 border-red-200',
                  reprice: 'text-amber-700 bg-amber-50 border-amber-200',
                };
                return (
                  <div key={item.menuItemId} className={`flex items-start gap-2 p-3 rounded-lg border text-xs ${actionConfig[item.action] ?? 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                    <span className="font-bold capitalize px-1.5 py-0.5 rounded text-[10px] border border-current">{item.action}</span>
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="opacity-80">{item.reason}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Operational Savings */}
        {operationalSavings && operationalSavings.length > 0 && (
          <div>
            <SectionHeader title="Operational Savings" icon={DollarSign} />
            <div className="space-y-2">
              {operationalSavings.map((saving: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-800">{saving.area}</p>
                      <p className="text-xs font-bold text-emerald-600 shrink-0">Rs. {saving.potentialSavingRs?.toLocaleString()}</p>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-0.5">{saving.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Recommendations bar (shown on all passive tabs) ────────
  const renderRecommendations = () => {
    if (!dashboard?.topRecommendations?.length) return null;
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Top Recommendations</h3>
        </div>
        <div className="space-y-1.5">
          {dashboard.topRecommendations.slice(0, 3).map((rec: any) => (
            <div key={rec.id} className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-amber-200 transition cursor-default">
              <PriorityBadge priority={rec.priority} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{rec.title}</p>
                <p className="text-[10px] text-slate-400 truncate">{rec.description}</p>
              </div>
              {rec.actionUrl && (
                <a href={rec.actionUrl} className="text-[10px] text-amber-600 hover:text-amber-800 font-semibold flex items-center gap-0.5 shrink-0">
                  View <ChevronRight className="w-3 h-3" />
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <AdminLayout
      title="AI Intelligence Engine"
      subtitle="4-Pillar AI System · Assistant · Operations · Analytics · Optimization"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
    >
      <div className="flex flex-col gap-4">
        {/* ── Tab Nav ── */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto self-start">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? 'text-amber-500' : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'assistant' ? (
          /* ── ASSISTANT PILLAR ── */
          <div className="flex flex-col h-[calc(100vh-230px)] max-h-[760px]">
            <div className="flex-1 bg-white border border-slate-200 rounded-t-xl overflow-y-auto">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
                    <Bot className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">AI Business Assistant</h3>
                  <p className="text-xs text-slate-500 max-w-md mb-6">
                    Ask questions about your restaurant performance, sales, inventory, staff activity,
                    and profit margins. All answers are derived from your actual live database.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 w-full max-w-lg">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt.label}
                        type="button"
                        onClick={() => sendMessage(prompt.query)}
                        className="flex items-center gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium hover:bg-amber-50 hover:border-amber-200 transition text-left"
                      >
                        <prompt.icon className="w-4 h-4 text-amber-500 shrink-0" />
                        {prompt.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-xl px-4 py-3 ${
                        msg.role === 'user'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-50 border border-slate-200 text-slate-800'
                      }`}>
                        {msg.role === 'assistant' && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <Bot className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-xs font-bold text-slate-500">AI Assistant</span>
                            {msg.confidence && <ConfidenceBadge level={msg.confidence} />}
                          </div>
                        )}
                        <div className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</div>

                        {/* Inline recommendations from assistant */}
                        {msg.recommendations && msg.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-slate-200 space-y-1.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Recommendations</p>
                            {msg.recommendations.slice(0, 3).map((rec: any) => (
                              <div key={rec.id} className="flex items-start gap-1.5 text-[11px]">
                                <PriorityBadge priority={rec.priority} />
                                <span className="text-slate-600">{rec.title}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] mt-2 text-slate-400">
                          {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                          <span className="text-xs text-slate-500">Analyzing your data…</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Input bar */}
            <div className="bg-white border border-t-0 border-slate-200 rounded-b-xl px-4 py-3">
              {messages.length > 0 && (
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => setMessages([])}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-rose-500 transition"
                  >
                    <Trash2 className="w-3 h-3" /> Clear chat
                  </button>
                  <div className="flex items-center gap-1.5">
                    {QUICK_PROMPTS.slice(0, 3).map((p) => (
                      <button
                        key={p.label}
                        onClick={() => sendMessage(p.query)}
                        disabled={isLoading}
                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] text-slate-500 font-medium hover:bg-amber-50 hover:border-amber-200 disabled:opacity-50 transition"
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <form
                onSubmit={(e) => { e.preventDefault(); sendMessage(inputValue); }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about sales, inventory, profit margins, staff, or trends…"
                  disabled={isLoading}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none disabled:opacity-50 transition"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* ── PASSIVE PILLARS (Operations / Analytics / Optimization) ── */
          <div className="bg-white border border-slate-200 rounded-xl p-5 min-h-[400px]">
            {dashboardLoading ? (
              renderLoadingState()
            ) : dashboardError ? (
              renderError(dashboardError)
            ) : (
              <>
                {renderRecommendations()}
                {activeTab === 'operations' && renderOperations()}
                {activeTab === 'analytics' && renderAnalytics()}
                {activeTab === 'optimization' && renderOptimization()}
                {/* Refresh button */}
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <p className="text-[10px] text-slate-400">
                    Generated {dashboard?.generatedAt ? new Date(dashboard.generatedAt).toLocaleTimeString() : '—'}
                  </p>
                  <button
                    onClick={loadDashboard}
                    disabled={dashboardLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${dashboardLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
