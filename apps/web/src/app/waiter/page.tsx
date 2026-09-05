'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Utensils,
  Plus,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  Bell,
  Check,
  AlertCircle,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Radio,
} from 'lucide-react';
import { Phase5Layout } from '../../components/phase5/Phase5Layout';
import { TableDetailDrawer } from '../../components/phase5/waiter/TableDetailDrawer';
import { WalkInOrderModal } from '../../components/phase5/waiter/WalkInOrderModal';
import { TransferTableModal } from '../../components/phase5/waiter/TransferTableModal';
import { waiterService } from '../../services/waiter.service';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import { TableWithOrders, WaiterSummary, CustomerRequestRecord } from '@qr-menu/shared';

export default function WaiterDashboardPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  const [summary, setSummary] = useState<WaiterSummary>({
    totalOrders: 0,
    servedOrders: 0,
    pendingOrders: 0,
    todaySales: 0,
    activeTables: 0,
  });

  const [tables, setTables] = useState<TableWithOrders[]>([]);
  const [requests, setRequests] = useState<CustomerRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Drawers State
  const [selectedTable, setSelectedTable] = useState<TableWithOrders | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInTableInfo, setWalkInTableInfo] = useState<{ id: string; number: string }>({ id: '', number: '' });

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');

  // Socket Connection for live updates
  const { on } = useSocket({
    restaurantId,
    token: token || undefined,
  });

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [sumData, tablesData, reqData] = await Promise.all([
        waiterService.getSummary(restaurantId, token).catch(() => ({
          totalOrders: 0,
          servedOrders: 0,
          pendingOrders: 0,
          todaySales: 0,
          activeTables: 0,
        })),
        waiterService.getTables(restaurantId, token).catch(() => []),
        waiterService.getCustomerRequests(token).catch(() => []),
      ]);

      setSummary(sumData);
      setTables(tablesData || []);
      setRequests(reqData || []);

      // If drawer is open, keep selected table in sync
      if (selectedTable) {
        const updated = tablesData?.find((t: TableWithOrders) => t.id === selectedTable.id);
        if (updated) setSelectedTable(updated);
      }
    } catch (err) {
      console.error('Failed to load waiter data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, selectedTable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time Socket.IO Listeners
  useEffect(() => {
    const unsubOrderCreated = on('order.created', () => fetchData());
    const unsubOrderStatus = on('order.statusChanged', () => fetchData());
    const unsubTableUpdated = on('table.updated', () => fetchData());
    const unsubReqCreated = on('customer.requestCreated', () => fetchData());
    const unsubReqResolved = on('customer.requestResolved', () => fetchData());
    const unsubPayment = on('payment.completed', () => fetchData());

    return () => {
      unsubOrderCreated();
      unsubOrderStatus();
      unsubTableUpdated();
      unsubReqCreated();
      unsubReqResolved();
      unsubPayment();
    };
  }, [on, fetchData]);

  const handleResolveRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await waiterService.resolveCustomerRequest(requestId, 'RESOLVED', token);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      alert(err.message || 'Could not resolve request');
    }
  };

  const handleOpenTableDetails = (table: TableWithOrders) => {
    setSelectedTable(table);
    setIsDrawerOpen(true);
  };

  const handleOpenWalkIn = (tId?: string, tNumber?: string) => {
    setWalkInTableInfo({ id: tId || '', number: tNumber || '' });
    setWalkInModalOpen(true);
  };

  const handleOpenTransfer = (tId: string) => {
    setTransferSourceId(tId);
    setTransferModalOpen(true);
  };

  // Filter Tables
  const filteredTables = tables.filter((t) => {
    const matchesSearch =
      !searchQuery ||
      t.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.activeOrders.some((o) => o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'READY_TO_SERVE') return t.status === 'READY_TO_SERVE';
    if (statusFilter === 'OCCUPIED') return t.status === 'OCCUPIED' || t.status === 'ORDERING' || t.status === 'PREPARING';
    if (statusFilter === 'AVAILABLE') return t.status === 'AVAILABLE';
    return t.status === statusFilter;
  });

  const getTableStatusClasses = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return {
          cardBorder: 'border-slate-800 hover:border-emerald-500/50',
          badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          indicator: 'bg-emerald-500',
        };
      case 'OCCUPIED':
      case 'ORDERING':
      case 'PREPARING':
        return {
          cardBorder: 'border-amber-500/30 hover:border-amber-500/60 bg-slate-900/90',
          badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          indicator: 'bg-amber-400',
        };
      case 'READY_TO_SERVE':
        return {
          cardBorder: 'border-yellow-500/70 hover:border-yellow-400 bg-amber-500/5 shadow-lg shadow-yellow-500/10 animate-pulse',
          badge: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
          indicator: 'bg-yellow-400 animate-ping',
        };
      case 'RESERVED':
        return {
          cardBorder: 'border-purple-500/30 hover:border-purple-500/50',
          badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
          indicator: 'bg-purple-400',
        };
      default:
        return {
          cardBorder: 'border-slate-800',
          badge: 'bg-slate-800 text-slate-300 border-slate-700',
          indicator: 'bg-slate-400',
        };
    }
  };

  const pendingRequestsCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <Phase5Layout
      role="WAITER"
      title="Waiter Operations Panel"
      subtitle="Floor table occupancy, live kitchen tickets & guest requests"
      headerAction={
        <button
          onClick={() => handleOpenWalkIn()}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Walk-in Order</span>
        </button>
      }
    >
      {/* Top 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Total Orders</span>
            <Utensils className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">{summary.totalOrders}</p>
          <p className="text-[11px] text-slate-500 mt-1">Dining & walk-in orders</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Served Orders</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-xl font-bold text-emerald-400 font-mono">{summary.servedOrders}</p>
          <p className="text-[11px] text-slate-500 mt-1">Delivered to guest tables</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Kitchen</span>
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-xl font-bold text-yellow-400 font-mono">{summary.pendingOrders}</p>
          <p className="text-[11px] text-slate-500 mt-1">In kitchen or ready</p>
        </div>

        <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Today's Sales</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-xl font-bold text-white font-mono">PKR {summary.todaySales.toLocaleString()}</p>
          <p className="text-[11px] text-slate-500 mt-1">Settled dining revenue</p>
        </div>
      </div>

      {/* Guest Assistance Calls Banner */}
      {requests.length > 0 && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 shadow-lg">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                Customer Assistance Requests ({pendingRequestsCount} Pending)
              </h3>
            </div>
            <button
              onClick={fetchData}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {requests.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">Table {req.tableNumber}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      {req.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  {req.message && <p className="text-[11px] text-slate-400 mt-0.5">{req.message}</p>}
                </div>

                <button
                  onClick={() => handleResolveRequest(req.id)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-all active:scale-95"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Resolve</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-5">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
          {[
            { id: 'ALL', label: 'All Tables' },
            { id: 'READY_TO_SERVE', label: 'Ready to Serve' },
            { id: 'OCCUPIED', label: 'Occupied' },
            { id: 'AVAILABLE', label: 'Available' },
            { id: 'RESERVED', label: 'Reserved' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm shadow-amber-500/20'
                  : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search table or order #..."
            className="w-full bg-slate-900 border border-slate-800 text-xs rounded-xl pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Table Grid (Reference Visual Source of Truth) */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800/80"></div>
          ))}
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 rounded-2xl border border-slate-800/80">
          <Utensils className="w-10 h-10 text-slate-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white">No dining tables found</h3>
          <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((tbl) => {
            const styles = getTableStatusClasses(tbl.status);
            const isReady = tbl.status === 'READY_TO_SERVE';
            const isOccupied = tbl.status !== 'AVAILABLE';
            const primaryOrder = tbl.activeOrders[0];

            return (
              <div
                key={tbl.id}
                onClick={() => handleOpenTableDetails(tbl)}
                className={`group relative bg-slate-900/90 border rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-200 hover:-translate-y-0.5 shadow-sm backdrop-blur-md ${styles.cardBorder}`}
              >
                {/* Top Row: Table Number & Seats */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white tracking-wide uppercase">
                      TABLE {tbl.tableNumber}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                      <Users className="w-3 h-3 text-slate-500" />
                      {tbl.capacity} Seats
                    </span>
                  </div>

                  {/* Center Visual Badge & Status */}
                  <div className="my-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${styles.indicator}`}></span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles.badge}`}
                      >
                        {tbl.status.replace(/_/g, ' ')}
                      </span>
                    </div>

                    {tbl.elapsedMinutes > 0 && (
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {tbl.elapsedMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Order Preview if Occupied */}
                  {isOccupied && primaryOrder ? (
                    <div className="pt-2.5 border-t border-slate-800/80 text-xs space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-200 truncate pr-1">
                          #{primaryOrder.orderNumber}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {primaryOrder.itemsCount} Items
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] text-slate-400">Total:</span>
                        <span className="font-bold text-amber-400 font-mono">
                          PKR {tbl.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2.5 border-t border-slate-800/60 text-xs text-slate-500 italic flex items-center justify-center py-2">
                      Table ready for seating
                    </div>
                  )}
                </div>

                {/* Bottom Card Action */}
                <div className="mt-3 pt-2 flex items-center justify-between border-t border-slate-850 text-xs font-semibold">
                  <span className="text-slate-400 group-hover:text-amber-400 transition-colors">
                    {isOccupied ? 'View Details' : 'Seat Guests'}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Slide-over Table Detail Drawer */}
      <TableDetailDrawer
        table={selectedTable}
        isOpen={isDrawerOpen}
        token={token}
        tables={tables}
        onClose={() => setIsDrawerOpen(false)}
        onRefresh={fetchData}
        onOpenWalkIn={(tId, tNum) => {
          setIsDrawerOpen(false);
          handleOpenWalkIn(tId, tNum);
        }}
        onOpenTransfer={(tId) => {
          setIsDrawerOpen(false);
          handleOpenTransfer(tId);
        }}
      />

      {/* Walk-in Order Modal */}
      <WalkInOrderModal
        isOpen={walkInModalOpen}
        tableId={walkInTableInfo.id}
        tableNumber={walkInTableInfo.number}
        restaurantId={restaurantId}
        token={token}
        tables={tables}
        onClose={() => setWalkInModalOpen(false)}
        onSuccess={() => fetchData()}
      />

      {/* Table Transfer Modal */}
      <TransferTableModal
        isOpen={transferModalOpen}
        sourceTableId={transferSourceId}
        sourceTableNumber={tables.find((t) => t.id === transferSourceId)?.tableNumber || ''}
        tables={tables}
        token={token}
        onClose={() => setTransferModalOpen(false)}
        onSuccess={() => fetchData()}
      />
    </Phase5Layout>
  );
}
