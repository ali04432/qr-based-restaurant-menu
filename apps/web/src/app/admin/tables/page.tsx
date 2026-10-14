'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Plus,
  QrCode,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Download,
  Printer,
  Check,
  Copy,
  Wifi,
  Globe,
  Monitor,
  AlertCircle,
  X,
  Search,
  Users,
  Eye,
  CheckCircle2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { UserRole } from '@qr-menu/shared';

interface TableRecord {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  tableNumber: string;
  qrToken: string;
  qrUrl?: string;
  capacity?: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED';
  isActive: boolean;
  activeOrdersCount?: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface NetworkInfo {
  lanIp: string;
  configuredUrl: string;
  lanUrl: string;
}

export default function AdminTablesPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [tables, setTables] = useState<TableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('ALL');

  // Network and Base URL state for mobile scannability
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [selectedBaseUrl, setSelectedBaseUrl] = useState<string>('');
  const [customBaseUrl, setCustomBaseUrl] = useState<string>('');
  const [isCustomUrlActive, setIsCustomUrlActive] = useState<boolean>(false);

  // QR Code Cache (stores Data URL for each table)
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalTable, setEditModalTable] = useState<TableRecord | null>(null);
  const [qrModalTable, setQrModalTable] = useState<TableRecord | null>(null);
  const [printAllModalOpen, setPrintAllModalOpen] = useState(false);

  // Form states
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [editCapacity, setEditCapacity] = useState(4);
  const [editStatus, setEditStatus] = useState<'AVAILABLE' | 'OCCUPIED' | 'RESERVED'>('AVAILABLE');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Determine current active base URL
  const activeBaseUrl = useMemo(() => {
    if (isCustomUrlActive && customBaseUrl.trim()) {
      return customBaseUrl.trim().replace(/\/+$/, '');
    }
    if (selectedBaseUrl) {
      return selectedBaseUrl.replace(/\/+$/, '');
    }
    return networkInfo?.lanUrl || networkInfo?.configuredUrl || 'http://localhost:3000';
  }, [isCustomUrlActive, customBaseUrl, selectedBaseUrl, networkInfo]);

  // Construct table customer menu URL
  const getTableMenuUrl = useCallback(
    (table: TableRecord) => {
      const cleanBase = activeBaseUrl.replace(/\/+$/, '');
      const tNum = encodeURIComponent(table.tableNumber);
      const tId = encodeURIComponent(table.id);
      const tokenVal = encodeURIComponent(table.qrToken || '');
      return `${cleanBase}/menu?restaurant=${table.restaurantId}&table=${tNum}&tableId=${tId}&token=${tokenVal}`;
    },
    [activeBaseUrl]
  );

  // Fetch Network Info
  const fetchNetworkInfo = useCallback(async () => {
    if (!token) return;
    try {
      const info = await adminService.getNetworkInfo(token);
      setNetworkInfo(info);
      if (!selectedBaseUrl) {
        // Default to LAN URL if available so mobile scanning works out-of-the-box!
        setSelectedBaseUrl(info.lanUrl || info.configuredUrl || 'http://localhost:3000');
      }
    } catch (err) {
      console.warn('[AdminTables] Failed to fetch network info', err);
    }
  }, [token, selectedBaseUrl]);

  // Fetch Tables
  const fetchTables = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getTables(restaurantId, token, activeBaseUrl);
      setTables((data as any) || []);
    } catch (err) {
      console.warn('[AdminTables] Failed to fetch tables', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, activeBaseUrl]);

  useEffect(() => {
    fetchNetworkInfo();
  }, [fetchNetworkInfo]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Generate QR codes for all tables in batch
  useEffect(() => {
    if (tables.length === 0) return;

    let isMounted = true;
    const generateAllQrs = async () => {
      const newUrls: Record<string, string> = {};
      for (const table of tables) {
        try {
          const url = getTableMenuUrl(table);
          const dataUrl = await QRCode.toDataURL(url, {
            width: 512,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H',
          });
          newUrls[table.id] = dataUrl;
        } catch (e) {
          console.error('[QRCode] Failed to generate for table', table.tableNumber, e);
        }
      }
      if (isMounted) {
        setQrDataUrls(newUrls);
      }
    };

    generateAllQrs();
    return () => {
      isMounted = false;
    };
  }, [tables, getTableMenuUrl]);

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchesSearch =
        searchQuery === '' ||
        t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus =
        statusFilter === 'ALL' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tables, searchQuery, statusFilter]);

  // Handle Create Table
  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setFormError('');
    setIsSubmitting(true);

    try {
      const created = await adminService.createTable(
        {
          restaurantId,
          tableNumber: newTableNumber.trim(),
          capacity: Number(newCapacity),
          status: 'AVAILABLE',
          isActive: true,
        },
        token
      );
      setTables((prev) => [...prev, created as any]);
      setCreateModalOpen(false);
      setNewTableNumber('');
      setNewCapacity(4);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Table
  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editModalTable) return;
    setIsSubmitting(true);

    try {
      const updated = await adminService.updateTable(
        editModalTable.id,
        {
          capacity: Number(editCapacity),
          status: editStatus as any,
        },
        token
      );
      setTables((prev) =>
        prev.map((t) => (t.id === editModalTable.id ? { ...t, ...updated } : t))
      );
      setEditModalTable(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update table');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Regenerate QR Token
  const handleRegenerateQR = async (tableId: string) => {
    if (!token) return;
    if (
      !confirm(
        'Are you sure you want to regenerate this QR token? Any previously printed physical standee for this token will become invalidated.'
      )
    ) {
      return;
    }

    try {
      const updated: any = await adminService.regenerateQR(tableId, token, activeBaseUrl);
      setTables((prev) =>
        prev.map((t) =>
          t.id === tableId ? { ...t, qrToken: updated.qrToken, qrUrl: updated.qrUrl } : t
        )
      );
      if (qrModalTable?.id === tableId) {
        setQrModalTable((prev) =>
          prev ? { ...prev, qrToken: updated.qrToken, qrUrl: updated.qrUrl } : null
        );
      }
    } catch (err) {
      console.error('[AdminTables] Failed to regenerate QR', err);
      alert('Could not regenerate QR code token');
    }
  };

  // Handle Delete Table
  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to permanently delete Table ${tableNumber}?`)) return;

    try {
      await adminService.deleteTable(tableId, token);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch (err: any) {
      alert(err.message || 'Could not delete table. It may have active orders.');
    }
  };

  // Copy QR URL
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Download Single QR Standee as PNG
  const handleDownloadQrPng = (table: TableRecord) => {
    const dataUrl = qrDataUrls[table.id];
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `Table-${table.tableNumber}-QR-Code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Single Standee Card
  const handlePrintSingleStandee = (table: TableRecord) => {
    const dataUrl = qrDataUrls[table.id];
    const url = getTableMenuUrl(table);
    const printWindow = window.open('', '_blank', 'width=650,height=800');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Table ${table.tableNumber} - QR Standee</title>
        <style>
          @page { size: auto; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #0f172a;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 20px;
          }
          .standee-card {
            width: 380px;
            border: 3px solid #0f172a;
            border-radius: 24px;
            padding: 32px 24px;
            text-align: center;
            background: #ffffff;
            box-shadow: 0 10px 25px rgba(0,0,0,0.08);
          }
          .restaurant-badge {
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.25em;
            text-transform: uppercase;
            color: #d97706;
            margin-bottom: 4px;
          }
          .restaurant-name {
            font-size: 24px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: -0.02em;
            margin: 0 0 16px 0;
          }
          .table-pill {
            display: inline-block;
            background: #0f172a;
            color: #ffffff;
            padding: 8px 24px;
            border-radius: 9999px;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.05em;
            margin-bottom: 24px;
          }
          .qr-frame {
            background: #f8fafc;
            border: 2px dashed #cbd5e1;
            border-radius: 20px;
            padding: 16px;
            display: inline-block;
            margin-bottom: 20px;
          }
          .qr-image {
            width: 240px;
            height: 240px;
            display: block;
          }
          .instructions-title {
            font-size: 15px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 6px 0;
          }
          .instructions-subtitle {
            font-size: 12px;
            color: #64748b;
            margin: 0 0 16px 0;
            line-height: 1.4;
          }
          .perks {
            display: flex;
            justify-content: center;
            gap: 12px;
            font-size: 10px;
            font-weight: 700;
            color: #059669;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
          }
        </style>
      </head>
      <body>
        <div class="standee-card">
          <div class="restaurant-badge">Dining Table Standee</div>
          <h1 class="restaurant-name">${table.restaurantName || 'Silver Sapoon'}</h1>
          <div class="table-pill">TABLE ${table.tableNumber}</div>
          <div class="qr-frame">
            <img class="qr-image" src="${dataUrl}" alt="QR Code Table ${table.tableNumber}" />
          </div>
          <div class="instructions-title">Scan Camera to Order</div>
          <div class="instructions-subtitle">Point your phone camera at the code above to browse our chef's live menu and place your order directly.</div>
          <div class="perks">
            <span>✓ No App Needed</span>
            <span>✓ Instant Kitchen Prep</span>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Print All Standees
  const handlePrintAll = () => {
    window.print();
  };

  return (
    <AdminLayout
      title="Table & QR Management"
      subtitle="Configure Dining Tables, Real Scannable QR Codes & Table Standees"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchTables}
      isRefreshing={refreshing}
    >
      {/* ─────────────────────────────────────────────────────────── */}
      {/* Section 1: Mobile Scannability & Base URL Configuration Banner */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="mb-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-400 text-slate-950">
                <Wifi className="w-3.5 h-3.5" />
                Mobile Scannable Mode
              </span>
              <span className="text-xs text-slate-300">
                Live Host: <code className="text-amber-300 font-mono font-bold">{activeBaseUrl}</code>
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              QR codes generate absolute URLs pointing to your customer menu. For scanning with physical phones on your local Wi-Fi, select your Wi-Fi LAN IP below.
            </p>
          </div>

          {/* URL Switcher Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {networkInfo?.lanIp && networkInfo.lanIp !== 'localhost' && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBaseUrl(networkInfo.lanUrl);
                  setIsCustomUrlActive(false);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                  !isCustomUrlActive && selectedBaseUrl === networkInfo.lanUrl
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
                }`}
                title="Recommended: Allows real mobile phones on same Wi-Fi to scan and open the menu"
              >
                <Wifi className="w-3.5 h-3.5" />
                <span>Wi-Fi IP ({networkInfo.lanIp}:3000)</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setSelectedBaseUrl('http://localhost:3000');
                setIsCustomUrlActive(false);
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                !isCustomUrlActive && selectedBaseUrl === 'http://localhost:3000'
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
              title="Standard localhost for browser testing on this computer"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Localhost:3000</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCustomUrlActive((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition border ${
                isCustomUrlActive
                  ? 'bg-amber-400 text-slate-950 border-amber-300'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-200 border-slate-700'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Custom URL</span>
            </button>
          </div>
        </div>

        {/* Custom URL Input dropdown */}
        {isCustomUrlActive && (
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-2">
            <span className="text-xs text-slate-400">Custom Domain/Tunnel:</span>
            <input
              type="url"
              placeholder="e.g. https://your-subdomain.ngrok-free.app or http://192.168.0.50:3000"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              className="flex-1 max-w-md bg-slate-950 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400"
            />
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Header Actions & Filter Toolbar */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        {/* Search & Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by table # (e.g. 01, VIP)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-slate-900 shadow-xs"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-700 focus:outline-hidden focus:border-slate-900 shadow-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="OCCUPIED">Occupied</option>
            <option value="RESERVED">Reserved</option>
          </select>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPrintAllModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition shadow-xs"
          >
            <Printer className="w-4 h-4 text-slate-600" />
            <span>Print All Standees</span>
          </button>

          <button
            type="button"
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Table</span>
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Tables Table List */}
      {/* ─────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Scannable QR</th>
                <th className="py-3 px-4">Table Identifier</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Orders</th>
                <th className="py-3 px-4">Menu URL & Token</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    <div className="inline-flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-500" />
                      <span>Loading dining tables & generating real QR codes...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTables.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No tables found matching your search. Click &quot;Add New Table&quot; to configure dining tables.
                  </td>
                </tr>
              ) : (
                filteredTables.map((table) => {
                  const dataUrl = qrDataUrls[table.id];
                  const menuUrl = getTableMenuUrl(table);

                  return (
                    <tr key={table.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Real Scannable Thumbnail */}
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setQrModalTable(table)}
                          className="group relative block w-12 h-12 bg-white rounded-lg border border-slate-200 p-1 hover:border-amber-400 hover:shadow-md transition"
                          title="Click to view & download high-res QR code"
                        >
                          {dataUrl ? (
                            <img
                              src={dataUrl}
                              alt={`QR Table ${table.tableNumber}`}
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full bg-slate-100 animate-pulse rounded flex items-center justify-center">
                              <QrCode className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-slate-900/60 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white">
                            <Eye className="w-3.5 h-3.5" />
                          </div>
                        </button>
                      </td>

                      {/* Table Identifier */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">
                          Table {table.tableNumber}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {table.id.substring(0, 8)}...
                        </div>
                      </td>

                      {/* Capacity */}
                      <td className="py-3 px-4 text-slate-700">
                        <div className="inline-flex items-center gap-1.5 font-medium">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{table.capacity || 4} Guests</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                            table.status === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : table.status === 'OCCUPIED'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          {table.status}
                        </span>
                      </td>

                      {/* Active Orders */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${
                            (table.activeOrdersCount || 0) > 0
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'text-slate-400'
                          }`}
                        >
                          {table.activeOrdersCount || 0} active
                        </span>
                      </td>

                      {/* Menu URL & Token */}
                      <td className="py-3 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <span
                            className="font-mono text-[11px] text-slate-500 truncate"
                            title={menuUrl}
                          >
                            {menuUrl}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyUrl(menuUrl)}
                            className="text-slate-400 hover:text-slate-700 shrink-0 p-1 rounded hover:bg-slate-100"
                            title="Copy customer menu URL"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setQrModalTable(table)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-xs font-semibold transition"
                            title="View Standee & QR Options"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>QR Code</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintSingleStandee(table)}
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                            title="Print Table Standee"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditModalTable(table);
                              setEditCapacity(table.capacity || 4);
                              setEditStatus(table.status);
                            }}
                            className="p-1.5 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition"
                            title="Edit Table"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteTable(table.id, table.tableNumber)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition"
                            title="Delete Table"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Modal 1: Individual Table QR Standee & Details Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Table {qrModalTable.tableNumber} QR Standee
                </h3>
                <p className="text-[11px] text-slate-500">
                  Real, mobile-scannable dining table QR code
                </p>
              </div>
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Standee Visual Card Preview */}
            <div className="bg-gradient-to-b from-slate-50 to-slate-100/80 border-2 border-slate-900 rounded-2xl p-6 flex flex-col items-center text-center shadow-md">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 mb-1">
                {qrModalTable.restaurantName || 'Silver Sapoon'}
              </span>
              <div className="bg-slate-900 text-white px-4 py-1 rounded-full text-xs font-black tracking-wider mb-4 shadow-xs">
                TABLE {qrModalTable.tableNumber}
              </div>

              {/* Scannable Image */}
              <div className="w-56 h-56 bg-white p-3.5 border-2 border-slate-200 rounded-xl shadow-xs flex items-center justify-center">
                {qrDataUrls[qrModalTable.id] ? (
                  <img
                    src={qrDataUrls[qrModalTable.id]}
                    alt={`QR Code Table ${qrModalTable.tableNumber}`}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="flex items-center justify-center gap-2 text-slate-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rendering QR...</span>
                  </div>
                )}
              </div>

              <div className="mt-3">
                <p className="text-xs font-black text-slate-900">Scan to View Menu & Order</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Point phone camera • Direct table routing
                </p>
              </div>
            </div>

            {/* URL Display with Copy */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-slate-600 truncate">
                {getTableMenuUrl(qrModalTable)}
              </span>
              <button
                type="button"
                onClick={() => handleCopyUrl(getTableMenuUrl(qrModalTable))}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 shrink-0 px-2 py-1 bg-white border border-slate-200 rounded shadow-2xs"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <a
                href={getTableMenuUrl(qrModalTable)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Menu Page</span>
              </a>

              <button
                type="button"
                onClick={() => handlePrintSingleStandee(qrModalTable)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Standee</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadQrPng(qrModalTable)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PNG</span>
              </button>

              <button
                type="button"
                onClick={() => handleRegenerateQR(qrModalTable.id)}
                className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Token</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Modal 2: Batch Print All Table Standees Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      {printAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Printer className="w-5 h-5 text-amber-500" />
                  <span>Print All Table Standees ({tables.length} Tables)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Ready-to-cut dining table QR standees. Hit Print to generate full page sheets.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintAll}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print All Pages Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrintAllModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-md"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Standees Grid */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 rounded-xl border border-slate-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {tables.map((table) => {
                  const dataUrl = qrDataUrls[table.id];

                  return (
                    <div
                      key={table.id}
                      className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-5 flex flex-col items-center text-center shadow-xs relative"
                    >
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-600 mb-1">
                        {table.restaurantName || 'Silver Sapoon'}
                      </div>
                      <div className="bg-slate-900 text-white px-3.5 py-0.5 rounded-full text-xs font-black tracking-wider mb-3">
                        TABLE {table.tableNumber}
                      </div>

                      <div className="w-40 h-40 bg-white p-2.5 border border-slate-200 rounded-xl mb-3 flex items-center justify-center">
                        {dataUrl ? (
                          <img
                            src={dataUrl}
                            alt={`QR Table ${table.tableNumber}`}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 animate-pulse rounded" />
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900">Scan to Order</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Capacity: {table.capacity || 4} Guests
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Modal 3: Add New Table Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Add New Dining Table</h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
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

            <form onSubmit={handleCreateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Table Number / Identifier
                </label>
                <input
                  type="text"
                  required
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  placeholder="e.g. 05, VIP-1, Rooftop-3"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seating Capacity (Guests)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating Table...' : 'Create Table & Generate QR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────── */}
      {/* Modal 4: Edit Table Modal */}
      {/* ─────────────────────────────────────────────────────────── */}
      {editModalTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Edit Table {editModalTable.tableNumber}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalTable(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateTable} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seating Capacity (Guests)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operational Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
                >
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="OCCUPIED">OCCUPIED</option>
                  <option value="RESERVED">RESERVED</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalTable(null)}
                  className="py-1.5 px-3 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
