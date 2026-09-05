'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Droplets,
  Utensils,
  Receipt,
  HelpCircle,
  RefreshCw,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Plus,
  Table as TableIcon,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { Phase5Layout } from '../../../components/phase5/Phase5Layout';
import { useAuthContext } from '../../../context/AuthContext';
import { useSocket } from '../../../hooks/useSocket';
import { waiterService } from '../../../services/waiter.service';
import { CustomerRequestRecord, TableWithOrders, CustomerRequestType } from '@qr-menu/shared';

export default function WaiterNotificationsPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [requests, setRequests] = useState<CustomerRequestRecord[]>([]);
  const [tables, setTables] = useState<TableWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // New Request Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newTableId, setNewTableId] = useState('');
  const [newType, setNewType] = useState<CustomerRequestType>('CALL_WAITER');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [reqData, tableData] = await Promise.all([
        waiterService.getCustomerRequests(token),
        waiterService.getTables(restaurantId, token),
      ]);
      setRequests(reqData || []);
      setTables(tableData || []);
    } catch (err) {
      console.error('Failed to load customer requests:', err);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time socket events
  const { isConnected, on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  useEffect(() => {
    const unsub1 = on('CUSTOMER_REQUEST_CREATED', (newReq: any) => {
      setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      if (soundEnabled) {
        try {
          const audio = new Audio('/sounds/notification.mp3');
          audio.play().catch(() => {});
        } catch (_) {}
      }
    });

    const unsub2 = on('CUSTOMER_REQUEST_RESOLVED', (updatedReq: any) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === updatedReq.id ? { ...r, status: updatedReq.status } : r))
      );
    });

    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [on, soundEnabled]);

  const handleResolve = async (id: string) => {
    if (!token) return;
    try {
      setResolvingId(id);
      await waiterService.resolveCustomerRequest(id, 'RESOLVED', token);
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: 'RESOLVED' as any } : r))
      );
    } catch (err) {
      console.error('Failed to resolve request:', err);
    } finally {
      setResolvingId(null);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newTableId) return;
    try {
      setSubmitting(true);
      const created = await waiterService.createCustomerRequest(
        {
          tableId: newTableId,
          type: newType,
          message: newMessage || undefined,
        },
        token
      );
      setRequests((prev) => [created, ...prev]);
      setModalOpen(false);
      setNewTableId('');
      setNewMessage('');
    } catch (err) {
      console.error('Failed to create assistance request:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (searchQuery) {
      const matchTable = r.tableNumber.toLowerCase().includes(searchQuery.toLowerCase());
      const matchMsg = (r.message || '').toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchTable && !matchMsg) return false;
    }
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const waterCount = requests.filter((r) => r.status === 'PENDING' && r.type === 'WATER').length;
  const billCount = requests.filter((r) => r.status === 'PENDING' && r.type === 'BILL_REQUEST').length;
  const cutleryCount = requests.filter(
    (r) => r.status === 'PENDING' && (r.type === 'EXTRA_PLATES' || r.type === 'NAPKINS')
  ).length;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'WATER':
        return <Droplets className="w-5 h-5 text-sky-400" />;
      case 'EXTRA_PLATES':
      case 'NAPKINS':
        return <Utensils className="w-5 h-5 text-amber-400" />;
      case 'BILL_REQUEST':
        return <Receipt className="w-5 h-5 text-emerald-400" />;
      default:
        return <Bell className="w-5 h-5 text-purple-400" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'WATER':
        return 'Water Refill';
      case 'EXTRA_PLATES':
        return 'Extra Plates';
      case 'NAPKINS':
        return 'Napkins & Cutlery';
      case 'BILL_REQUEST':
        return 'Bill & Receipt Request';
      default:
        return 'Captain Assistance';
    }
  };

  const getElapsed = (dateStr: string) => {
    const elapsedMs = Date.now() - new Date(dateStr).getTime();
    const min = Math.max(0, Math.floor(elapsedMs / 60000));
    if (min < 1) return 'Just now';
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    return `${hr}h ${min % 60}m ago`;
  };

  return (
    <Phase5Layout
      role="WAITER"
      title="Alerts & Guest Requests"
      subtitle="Real-time guest assistance calls, dining inquiries, and immediate service alerts"
      headerAction={
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Alert Sounds' : 'Unmute Alert Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Log Request</span>
          </button>

          <button
            onClick={fetchRequests}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all disabled:opacity-50"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Counter Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Pending Calls
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{pendingCount}</h3>
              <p className="text-[10px] text-amber-400/90 font-medium mt-0.5">Require attention</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Water Refills
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{waterCount}</h3>
              <p className="text-[10px] text-sky-400/90 font-medium mt-0.5">Active glass requests</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Droplets className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Bill Inquiries
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{billCount}</h3>
              <p className="text-[10px] text-emerald-400/90 font-medium mt-0.5">Ready for checkout</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Receipt className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex items-center justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
            <div>
              <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">
                Cutlery / Plates
              </p>
              <h3 className="text-2xl font-black text-white mt-1">{cutleryCount}</h3>
              <p className="text-[10px] text-purple-400/90 font-medium mt-0.5">Service items</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800/80 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter('RESOLVED')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'RESOLVED'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Resolved
            </button>
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
          </div>

          {/* Type Filter Buttons */}
          <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none text-xs">
            {['ALL', 'CALL_WAITER', 'WATER', 'EXTRA_PLATES', 'NAPKINS', 'BILL_REQUEST'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1 rounded-xl border text-[11px] font-medium whitespace-nowrap transition-all ${
                  filterType === type
                    ? 'bg-slate-800 border-amber-500/40 text-amber-400'
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {type === 'ALL'
                  ? 'All Types'
                  : type === 'CALL_WAITER'
                  ? 'Call Waiter'
                  : type === 'WATER'
                  ? 'Water'
                  : type === 'EXTRA_PLATES'
                  ? 'Plates'
                  : type === 'NAPKINS'
                  ? 'Napkins'
                  : 'Bill'}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search table or note..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-all"
            />
          </div>
        </div>

        {/* Requests List */}
        {loading && requests.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/50 rounded-2xl border border-slate-800">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">Listening for guest alerts...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-16 text-center bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-500/60" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No Active Requests</h4>
            <p className="text-xs text-slate-400 max-w-sm">
              All tables are currently attended to. New guest notifications and captain calls will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRequests.map((req) => {
              const isPending = req.status === 'PENDING';
              const elapsedMs = Date.now() - new Date(req.createdAt).getTime();
              const isUrgent = isPending && elapsedMs > 5 * 60000;

              return (
                <div
                  key={req.id}
                  className={`bg-slate-900/90 border rounded-2xl p-4 shadow-xl transition-all relative flex flex-col justify-between overflow-hidden ${
                    isUrgent
                      ? 'border-rose-500/60 ring-1 ring-rose-500/20'
                      : isPending
                      ? 'border-amber-500/30'
                      : 'border-slate-800 opacity-70'
                  }`}
                >
                  {/* Top Bar with Table Badge & Elapsed */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <div className="px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center space-x-1.5">
                          <TableIcon className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-black text-amber-300">
                            Table {req.tableNumber}
                          </span>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isPending
                              ? isUrgent
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isPending ? (isUrgent ? 'Overdue (>5m)' : 'Pending') : 'Resolved'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] text-slate-400 font-medium">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{getElapsed(req.createdAt)}</span>
                      </div>
                    </div>

                    {/* Request Details */}
                    <div className="flex items-start space-x-3 my-2">
                      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex-shrink-0">
                        {getTypeIcon(req.type)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-white flex items-center space-x-1.5">
                          <span>{getTypeLabel(req.type)}</span>
                        </h4>
                        {req.message ? (
                          <p className="text-xs text-slate-300 mt-1 bg-slate-950/60 p-2 rounded-xl border border-slate-800/60 font-mono">
                            "{req.message}"
                          </p>
                        ) : (
                          <p className="text-xs text-slate-500 italic mt-0.5">
                            Guest requested assistance from digital menu.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action / Assigned Info */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                    {req.assignedToName ? (
                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400">
                        <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                        <span>Served by {req.assignedToName}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500">Unassigned</span>
                    )}

                    {isPending ? (
                      <button
                        onClick={() => handleResolve(req.id)}
                        disabled={resolvingId === req.id}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-slate-950 text-xs font-bold shadow-md shadow-emerald-500/20 transition-all disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{resolvingId === req.id ? 'Resolving...' : 'Mark Attended'}</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completed</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manual Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Log Table Assistance</h3>
                  <p className="text-xs text-slate-400">Create an alert for table service</p>
                </div>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Dining Table <span className="text-rose-400">*</span>
                </label>
                <select
                  value={newTableId}
                  onChange={(e) => setNewTableId(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500/60"
                >
                  <option value="">Select Table...</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      Table {t.tableNumber} ({t.status})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Request Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CALL_WAITER', label: 'Call Waiter', icon: Bell },
                    { id: 'WATER', label: 'Water Refill', icon: Droplets },
                    { id: 'EXTRA_PLATES', label: 'Extra Plates', icon: Utensils },
                    { id: 'BILL_REQUEST', label: 'Bill Request', icon: Receipt },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setNewType(item.id as CustomerRequestType)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center space-x-2 transition-all ${
                          newType === item.id
                            ? 'bg-amber-500/10 border-amber-500/50 text-amber-300'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Note / Special Instruction (Optional)
                </label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="e.g. 2 warm glasses of water, extra forks..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !newTableId}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Creating...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Phase5Layout>
  );
}
