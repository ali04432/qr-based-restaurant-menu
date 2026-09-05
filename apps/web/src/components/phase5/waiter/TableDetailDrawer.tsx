'use client';

import React, { useState } from 'react';
import {
  X,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  Receipt,
  RotateCcw,
  Clock,
  Users,
  Utensils,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { waiterService } from '../../../services/waiter.service';
import { TableWithOrders } from '@qr-menu/shared';

interface TableDetailDrawerProps {
  table: TableWithOrders | null;
  isOpen: boolean;
  token: string | null;
  tables: TableWithOrders[];
  onClose: () => void;
  onRefresh: () => void;
  onOpenWalkIn: (tableId: string, tableNumber: string) => void;
  onOpenTransfer: (tableId: string) => void;
}

export function TableDetailDrawer({
  table,
  isOpen,
  token,
  tables,
  onClose,
  onRefresh,
  onOpenWalkIn,
  onOpenTransfer,
}: TableDetailDrawerProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !table) return null;

  const handleServeOrder = async (orderId: string) => {
    if (!token) return;
    try {
      setActionLoading(true);
      await waiterService.serveOrder(orderId, token);
      setFeedback('Order marked as served to table');
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Could not mark order served');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestBill = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      await waiterService.requestBill(table.id, token);
      setFeedback('Bill request dispatched to Cashier');
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Could not request bill');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseTable = async () => {
    if (!token) return;
    try {
      setActionLoading(true);
      await waiterService.closeTable(table.id, token);
      setFeedback('Table cleared and marked AVAILABLE');
      setTimeout(() => setFeedback(null), 3000);
      onRefresh();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Could not close table');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      case 'OCCUPIED':
        return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
      case 'READY_TO_SERVE':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40 animate-pulse';
      case 'PREPARING':
        return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
      case 'RESERVED':
        return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/70 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right-5 duration-200 text-slate-100">
        {/* Drawer Header */}
        <div className="px-6 py-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-base">
              {table.tableNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Table {table.tableNumber}</h2>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusBadge(
                    table.status
                  )}`}
                >
                  {table.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {table.capacity} Seats
                </span>
                {table.elapsedMinutes > 0 && (
                  <span className="flex items-center gap-1 text-amber-300">
                    <Clock className="w-3.5 h-3.5" />
                    Seated {table.elapsedMinutes} mins ago
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Action Toolbar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => onOpenWalkIn(table.id, table.tableNumber)}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-all active:scale-95 shadow-md shadow-amber-500/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Items</span>
            </button>

            <button
              onClick={() => onOpenTransfer(table.id)}
              disabled={table.activeOrders.length === 0}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 font-semibold text-xs border border-slate-700 transition-all active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>

            <button
              onClick={handleRequestBill}
              disabled={table.activeOrders.length === 0 || actionLoading}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-amber-300 font-semibold text-xs border border-amber-500/30 transition-all active:scale-95"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Request Bill</span>
            </button>

            <button
              onClick={handleCloseTable}
              disabled={actionLoading}
              className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 font-semibold text-xs border border-slate-700 hover:border-rose-500/30 transition-all active:scale-95"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Table</span>
            </button>
          </div>

          {/* Active Orders List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Active Orders ({table.activeOrders.length})
              </h3>
              <span className="text-xs font-mono font-bold text-amber-400">
                Table Total: PKR {table.totalAmount.toLocaleString()}
              </span>
            </div>

            {table.activeOrders.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/60 rounded-2xl border border-slate-800/80">
                <Utensils className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">No active orders for Table {table.tableNumber}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click "+ Add Items" above to seat guests and submit an order.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {table.activeOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-3"
                  >
                    {/* Order Header */}
                    <div className="flex items-center justify-between border-b border-slate-850 pb-2.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">#{order.orderNumber}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            order.status === 'READY'
                              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 animate-pulse'
                              : order.status === 'SERVED'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>

                      {order.status === 'READY' && (
                        <button
                          onClick={() => handleServeOrder(order.id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1 px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-md shadow-yellow-500/10"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Served</span>
                        </button>
                      )}
                    </div>

                    {/* Order Items Table */}
                    <div className="space-y-1.5 text-xs">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-slate-200 py-1 border-b border-slate-900/60 last:border-none">
                          <div className="truncate pr-2">
                            <span className="font-medium">{item.name}</span>
                            {item.specialInstructions && (
                              <p className="text-[10px] text-amber-400/80 italic">
                                Note: {item.specialInstructions}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-right flex-shrink-0">
                            <span className="text-slate-400 font-mono text-[11px]">x{item.quantity}</span>
                            <span className="font-mono font-semibold text-white">
                              Rs. {item.subtotal.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Total */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-850 text-xs font-bold">
                      <span className="text-slate-400">Order Subtotal</span>
                      <span className="text-amber-400 font-mono">PKR {order.total.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
