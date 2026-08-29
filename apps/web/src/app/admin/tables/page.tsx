'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  QrCode,
  Edit2,
  Trash2,
  RefreshCw,
  ExternalLink,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { AdminLayout } from '../../../components/admin/AdminLayout';
import { adminService } from '../../../services/admin.service';
import { useAuthContext } from '../../../context/AuthContext';
import { Table, UserRole } from '@qr-menu/shared';

export default function AdminTablesPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [qrModalTable, setQrModalTable] = useState<any | null>(null);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTables = async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const data = await adminService.getTables(restaurantId, token);
      setTables(data || []);
    } catch (err) {
      console.warn('[AdminTables] Failed to fetch tables', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, [restaurantId, token]);

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
      setTables((prev) => [...prev, created]);
      setCreateModalOpen(false);
      setNewTableNumber('');
      setNewCapacity(4);
    } catch (err: any) {
      setFormError(err.message || 'Failed to create table');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegenerateQR = async (tableId: string) => {
    if (!token) return;
    try {
      const updated = await adminService.regenerateQR(tableId, token);
      setTables((prev) => prev.map((t) => (t.id === tableId ? updated : t)));
      if (qrModalTable?.id === tableId) {
        setQrModalTable(updated);
      }
    } catch (err) {
      console.error('[AdminTables] Failed to regenerate QR', err);
    }
  };

  const handleDeleteTable = async (tableId: string, tableNumber: string) => {
    if (!token) return;
    if (!confirm(`Are you sure you want to delete Table ${tableNumber}?`)) return;

    try {
      await adminService.deleteTable(tableId, token);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch (err: any) {
      alert(err.message || 'Could not delete table. It may have active orders.');
    }
  };

  return (
    <AdminLayout
      title="Table & QR Management"
      subtitle="Configure Dining Tables & Secure Customer QR Entry Codes"
      requiredRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]}
      onRefresh={fetchTables}
      isRefreshing={refreshing}
    >
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-slate-500">
            Each table possesses an authoritative QR Token preventing spoofed orders.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Table</span>
        </button>
      </div>

      {/* Tables List */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Table #</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">QR Token</th>
                <th className="py-3 px-4">Active Orders</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No tables configured. Click &quot;Add New Table&quot; to set up your restaurant floor.
                  </td>
                </tr>
              ) : (
                tables.map((table) => (
                  <tr key={table.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      Table {table.tableNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {table.capacity || 4} Guests
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          table.status === 'AVAILABLE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : table.status === 'OCCUPIED'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {table.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px] truncate max-w-[140px]">
                      {table.qrToken || 'token-default'}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {table._count?.orders || 0}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQrModalTable(table)}
                          className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 border border-slate-200 transition"
                          title="View & Download QR Code"
                        >
                          <QrCode className="w-4 h-4" />
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QR Code Modal */}
      {qrModalTable && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Table {qrModalTable.tableNumber} QR Standee
              </h3>
              <button
                type="button"
                onClick={() => setQrModalTable(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Visual */}
            <div className="p-6 bg-slate-50 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-center">
              <div className="w-44 h-44 bg-white p-3 border-2 border-slate-900 rounded-xl shadow-xs flex flex-col items-center justify-center">
                <QrCode className="w-32 h-32 text-slate-900" />
                <span className="text-[10px] font-bold font-mono text-slate-600 mt-1">
                  TABLE {qrModalTable.tableNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-3 font-mono">
                Token: {qrModalTable.qrToken || 'qr-live-token'}
              </p>
            </div>

            <div className="space-y-2">
              <a
                href={`/?table=${qrModalTable.tableNumber}&token=${qrModalTable.qrToken || ''}`}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Customer Menu Page</span>
              </a>

              <button
                type="button"
                onClick={() => handleRegenerateQR(qrModalTable.id)}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Secure Token</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 max-w-sm w-full p-6 shadow-2xl space-y-4">
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 focus:outline-hidden focus:border-slate-900"
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
                  className="py-1.5 px-4 rounded text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Table'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
