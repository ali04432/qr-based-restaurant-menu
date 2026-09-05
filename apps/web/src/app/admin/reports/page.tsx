'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  Boxes,
  RefreshCw,
  Users,
  Gift,
  Receipt,
  Clock,
  Plus,
  Trash2,
  Play,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Mail,
  ChevronDown,
  ChevronUp,
  Activity,
  RotateCw,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────
type ReportTab = 'sales' | 'profit' | 'inventory' | 'tax' | 'staff' | 'loyalty';
type SectionTab = 'reports' | 'scheduled' | 'jobs';

interface ScheduledReport {
  id: string;
  reportType: string;
  frequency: string;
  recipients: string[];
  format: string;
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
}

interface BackgroundJob {
  id: string;
  jobType: string;
  status: string;
  retries: number;
  maxRetries: number;
  error?: string;
  scheduledFor: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface JobStats {
  pending: number;
  running: number;
  completed: number;
  failed: number;
  recentJobs: BackgroundJob[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─────────────────────────────────────────────────────────
// API Helpers
// ─────────────────────────────────────────────────────────
async function apiFetch(path: string, token: string, opts?: RequestInit) {
  const res = await fetch(`${API_BASE}/api${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(err.message || 'API error');
  }
  const data = await res.json();
  return data.data ?? data;
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'blue' }: { label: string; value: string | number; sub?: string; color?: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-slate-900/90 text-blue-400 border-slate-800/80',
    green: 'bg-slate-900/90 text-emerald-400 border-slate-800/80',
    amber: 'bg-slate-900/90 text-amber-400 border-slate-800/80',
    rose: 'bg-slate-900/90 text-rose-400 border-slate-800/80',
    purple: 'bg-slate-900/90 text-purple-400 border-slate-800/80',
    teal: 'bg-slate-900/90 text-teal-400 border-slate-800/80',
  };
  return (
    <div className={`border rounded-xl p-4 shadow-lg backdrop-blur-sm ${colorMap[color] || colorMap.blue}`}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="text-2xl font-bold mt-1 text-white">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function JobStatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    PENDING: { bg: 'bg-amber-100 text-amber-700', text: 'Pending', icon: <Clock className="w-3 h-3" /> },
    RUNNING: { bg: 'bg-blue-100 text-blue-700', text: 'Running', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    COMPLETED: { bg: 'bg-green-100 text-green-700', text: 'Completed', icon: <CheckCircle className="w-3 h-3" /> },
    FAILED: { bg: 'bg-red-100 text-red-700', text: 'Failed', icon: <XCircle className="w-3 h-3" /> },
  };
  const s = map[status] || { bg: 'bg-slate-100 text-slate-600', text: status, icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg}`}>
      {s.icon} {s.text}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  // Section tabs
  const [sectionTab, setSectionTab] = useState<SectionTab>('reports');

  // Report state
  const [reportTab, setReportTab] = useState<ReportTab>('sales');
  const [reportData, setReportData] = useState<any | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(false);
  const [showNewScheduledForm, setShowNewScheduledForm] = useState(false);
  const [newScheduled, setNewScheduled] = useState({
    reportType: 'SALES',
    frequency: 'DAILY',
    recipients: '',
    format: 'CSV',
  });
  const [scheduledSaving, setScheduledSaving] = useState(false);

  // Job queue state
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [jobsLoading, setJobsLoading] = useState(false);

  // ── Fetch report data
  const fetchReport = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const params = new URLSearchParams({ restaurantId });
      if (dateFrom) params.set('dateFrom', dateFrom);
      if (dateTo) params.set('dateTo', dateTo);

      const data = await apiFetch(`/admin/reports/${reportTab}?${params}`, token);
      setReportData(data);
    } catch (err) {
      console.warn('[AdminReports] Failed to fetch report data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, restaurantId, reportTab, dateFrom, dateTo]);

  useEffect(() => {
    setLoading(true);
    setReportData(null);
    fetchReport();
  }, [reportTab]);

  // ── Fetch scheduled reports
  const fetchScheduled = useCallback(async () => {
    if (!token) return;
    try {
      setScheduledLoading(true);
      const data = await apiFetch(`/admin/scheduled-reports?restaurantId=${restaurantId}`, token);
      setScheduledReports(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[AdminReports] Failed to fetch scheduled reports', err);
    } finally {
      setScheduledLoading(false);
    }
  }, [token, restaurantId]);

  useEffect(() => {
    if (sectionTab === 'scheduled') fetchScheduled();
  }, [sectionTab, fetchScheduled]);

  // ── Fetch job stats
  const fetchJobStats = useCallback(async () => {
    if (!token) return;
    try {
      setJobsLoading(true);
      const data = await apiFetch(`/admin/jobs/stats?restaurantId=${restaurantId}`, token);
      setJobStats(data);
    } catch (err) {
      console.warn('[AdminReports] Failed to fetch job stats', err);
    } finally {
      setJobsLoading(false);
    }
  }, [token, restaurantId]);

  useEffect(() => {
    if (sectionTab === 'jobs') fetchJobStats();
  }, [sectionTab, fetchJobStats]);

  const handleExportCSV = () => {
    const params = new URLSearchParams({ restaurantId, type: reportTab });
    window.open(`${API_BASE}/api/admin/reports/export?${params}&token=${token}`, '_blank');
  };

  const handleCreateScheduled = async () => {
    if (!token) return;
    if (!newScheduled.recipients.trim()) {
      alert('Please enter at least one email recipient');
      return;
    }
    try {
      setScheduledSaving(true);
      const recipients = newScheduled.recipients.split(',').map((e) => e.trim()).filter(Boolean);
      await apiFetch('/admin/scheduled-reports', token, {
        method: 'POST',
        body: JSON.stringify({ ...newScheduled, recipients, restaurantId }),
      });
      setShowNewScheduledForm(false);
      setNewScheduled({ reportType: 'SALES', frequency: 'DAILY', recipients: '', format: 'CSV' });
      fetchScheduled();
    } catch (err: any) {
      alert(err.message || 'Failed to create scheduled report');
    } finally {
      setScheduledSaving(false);
    }
  };

  const handleDeleteScheduled = async (id: string) => {
    if (!token || !confirm('Delete this scheduled report?')) return;
    try {
      await apiFetch(`/admin/scheduled-reports/${id}`, token, { method: 'DELETE' });
      fetchScheduled();
    } catch (err) {
      console.error('Failed to delete scheduled report', err);
    }
  };

  const handleRunNow = async (id: string) => {
    if (!token) return;
    try {
      const result = await apiFetch(`/admin/scheduled-reports/${id}/run-now`, token, { method: 'POST' });
      alert(`✅ ${result.message}`);
      fetchScheduled();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch report');
    }
  };

  const handleToggleScheduled = async (id: string, isActive: boolean) => {
    if (!token) return;
    try {
      await apiFetch(`/admin/scheduled-reports/${id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !isActive }),
      });
      fetchScheduled();
    } catch (err) {
      console.error('Failed to toggle scheduled report', err);
    }
  };

  const handleRetryJob = async (id: string) => {
    if (!token) return;
    try {
      await apiFetch(`/admin/jobs/${id}/retry`, token, { method: 'POST' });
      fetchJobStats();
    } catch (err: any) {
      alert(err.message || 'Failed to retry job');
    }
  };

  const handlePurgeJobs = async () => {
    if (!token || !confirm('Purge all completed/failed jobs older than 7 days?')) return;
    try {
      const result = await apiFetch(`/admin/jobs/purge?restaurantId=${restaurantId}&olderThanDays=7`, token, { method: 'DELETE' });
      alert(`✅ ${result.message}`);
      fetchJobStats();
    } catch (err: any) {
      alert(err.message || 'Failed to purge jobs');
    }
  };

  // ─────────────────────────────────────────────────────────
  // Report tab definitions
  // ─────────────────────────────────────────────────────────
  const reportTabs: Array<{ id: ReportTab; label: string; icon: React.ReactNode }> = [
    { id: 'sales', label: 'Sales', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'profit', label: 'Profit', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'inventory', label: 'Inventory', icon: <Boxes className="w-4 h-4" /> },
    { id: 'tax', label: 'Tax', icon: <Receipt className="w-4 h-4" /> },
    { id: 'staff', label: 'Staff', icon: <Users className="w-4 h-4" /> },
    { id: 'loyalty', label: 'Loyalty', icon: <Gift className="w-4 h-4" /> },
  ];

  // ─────────────────────────────────────────────────────────
  // Render report content by type
  // ─────────────────────────────────────────────────────────
  function renderReportContent() {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mr-3" />
          <span>Generating report...</span>
        </div>
      );
    }
    if (!reportData) return null;

    // ── Sales Report
    if (reportTab === 'sales') {
      const rows = reportData.rows || [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Orders" value={reportData.totalOrders || 0} color="blue" />
            <StatCard label="Total Sales" value={`Rs. ${(reportData.totalSales || 0).toLocaleString()}`} color="green" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Order #', 'Table', 'Date', 'Item', 'Category', 'Unit Price', 'Qty', 'Subtotal', 'Payment', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((row: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs">{row.orderNumber}</td>
                    <td className="px-3 py-2">{row.tableNumber}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{new Date(row.date).toLocaleDateString()}</td>
                    <td className="px-3 py-2 font-medium">{row.itemName}</td>
                    <td className="px-3 py-2 text-slate-500">{row.categoryName}</td>
                    <td className="px-3 py-2">Rs. {row.unitPrice}</td>
                    <td className="px-3 py-2 text-center">{row.quantity}</td>
                    <td className="px-3 py-2 font-semibold">Rs. {row.subtotal}</td>
                    <td className="px-3 py-2">{row.paymentMethod}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${row.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {row.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 100 && <p className="text-center text-xs text-slate-400 py-3">Showing 100 of {rows.length} rows. Export CSV for full data.</p>}
          </div>
        </div>
      );
    }

    // ── Profit Report
    if (reportTab === 'profit') {
      const rows = Array.isArray(reportData) ? reportData : (reportData.rows || []);
      const totalRevenue = rows.reduce((s: number, r: any) => s + r.totalRevenue, 0);
      const totalProfit = rows.reduce((s: number, r: any) => s + r.grossProfit, 0);
      const avgMargin = rows.length > 0 ? rows.reduce((s: number, r: any) => s + r.profitMargin, 0) / rows.length : 0;
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Revenue" value={`Rs. ${totalRevenue.toLocaleString()}`} color="blue" />
            <StatCard label="Gross Profit" value={`Rs. ${totalProfit.toLocaleString()}`} color="green" />
            <StatCard label="Avg. Margin" value={`${avgMargin.toFixed(1)}%`} color="teal" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Item', 'Category', 'Units Sold', 'Revenue', 'Cost', 'Gross Profit', 'Margin'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.sort((a: any, b: any) => b.grossProfit - a.grossProfit).map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{r.itemName}</td>
                    <td className="px-3 py-2 text-slate-500">{r.category}</td>
                    <td className="px-3 py-2 text-center">{r.unitsSold}</td>
                    <td className="px-3 py-2">Rs. {r.totalRevenue.toLocaleString()}</td>
                    <td className="px-3 py-2 text-slate-500">Rs. {r.totalCost.toLocaleString()}</td>
                    <td className="px-3 py-2 font-semibold text-green-700">Rs. {r.grossProfit.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-200 rounded-full h-1.5 max-w-16">
                          <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${Math.min(100, r.profitMargin)}%` }} />
                        </div>
                        <span className="text-xs font-bold">{r.profitMargin}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Inventory Report
    if (reportTab === 'inventory') {
      const rows = reportData.rows || [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <StatCard label="Total Items" value={reportData.totalItems || 0} color="blue" />
            <StatCard label="Total Valuation" value={`Rs. ${(reportData.totalValuation || 0).toLocaleString()}`} color="purple" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Item', 'Category', 'Stock', 'Cost Price', 'Selling Price', 'Valuation', 'Status'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 font-medium">{r.itemName}</td>
                    <td className="px-3 py-2 text-slate-500">{r.category}</td>
                    <td className="px-3 py-2 font-bold">{r.stockCount}</td>
                    <td className="px-3 py-2">Rs. {r.costPrice}</td>
                    <td className="px-3 py-2">Rs. {r.sellingPrice}</td>
                    <td className="px-3 py-2 font-semibold">Rs. {r.totalValuation.toLocaleString()}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        r.status === 'IN_STOCK' ? 'bg-green-100 text-green-700'
                        : r.status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-700'
                        : 'bg-red-100 text-red-700'
                      }`}>{r.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Tax Report
    if (reportTab === 'tax') {
      const s = reportData.summary || {};
      const pmBreakdown = reportData.paymentMethodBreakdown || [];
      const monthly = reportData.monthlyBreakdown || [];
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Orders" value={s.totalOrders || 0} color="blue" />
            <StatCard label="Total Subtotal" value={`Rs. ${(s.totalSubtotal || 0).toLocaleString()}`} color="teal" />
            <StatCard label="Tax Collected" value={`Rs. ${(s.totalTaxCollected || 0).toLocaleString()}`} color="amber" />
            <StatCard label="Effective Rate" value={`${s.effectiveTaxRate || 0}%`} color="purple" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h4 className="font-semibold text-slate-700 text-sm">Payment Method Breakdown</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    {['Method', 'Orders', 'Subtotal', 'Tax', 'Total'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pmBreakdown.map((pm: any) => (
                    <tr key={pm.paymentMethod} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium">{pm.paymentMethod}</td>
                      <td className="px-3 py-2">{pm.count}</td>
                      <td className="px-3 py-2">Rs. {pm.subtotal.toLocaleString()}</td>
                      <td className="px-3 py-2 text-amber-700 font-semibold">Rs. {pm.tax.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold">Rs. {pm.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h4 className="font-semibold text-slate-700 text-sm">Monthly Tax Summary</h4>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100">
                  <tr>
                    {['Month', 'Orders', 'Tax Collected', 'Revenue'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthly.slice(-12).map((m: any) => (
                    <tr key={m.month} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium">{m.month}</td>
                      <td className="px-3 py-2">{m.orders}</td>
                      <td className="px-3 py-2 text-amber-700 font-semibold">Rs. {m.taxCollected.toLocaleString()}</td>
                      <td className="px-3 py-2 font-bold">Rs. {m.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    // ── Staff Report
    if (reportTab === 'staff') {
      const s = reportData.summary || {};
      const rows = reportData.rows || [];
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Staff" value={s.totalStaff || 0} color="blue" />
            <StatCard label="Orders Handled" value={s.totalOrdersHandled || 0} color="teal" />
            <StatCard label="Avg Revenue / Staff" value={`Rs. ${(s.avgRevenuePerStaff || 0).toLocaleString()}`} color="green" />
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {['Staff Member', 'Role', 'Orders Served', 'Revenue', 'Completed', 'Avg. Time (min)'].map(h => (
                    <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-slate-400">{r.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-semibold">{r.role}</span>
                    </td>
                    <td className="px-3 py-2 font-bold text-center">{r.ordersServed}</td>
                    <td className="px-3 py-2 font-semibold text-green-700">Rs. {r.totalRevenue.toLocaleString()}</td>
                    <td className="px-3 py-2 text-center">{r.completedOrders}</td>
                    <td className="px-3 py-2 text-center">
                      {r.avgProcessingMinutes > 0 ? `${r.avgProcessingMinutes} min` : '—'}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-10 text-slate-400">No staff data found for the selected period.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // ── Loyalty Report
    if (reportTab === 'loyalty') {
      const s = reportData.summary || {};
      const tierDist: Record<string, number> = reportData.tierDistribution || {};
      const topRewards = reportData.topRewards || [];
      const topCustomers = reportData.topCustomers || [];
      const tierColors: Record<string, string> = {
        BRONZE: 'bg-amber-700', SILVER: 'bg-slate-400', GOLD: 'bg-yellow-400', PLATINUM: 'bg-violet-500',
      };
      return (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Members" value={s.totalMembers || 0} color="purple" />
            <StatCard label="Points in Circulation" value={(s.totalPointsInCirculation || 0).toLocaleString()} color="blue" />
            <StatCard label="Points Earned" value={(s.totalPointsEarned || 0).toLocaleString()} color="green" />
            <StatCard label="Redemptions" value={s.totalRedemptions || 0} color="amber" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tier distribution */}
            <div className="rounded-xl border border-slate-200 p-4">
              <h4 className="font-semibold text-slate-700 text-sm mb-3">Member Tier Distribution</h4>
              <div className="space-y-2">
                {Object.entries(tierDist).map(([tier, count]) => {
                  const total = Object.values(tierDist).reduce((a, b) => a + b, 0) || 1;
                  const pct = ((count / total) * 100).toFixed(0);
                  return (
                    <div key={tier}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-semibold">{tier}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${tierColors[tier] || 'bg-slate-400'}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Top rewards */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h4 className="font-semibold text-slate-700 text-sm">Top Redeemed Rewards</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {topRewards.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No redemptions yet.</p>
                ) : topRewards.map((r: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <span className="text-sm font-medium">{r.name}</span>
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">{r.count}x</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Top customers */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <h4 className="font-semibold text-slate-700 text-sm">Top Loyalty Members</h4>
              </div>
              <div className="divide-y divide-slate-100">
                {topCustomers.length === 0 ? (
                  <p className="p-4 text-sm text-slate-400">No members yet.</p>
                ) : topCustomers.slice(0, 5).map((c: any, i: number) => (
                  <div key={i} className="px-4 py-2.5 flex justify-between items-center">
                    <div>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-slate-400">{c.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-purple-700">{c.pointsBalance.toLocaleString()} pts</div>
                      <div className={`text-xs font-semibold ${
                        c.tier === 'PLATINUM' ? 'text-violet-600' :
                        c.tier === 'GOLD' ? 'text-yellow-600' :
                        c.tier === 'SILVER' ? 'text-slate-500' : 'text-amber-700'
                      }`}>{c.tier}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  // ─────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Business intelligence, scheduled reports &amp; background jobs</p>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {([
            { id: 'reports', label: 'Reports', icon: <FileSpreadsheet className="w-4 h-4" /> },
            { id: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-4 h-4" /> },
            { id: 'jobs', label: 'Job Queue', icon: <Activity className="w-4 h-4" /> },
          ] as Array<{ id: SectionTab; label: string; icon: React.ReactNode }>).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSectionTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                sectionTab === tab.id
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── REPORTS SECTION ── */}
        {sectionTab === 'reports' && (
          <div className="space-y-5">
            {/* Report type tabs */}
            <div className="flex flex-wrap gap-2">
              {reportTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setReportTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${
                    reportTab === tab.id
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Date filter + actions */}
            <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-600">Filter:</span>
              </div>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <span className="text-slate-400 text-sm">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm"
              />
              <button
                onClick={fetchReport}
                disabled={refreshing}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Apply
              </button>
              <button
                onClick={handleExportCSV}
                className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700"
              >
                <Download className="w-4 h-4" /> Export CSV
              </button>
            </div>

            {/* Report content */}
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              {renderReportContent()}
            </div>
          </div>
        )}

        {/* ── SCHEDULED REPORTS SECTION ── */}
        {sectionTab === 'scheduled' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Automatically dispatch reports via email on a recurring schedule.</p>
              {isAdmin && (
                <button
                  onClick={() => setShowNewScheduledForm(!showNewScheduledForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-semibold hover:bg-slate-700"
                >
                  <Plus className="w-4 h-4" />
                  {showNewScheduledForm ? 'Cancel' : 'New Schedule'}
                </button>
              )}
            </div>

            {/* Create form */}
            {showNewScheduledForm && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-blue-800">Create Scheduled Report</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Report Type</label>
                    <select
                      value={newScheduled.reportType}
                      onChange={(e) => setNewScheduled({ ...newScheduled, reportType: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      {['SALES', 'PROFIT', 'INVENTORY', 'TAX', 'STAFF', 'LOYALTY'].map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Frequency</label>
                    <select
                      value={newScheduled.frequency}
                      onChange={(e) => setNewScheduled({ ...newScheduled, frequency: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="DAILY">Daily (6 AM)</option>
                      <option value="WEEKLY">Weekly</option>
                      <option value="MONTHLY">Monthly</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Format</label>
                    <select
                      value={newScheduled.format}
                      onChange={(e) => setNewScheduled({ ...newScheduled, format: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="CSV">CSV</option>
                      <option value="PDF">PDF</option>
                    </select>
                  </div>
                  <div className="lg:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Recipients (comma-separated emails)</label>
                    <input
                      type="text"
                      value={newScheduled.recipients}
                      onChange={(e) => setNewScheduled({ ...newScheduled, recipients: e.target.value })}
                      placeholder="manager@restaurant.com, owner@restaurant.com"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowNewScheduledForm(false)}
                    className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateScheduled}
                    disabled={scheduledSaving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                  >
                    {scheduledSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Schedule
                  </button>
                </div>
              </div>
            )}

            {/* Scheduled reports list */}
            {scheduledLoading ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : scheduledReports.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No scheduled reports configured yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {scheduledReports.map((sr) => (
                  <div key={sr.id} className={`bg-white border rounded-xl p-4 ${sr.isActive ? 'border-slate-200' : 'border-slate-100 opacity-60'}`}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${sr.isActive ? 'bg-green-500' : 'bg-slate-300'}`} />
                        <div>
                          <div className="font-semibold text-slate-800">{sr.reportType} Report</div>
                          <div className="text-sm text-slate-500">
                            {sr.frequency} · {sr.format} · {sr.recipients.length} recipient{sr.recipients.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">
                            <Mail className="w-3 h-3 inline mr-1" />
                            {sr.recipients.join(', ')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-xs text-slate-400 text-right">
                          {sr.lastRunAt && <div>Last: {new Date(sr.lastRunAt).toLocaleDateString()}</div>}
                          {sr.nextRunAt && <div>Next: {new Date(sr.nextRunAt).toLocaleDateString()}</div>}
                        </div>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => handleRunNow(sr.id)}
                              title="Run Now"
                              className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg border border-green-200"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleScheduled(sr.id, sr.isActive)}
                              title={sr.isActive ? 'Pause' : 'Activate'}
                              className={`p-1.5 rounded-lg border ${sr.isActive ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}
                            >
                              {sr.isActive ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteScheduled(sr.id)}
                              title="Delete"
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── JOB QUEUE SECTION ── */}
        {sectionTab === 'jobs' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Monitor background job execution, retry failures, and purge old logs.</p>
              <div className="flex gap-2">
                <button
                  onClick={fetchJobStats}
                  disabled={jobsLoading}
                  className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                {isAdmin && (
                  <button
                    onClick={handlePurgeJobs}
                    className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" /> Purge Old Jobs
                  </button>
                )}
              </div>
            </div>

            {jobsLoading && !jobStats ? (
              <div className="flex justify-center py-12 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : jobStats ? (
              <>
                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Pending" value={jobStats.pending} color="amber" />
                  <StatCard label="Running" value={jobStats.running} color="blue" />
                  <StatCard label="Completed" value={jobStats.completed} color="green" />
                  <StatCard label="Failed" value={jobStats.failed} color="rose" />
                </div>

                {/* Recent jobs table */}
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                    <h4 className="font-semibold text-slate-700 text-sm">Recent Jobs (last 20)</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-slate-100">
                        <tr>
                          {['Job Type', 'Status', 'Retries', 'Scheduled', 'Completed', 'Error', 'Actions'].map(h => (
                            <th key={h} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {jobStats.recentJobs.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-10 text-slate-400">No jobs in queue.</td>
                          </tr>
                        ) : (jobStats.recentJobs as BackgroundJob[]).map((job) => (
                          <tr key={job.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{job.jobType}</span>
                            </td>
                            <td className="px-3 py-2.5"><JobStatusBadge status={job.status} /></td>
                            <td className="px-3 py-2.5 text-center text-xs">{job.retries}/{job.maxRetries}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-500">{new Date(job.scheduledFor).toLocaleTimeString()}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-500">
                              {job.completedAt ? new Date(job.completedAt).toLocaleTimeString() : '—'}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-red-500 max-w-xs truncate">
                              {job.error || '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              {job.status === 'FAILED' && isAdmin && (
                                <button
                                  onClick={() => handleRetryJob(job.id)}
                                  title="Retry"
                                  className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded border border-blue-200"
                                >
                                  <RotateCw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
