'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, X, Check, Loader2 } from 'lucide-react';
import { waiterService } from '../../../services/waiter.service';
import { TableWithOrders } from '@qr-menu/shared';

interface TransferTableModalProps {
  isOpen: boolean;
  sourceTableId: string;
  sourceTableNumber: string;
  tables: TableWithOrders[];
  token: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransferTableModal({
  isOpen,
  sourceTableId,
  sourceTableNumber,
  tables,
  token,
  onClose,
  onSuccess,
}: TransferTableModalProps) {
  const [targetTableId, setTargetTableId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const eligibleTables = tables.filter((t) => t.id !== sourceTableId);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetTableId) {
      setError('Please select destination table');
      return;
    }
    if (!token) {
      setError('Auth token missing');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await waiterService.transferTable(sourceTableId, targetTableId, token);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Transfer Table Orders</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Source Table</label>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold">
              Table {sourceTableNumber}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Destination Table *</label>
            <select
              value={targetTableId}
              onChange={(e) => setTargetTableId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:outline-none focus:border-amber-500/60"
            >
              <option value="">-- Select Destination Table --</option>
              {eligibleTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Table {t.tableNumber} ({t.status}, {t.capacity} seats)
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !targetTableId}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/10 active:scale-95"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm Transfer</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
