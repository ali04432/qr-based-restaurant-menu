'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Activity,
  Server,
  Database,
  Cpu,
  Layers,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Lock,
  Globe,
  X,
  CheckCircle2,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { AuditLog, SystemHealthStatus, UserRole } from '@qr-menu/shared';

interface AuditStats {
  totalEvents: number;
  past24hEvents: number;
  securityAlertCount: number;
  entityDistribution: Record<string, number>;
}

export default function AdminAuditPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || undefined;

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [health, setHealth] = useState<SystemHealthStatus | null>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const [limit] = useState(25);

  const [entityFilter, setEntityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);

      const [logsRes, statsRes] = await Promise.all([
        adminService.getAuditLogs(
          {
            page,
            limit,
            entity: entityFilter,
            search: searchQuery,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            restaurantId: user?.role === UserRole.SUPER_ADMIN ? undefined : restaurantId,
          },
          token
        ),
        adminService.getAuditStats(
          token,
          user?.role === UserRole.SUPER_ADMIN ? undefined : restaurantId
        ),
      ]);

      setLogs(logsRes.data || []);
      setTotalPages(logsRes.totalPages || 1);
      setTotalLogs(logsRes.total || 0);
      setStats(statsRes);
    } catch (err: any) {
      setError(err?.message || 'Failed to retrieve audit events');
    } finally {
      setIsLoading(false);
    }
  }, [token, page, limit, entityFilter, searchQuery, startDate, endDate, user?.role, restaurantId]);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await adminService.getSystemHealth();
      setHealth(res);
    } catch {
      // Graceful fallback
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // 30s poll for health
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const handleExportCsv = () => {
    if (!token) return;
    const url = adminService.getAuditExportUrl(
      token,
      user?.role === UserRole.SUPER_ADMIN ? undefined : restaurantId
    );
    window.open(url, '_blank');
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('FAIL') || act.includes('DELETE') || act.includes('VOID') || act.includes('DEACTIVATE')) {
      return 'bg-red-900/40 text-red-400 border-red-800/50';
    }
    if (act.includes('SUCCESS') || act.includes('CREATE') || act.includes('PROVISION') || act.includes('UPGRADE')) {
      return 'bg-emerald-900/40 text-emerald-400 border-emerald-800/50';
    }
    if (act.includes('UPDATE') || act.includes('SYNC') || act.includes('CHANGE')) {
      return 'bg-blue-900/40 text-blue-400 border-blue-800/50';
    }
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  const getEntityIcon = (entity: string) => {
    switch (entity.toUpperCase()) {
      case 'AUTH':
        return <Lock className="w-3.5 h-3.5" />;
      case 'ORDER':
        return <Activity className="w-3.5 h-3.5" />;
      case 'STAFF':
      case 'STAFF_ACTION':
        return <User className="w-3.5 h-3.5" />;
      case 'BRANCH':
        return <MapPin className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 pb-12">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-full bg-gradient-to-l from-red-500/10 via-amber-500/5 to-transparent pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Enterprise Audit & Security
                    <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      Immutable Log
                    </span>
                  </h1>
                  <p className="text-zinc-400 text-sm mt-0.5">
                    Regulatory security event stream, tamper-proof staff action trails & real-time system observability
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsHealthOpen(true)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700 transition"
              >
                <Activity className="w-4 h-4 text-emerald-400" />
                System Health
                {health && (
                  <span
                    className={`w-2 h-2 rounded-full ${
                      health.status === 'healthy'
                        ? 'bg-emerald-400'
                        : health.status === 'degraded'
                        ? 'bg-amber-400'
                        : 'bg-red-400'
                    }`}
                  />
                )}
              </button>

              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-sm font-medium border border-zinc-700 transition"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                Export CSV
              </button>

              <button
                onClick={fetchLogs}
                disabled={isLoading}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl text-red-300 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Overview KPIs */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Total Audited Events</span>
                <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {stats.totalEvents.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Retained across organization lifetime
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Past 24 Hours Volume</span>
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-white tracking-tight">
                {stats.past24hEvents.toLocaleString()}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Staff actions & authentication attempts
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Flagged Security Alerts</span>
                <div className="p-2 bg-red-500/10 rounded-lg text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold text-red-400 tracking-tight">
                {stats.securityAlertCount}
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Failed logins, voids, or deletions
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-5 relative overflow-hidden">
              <div className="flex items-center justify-between text-zinc-400 mb-3">
                <span className="text-sm font-medium">Infrastructure State</span>
                <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                    health?.status === 'healthy'
                      ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-800/50'
                      : 'bg-amber-900/40 text-amber-400 border border-amber-800/50'
                  }`}
                >
                  {health?.status ? health.status.toUpperCase() : 'MONITORING'}
                </span>
                <span className="text-xs text-zinc-400">
                  DB: {health?.database.latencyMs ?? 0}ms
                </span>
              </div>
              <div className="mt-2 text-xs text-zinc-400">
                Memory: {health?.memory.usedMb ?? 0} MB ({health?.memory.freePercent ?? 0}% free)
              </div>
            </div>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search action, email, details, IP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-4 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Entity Select */}
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="px-3.5 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-sm text-zinc-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Entities</option>
              <option value="AUTH">Authentication</option>
              <option value="ORDER">Orders & Kitchen</option>
              <option value="STAFF">Staff & Roles</option>
              <option value="STAFF_ACTION">Staff Action Logs</option>
              <option value="BRANCH">Branches & Outlets</option>
              <option value="SUBSCRIPTION">SaaS Subscriptions</option>
              <option value="INTEGRATION">Hardware Integrations</option>
              <option value="SETTINGS">Settings & System</option>
            </select>

            {/* Date Filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
              <span className="text-zinc-500 text-xs">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-xs text-zinc-300 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="text-sm font-semibold text-zinc-300">
              Showing {logs.length} of {totalLogs} events
            </div>
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-zinc-400 font-medium">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase bg-zinc-800/40 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Timestamp</th>
                  <th className="py-3 px-4 font-semibold">Actor / Role</th>
                  <th className="py-3 px-4 font-semibold">Entity</th>
                  <th className="py-3 px-4 font-semibold">Action</th>
                  <th className="py-3 px-4 font-semibold">Details</th>
                  <th className="py-3 px-4 font-semibold">IP Address</th>
                  <th className="py-3 px-4 font-semibold text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {isLoading && logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-400">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                      Streaming immutable audit ledger...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-zinc-500">
                      No audit events recorded for current filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs text-zinc-200 font-mono">
                          {new Date(log.createdAt).toLocaleTimeString()}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="text-xs font-semibold text-zinc-200">
                          {log.userEmail || 'System Process'}
                        </div>
                        {log.userRole && (
                          <span className="inline-block mt-0.5 text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                            {log.userRole}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {getEntityIcon(log.entity || '')}
                          {log.entity || '—'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border font-mono ${getActionBadgeColor(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate text-xs text-zinc-400" title={String(log.details || '')}>
                        {log.details ? String(log.details) : '—'}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-500 font-mono">
                        {log.ipAddress || '—'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition"
                        >
                          <Eye className="w-4 h-4 text-indigo-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log Detail Modal */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Audit Event Record</h3>
                    <p className="text-xs text-zinc-400 font-mono">{selectedLog.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 py-4 text-xs">
                <div className="grid grid-cols-2 gap-2 bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Timestamp:</span>
                    <span className="font-mono text-zinc-200">
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">IP Address:</span>
                    <span className="font-mono text-zinc-200">{selectedLog.ipAddress || 'Internal'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Entity:</span>
                    <span className="font-semibold text-indigo-300">{selectedLog.entity}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Action:</span>
                    <span className="font-mono font-semibold text-zinc-200">{selectedLog.action}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Actor Email:</span>
                    <span className="text-zinc-200">{selectedLog.userEmail || 'System'}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block mb-0.5">Actor Role:</span>
                    <span className="text-zinc-200">{selectedLog.userRole || 'Automated'}</span>
                  </div>
                </div>

                {selectedLog.entityId && (
                  <div className="bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                    <span className="text-zinc-500 block mb-0.5">Entity Target ID:</span>
                    <span className="font-mono text-zinc-300">{selectedLog.entityId}</span>
                  </div>
                )}

                <div className="bg-zinc-800/40 p-3 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 block mb-1">Details & Payload:</span>
                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 font-mono text-zinc-300 whitespace-pre-wrap">
                    {log.details ? String(log.details) : 'No additional payload provided.'}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-zinc-800">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Close Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Diagnostics Modal */}
        {isHealthOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl p-6">
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Live System Observability</h3>
                    <p className="text-xs text-zinc-400">Real-time infrastructure & subsystem health telemetry</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsHealthOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {health ? (
                <div className="space-y-4 py-4">
                  {/* Status Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      health.status === 'healthy'
                        ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                        : health.status === 'degraded'
                        ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                        : 'bg-red-950/40 border-red-800/60 text-red-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6" />
                      <div>
                        <div className="font-bold text-sm uppercase">Overall Status: {health.status}</div>
                        <div className="text-xs opacity-80">
                          Uptime: {Math.floor(health.uptimeSeconds / 3600)}h {Math.floor((health.uptimeSeconds % 3600) / 60)}m
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={fetchHealth}
                      className="px-3 py-1.5 rounded-lg bg-black/30 hover:bg-black/50 text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-check
                    </button>
                  </div>

                  {/* Telemetry Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/60">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <Database className="w-4 h-4 text-blue-400" />
                        <span className="font-semibold">PostgreSQL Engine</span>
                      </div>
                      <div className="text-lg font-bold text-white">{health.database.latencyMs} ms</div>
                      <div className="text-[11px] text-zinc-400 mt-1">Status: {health.database.status}</div>
                    </div>

                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/60">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <Cpu className="w-4 h-4 text-purple-400" />
                        <span className="font-semibold">Process Memory</span>
                      </div>
                      <div className="text-lg font-bold text-white">{health.memory.usedMb} MB</div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        Free System: {health.memory.freePercent}%
                      </div>
                    </div>

                    <div className="bg-zinc-800/50 p-4 rounded-xl border border-zinc-700/60">
                      <div className="flex items-center gap-2 text-zinc-400 mb-2">
                        <Server className="w-4 h-4 text-amber-400" />
                        <span className="font-semibold">Background Jobs</span>
                      </div>
                      <div className="text-lg font-bold text-white">{health.jobsWorker.pendingJobs} pending</div>
                      <div className="text-[11px] text-zinc-400 mt-1">
                        Failed (1h): {health.jobsWorker.failedRecent}
                      </div>
                    </div>
                  </div>

                  {/* Integrations Health */}
                  <div>
                    <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      Registered Integrations Health
                    </h4>
                    {health.integrations.length === 0 ? (
                      <p className="text-xs text-zinc-500 italic">No external integrations configured yet.</p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {health.integrations.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-zinc-800/30 p-2.5 rounded-lg border border-zinc-800 flex items-center justify-between text-xs"
                          >
                            <span className="text-zinc-300 font-medium">{item.providerType}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                                item.isEnabled
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-zinc-800 text-zinc-500'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-zinc-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                  Pinging infrastructure endpoints...
                </div>
              )}

              <div className="flex justify-end pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setIsHealthOpen(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition"
                >
                  Close Diagnostics
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
