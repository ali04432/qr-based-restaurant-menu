'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  RefreshCw,
  Clock,
  Users,
  CheckCircle2,
  Check,
  ChevronRight,
  Utensils,
  LogOut,
  BellOff,
  Bell,
  Receipt,
  Calendar,
  Activity,
  UserCheck,
  Timer,
  FileText,
} from 'lucide-react';

import { WaiterLayout, WaiterSection } from './waiter-layout';
import { TableDetailDrawer } from '../../components/phase5/waiter/TableDetailDrawer';
import { WalkInOrderModal } from '../../components/phase5/waiter/WalkInOrderModal';
import { TransferTableModal } from '../../components/phase5/waiter/TransferTableModal';
import {
  FoodReadyAlert,
  useFoodReadyAlerts,
  playBellSound,
} from '../../components/waiter/FoodReadyAlert';
import {
  waiterService,
  WaiterShiftInfo,
  WaiterPersonalReport,
} from '../../services/waiter.service';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import {
  TableWithOrders,
  WaiterSummary,
  CustomerRequestRecord,
  ActiveOrderSummary,
} from '@qr-menu/shared';

// ============================================================
// Silver Sapoon — Waiter Dashboard (Redesigned)
// 5 Sections: Tables · Orders · Ready · Bills · Profile
// ============================================================

// ── Design tokens ──────────────────────────────────────────
const C = {
  bg: '#0B0B0D',
  card: '#151518',
  raised: '#1D1D21',
  border: '#26262B',
  textPrimary: '#F4EFE6',
  textMuted: '#A39F96',
  gold: '#D6A84F',
  teal: '#5BBFAE',
  blue: '#8FA3E8',
  orange: '#E7855A',
  muted: '#9A968D',
} as const;

// ── Helpers ─────────────────────────────────────────────────
function minutesAgo(isoString: string): number {
  return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function elapsedLabel(minutes: number): string {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m ago`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'PENDING':
    case 'RECEIVED':
      return C.blue;
    case 'PREPARING':
    case 'COOKING':
    case 'IN_KITCHEN':
      return C.gold;
    case 'READY':
      return C.teal;
    case 'SERVED':
    case 'COMPLETED':
      return C.muted;
    case 'CANCELLED':
      return '#EF4444';
    default:
      return C.textMuted;
  }
}

function statusLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

// ── Status badge pill ────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const color = getStatusColor(status);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full inline-block"
        style={{ background: color }}
      />
      {statusLabel(status)}
    </span>
  );
}

// ── Empty State ──────────────────────────────────────────────
function EmptyState({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center py-20 rounded-2xl"
      style={{
        border: `2px dashed ${C.border}`,
        background: `${C.card}60`,
      }}
    >
      <div className="mb-4" style={{ color: C.textMuted }}>
        {icon}
      </div>
      <h3
        className="text-base font-semibold mb-1"
        style={{ fontFamily: 'Playfair Display, Georgia, serif', color: C.textPrimary }}
      >
        {title}
      </h3>
      <p className="text-sm" style={{ color: C.textMuted }}>
        {subtitle}
      </p>
    </div>
  );
}

// ── Section meta ─────────────────────────────────────────────
const SECTION_META: Record<WaiterSection, { title: string; subtitle: string }> = {
  tables: {
    title: 'Floor Tables',
    subtitle: 'Manage table occupancy and guest seating',
  },
  orders: {
    title: 'Active Orders',
    subtitle: 'Live kitchen tickets and order status',
  },
  ready: {
    title: 'Ready to Serve',
    subtitle: 'Orders prepared by the kitchen awaiting table delivery',
  },
  bills: {
    title: 'Bills & Payments',
    subtitle: 'Send bills to cashier for settlement',
  },
  profile: {
    title: 'My Profile',
    subtitle: 'Your shift stats and account settings',
  },
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function WaiterDashboardPage() {
  const router = useRouter();
  const { user, token, logout, isAuthenticated, isLoading: authLoading } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  // ── Auth Guard: Redirect unauthenticated requests to waiter login ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/waiter/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // ── Core State ─────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<WaiterSection>('tables');
  const [summary, setSummary] = useState<WaiterSummary>({
    totalOrders: 0,
    servedOrders: 0,
    pendingOrders: 0,
    todaySales: 0,
    activeTables: 0,
  });
  const [tables, setTables] = useState<TableWithOrders[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [requests, setRequests] = useState<CustomerRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const userGestured = useRef(false);

  // ── Shift & Reporting State ─────────────────────────────────
  const [shiftInfo, setShiftInfo] = useState<WaiterShiftInfo | null>(null);
  const [reportData, setReportData] = useState<WaiterPersonalReport | null>(null);
  const [reportRange, setReportRange] = useState<'today' | 'yesterday' | 'this_week'>('today');
  const [shiftActionLoading, setShiftActionLoading] = useState(false);

  // ── Tables Section State ────────────────────────────────────
  type TableFilter = 'all' | 'free' | 'occ' | 'bill' | 'res';
  const [tableFilter, setTableFilter] = useState<TableFilter>('all');

  // ── Orders Section State ────────────────────────────────────
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');

  // ── Modals ─────────────────────────────────────────────────
  const [selectedTable, setSelectedTable] = useState<TableWithOrders | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [walkInModalOpen, setWalkInModalOpen] = useState(false);
  const [walkInTableInfo, setWalkInTableInfo] = useState<{ id: string; number: string }>({
    id: '',
    number: '',
  });
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferSourceId, setTransferSourceId] = useState('');

  // ── Serving State (prevent double-submit) ─────────────────
  const [servingOrderIds, setServingOrderIds] = useState<Set<string>>(new Set());

  // ── Bill State ─────────────────────────────────────────────
  const [sendingBillIds, setSendingBillIds] = useState<Set<string>>(new Set());
  type PaymentMethod = 'Cash' | 'Card' | 'Online';
  const [paymentMethods, setPaymentMethods] = useState<Record<string, PaymentMethod>>({});

  // ── Food-Ready Alerts ──────────────────────────────────────
  const { notifications, addAlert, dismiss: dismissAlert, seedSeenIds } = useFoodReadyAlerts(soundEnabled);

  // ── Socket ─────────────────────────────────────────────────
  const { on, isConnected, isConnecting } = useSocket({ restaurantId, token: token || undefined });

  const connectionStatus = isConnected ? 'connected' : isConnecting ? 'connecting' : 'disconnected';

  // ── Data Fetching ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);
      const [sumData, tablesData, reqData, ordersData, shiftRes, reportRes] = await Promise.all([
        waiterService
          .getSummary(restaurantId, token)
          .catch(() => ({
            totalOrders: 0,
            servedOrders: 0,
            pendingOrders: 0,
            todaySales: 0,
            activeTables: 0,
          })),
        waiterService.getTables(restaurantId, token).catch(() => []),
        waiterService.getCustomerRequests(token).catch(() => []),
        waiterService.getOrders({ limit: 50 }, token).catch(() => []),
        waiterService.getShift(token).catch(() => null),
        waiterService.getPersonalReport(reportRange, token).catch(() => null),
      ]);

      setSummary(sumData);
      setTables(tablesData || []);
      setRequests(reqData || []);
      setOrders(ordersData || []);
      if (shiftRes) setShiftInfo(shiftRes);
      if (reportRes) setReportData(reportRes);

      // Seed already-ready orders into seenIds so initial load does not trigger audible alarm
      if (ordersData && Array.isArray(ordersData)) {
        seedSeenIds(ordersData.filter((o: any) => o.status === 'READY').map((o: any) => o.id));
      }

      if (selectedTable) {
        const updated = (tablesData || []).find((t: TableWithOrders) => t.id === selectedTable.id);
        if (updated) setSelectedTable(updated);
      }
    } catch (err) {
      console.error('[WaiterDashboard] fetch failed', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token, selectedTable, reportRange, seedSeenIds]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Socket Listeners ───────────────────────────────────────
  useEffect(() => {
    const unsubOrderCreated = on('order.created', () => fetchData());
    const unsubTableUpdated = on('table.updated', () => fetchData());
    const unsubReqCreated = on('customer.requestCreated', () => fetchData());
    const unsubReqResolved = on('customer.requestResolved', () => fetchData());
    const unsubPayment = on('payment.completed', () => fetchData());

    const unsubOrderStatus = on('order.statusChanged', (payload: any) => {
      fetchData();
      // Trigger food-ready alert when order becomes READY
      if (payload?.status === 'READY' && payload?.id) {
        addAlert({
          id: payload.id,
          orderId: payload.id,
          orderNumber: payload.orderNumber || payload.id.slice(-6),
          tableNumber: payload.table?.tableNumber || payload.tableNumber || '?',
          items: Array.isArray(payload.items)
            ? payload.items.map((i: any) => ({ name: i.name || i.menuItem?.name || 'Item', quantity: i.quantity }))
            : [],
        });
      }
    });

    const unsubKitchenReady = on('kitchen.itemReady', (payload: any) => {
      if (payload?.orderId) {
        addAlert({
          id: payload.orderId,
          orderId: payload.orderId,
          orderNumber: payload.orderNumber || payload.orderId.slice(-6),
          tableNumber: payload.tableNumber || '?',
          items: Array.isArray(payload.items) ? payload.items : [],
        });
      }
    });

    return () => {
      unsubOrderCreated();
      unsubOrderStatus();
      unsubTableUpdated();
      unsubReqCreated();
      unsubReqResolved();
      unsubPayment();
      unsubKitchenReady();
    };
  }, [on, fetchData, addAlert]);

  // ── Activate audio on first user gesture ──────────────────
  useEffect(() => {
    const activate = () => {
      userGestured.current = true;
    };
    document.addEventListener('click', activate, { once: true });
    return () => document.removeEventListener('click', activate);
  }, []);

  // ── Handlers ───────────────────────────────────────────────
  const handleServeOrder = async (orderId: string) => {
    if (!token || servingOrderIds.has(orderId)) return;
    setServingOrderIds((prev) => new Set(prev).add(orderId));
    try {
      await waiterService.serveOrder(orderId, token);
      dismissAlert(orderId);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Could not mark as served');
    } finally {
      setServingOrderIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const handleRequestBill = async (tableId: string) => {
    if (!token || sendingBillIds.has(tableId)) return;
    setSendingBillIds((prev) => new Set(prev).add(tableId));
    try {
      await waiterService.requestBill(tableId, token);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Could not send bill to cashier');
    } finally {
      setSendingBillIds((prev) => {
        const next = new Set(prev);
        next.delete(tableId);
        return next;
      });
    }
  };

  const handleResolveRequest = async (requestId: string) => {
    if (!token) return;
    try {
      await waiterService.resolveCustomerRequest(requestId, 'RESOLVED', token);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      alert(err.message || 'Could not resolve request');
    }
  };

  const handleClockIn = async () => {
    if (!token || shiftActionLoading) return;
    setShiftActionLoading(true);
    try {
      await waiterService.clockIn(token);
      const [s, rep] = await Promise.all([
        waiterService.getShift(token).catch(() => null),
        waiterService.getPersonalReport(reportRange, token).catch(() => null),
      ]);
      if (s) setShiftInfo(s);
      if (rep) setReportData(rep);
    } catch (err: any) {
      alert(err.message || 'Failed to clock in');
    } finally {
      setShiftActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!token || shiftActionLoading) return;
    setShiftActionLoading(true);
    try {
      await waiterService.clockOut(token);
      const [s, rep] = await Promise.all([
        waiterService.getShift(token).catch(() => null),
        waiterService.getPersonalReport(reportRange, token).catch(() => null),
      ]);
      if (s) setShiftInfo(s);
      if (rep) setReportData(rep);
    } catch (err: any) {
      alert(err.message || 'Failed to clock out');
    } finally {
      setShiftActionLoading(false);
    }
  };

  const handleRangeChange = async (range: 'today' | 'yesterday' | 'this_week') => {
    setReportRange(range);
    if (!token) return;
    try {
      const rep = await waiterService.getPersonalReport(range, token);
      if (rep) setReportData(rep);
    } catch (err) {
      console.error('Failed to update report range', err);
    }
  };

  // ── Derived Data ───────────────────────────────────────────
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const billTables = tables.filter(
    (t) =>
      t.status === 'READY_TO_SERVE' ||
      requests.some((r) => r.tableId === t.id && r.type === 'BILL_REQUEST' && r.status === 'PENDING')
  );

  const badgeCounts = {
    orders: orders.filter((o) => !['SERVED', 'COMPLETED', 'CANCELLED'].includes(o.status)).length,
    ready: readyOrders.length,
    bills: billTables.length,
  };

  // ── Table Filtering ────────────────────────────────────────
  const filteredTables = tables.filter((t) => {
    if (tableFilter === 'free') return t.status === 'AVAILABLE';
    if (tableFilter === 'occ')
      return ['OCCUPIED', 'ORDERING', 'PREPARING'].includes(t.status);
    if (tableFilter === 'bill')
      return (
        t.status === 'READY_TO_SERVE' ||
        requests.some(
          (r) => r.tableId === t.id && r.type === 'BILL_REQUEST' && r.status === 'PENDING'
        )
      );
    if (tableFilter === 'res') return t.status === 'RESERVED';
    return true;
  });

  // ── Filtered Orders ────────────────────────────────────────
  const filteredOrders =
    orderStatusFilter === 'ALL'
      ? orders
      : orders.filter((o) => o.status === orderStatusFilter);

  // ── Section meta ───────────────────────────────────────────
  const meta = SECTION_META[activeSection];

  // ===========================================================
  // RENDER SECTIONS
  // ===========================================================

  // ── TABLES ─────────────────────────────────────────────────
  const renderTables = () => {
    const TABLE_FILTERS: { id: TableFilter; label: string }[] = [
      { id: 'all', label: 'All Tables' },
      { id: 'free', label: 'Free' },
      { id: 'occ', label: 'Occupied' },
      { id: 'bill', label: 'Bill Requested' },
      { id: 'res', label: 'Reserved' },
    ];

    return (
      <div>
        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {TABLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTableFilter(f.id)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={
                tableFilter === f.id
                  ? { background: C.gold, color: '#0B0B0D', fontWeight: 700 }
                  : {
                      background: C.card,
                      color: C.textMuted,
                      border: `1px solid ${C.border}`,
                    }
              }
            >
              {f.label}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all"
            style={{ background: C.raised, color: C.textMuted, border: `1px solid ${C.border}` }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}>
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-2xl animate-pulse"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              />
            ))}
          </div>
        ) : filteredTables.length === 0 ? (
          <EmptyState
            icon={<Utensils className="w-10 h-10" />}
            title="No tables found"
            subtitle="Try a different filter"
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))' }}
          >
            {filteredTables.map((tbl) => {
              const hasBillReq = requests.some(
                (r) => r.tableId === tbl.id && r.type === 'BILL_REQUEST' && r.status === 'PENDING'
              );
              const isBill = tbl.status === 'READY_TO_SERVE' || hasBillReq;
              const isReady = tbl.status === 'READY_TO_SERVE';
              const isOcc = ['OCCUPIED', 'ORDERING', 'PREPARING'].includes(tbl.status);
              const isRes = tbl.status === 'RESERVED';
              const isFree = tbl.status === 'AVAILABLE';
              const primaryOrder = tbl.activeOrders[0];

              let borderColor: string = C.border;
              let dotColor: string = C.textMuted;
              let statusText = tbl.status.replace(/_/g, ' ');
              if (isFree) { borderColor = '#5BBFAE40'; dotColor = '#5BBFAE'; }
              else if (isBill) { borderColor = '#E7855A50'; dotColor = C.orange; }
              else if (isOcc) { borderColor = `${C.gold}40`; dotColor = C.gold; }
              else if (isRes) { borderColor = `${C.blue}40`; dotColor = C.blue; }

              return (
                <div
                  key={tbl.id}
                  onClick={() => { setSelectedTable(tbl); setIsDrawerOpen(true); }}
                  className="rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all duration-150 hover:-translate-y-0.5 group"
                  style={{
                    background: C.card,
                    border: `1px solid ${borderColor}`,
                    boxShadow: isReady ? `0 4px 24px rgba(91,191,174,0.12)` : undefined,
                  }}
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="text-base font-semibold"
                      style={{
                        color: C.gold,
                        fontFamily: 'Playfair Display, Georgia, serif',
                      }}
                    >
                      T{tbl.tableNumber}
                    </span>
                    <span className="flex items-center gap-1 text-[11px]" style={{ color: C.textMuted }}>
                      <Users className="w-3 h-3" />
                      {tbl.capacity}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: dotColor,
                        boxShadow: isReady ? `0 0 6px ${dotColor}` : undefined,
                      }}
                    />
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{
                        background: `${dotColor}20`,
                        color: dotColor,
                        border: `1px solid ${dotColor}30`,
                      }}
                    >
                      {statusText}
                    </span>
                    {tbl.elapsedMinutes > 0 && (
                      <span className="ml-auto text-[10px]" style={{ color: C.textMuted }}>
                        <Clock className="w-3 h-3 inline mr-0.5" />
                        {tbl.elapsedMinutes}m
                      </span>
                    )}
                  </div>

                  {/* Order summary */}
                  {primaryOrder ? (
                    <div
                      className="border-t pt-2.5 text-xs space-y-1"
                      style={{ borderColor: C.border }}
                    >
                      <div className="flex justify-between items-center">
                        <span style={{ color: C.textMuted }}>#{primaryOrder.orderNumber}</span>
                        <span style={{ color: C.textMuted }}>{primaryOrder.itemsCount} items</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span style={{ color: C.textMuted }}>Total</span>
                        <span
                          className="font-bold"
                          style={{ color: C.gold }}
                        >
                          PKR {tbl.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="border-t pt-2 text-xs text-center italic"
                      style={{ borderColor: C.border, color: C.textMuted }}
                    >
                      Ready for seating
                    </div>
                  )}

                  {/* CTA row */}
                  <div
                    className="flex items-center justify-between mt-3 pt-2 border-t text-xs font-semibold"
                    style={{ borderColor: C.border }}
                  >
                    {/* Quick action buttons */}
                    {isFree ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWalkInTableInfo({ id: tbl.id, number: tbl.tableNumber });
                          setWalkInModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all active:scale-95"
                        style={{ background: C.gold, color: '#0B0B0D' }}
                      >
                        Start order
                      </button>
                    ) : isBill ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(tbl);
                          setActiveSection('bills');
                        }}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{
                          background: `${C.orange}20`,
                          color: C.orange,
                          border: `1px solid ${C.orange}40`,
                        }}
                      >
                        Open bill
                      </button>
                    ) : isRes ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setWalkInTableInfo({ id: tbl.id, number: tbl.tableNumber });
                          setWalkInModalOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: C.raised, color: C.blue, border: `1px solid ${C.blue}40` }}
                      >
                        Seat guests
                      </button>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTable(tbl);
                          setIsDrawerOpen(true);
                        }}
                        className="px-3 py-1 rounded-lg text-[11px] font-semibold transition-all"
                        style={{ background: C.raised, color: C.textMuted, border: `1px solid ${C.border}` }}
                      >
                        Add items
                      </button>
                    )}
                    <ChevronRight
                      className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                      style={{ color: C.textMuted }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── ORDERS ─────────────────────────────────────────────────
  const renderOrders = () => {
    const statusOptions = ['ALL', 'PENDING', 'RECEIVED', 'PREPARING', 'READY', 'SERVED'];
    return (
      <div>
        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {statusOptions.map((s) => (
            <button
              key={s}
              onClick={() => setOrderStatusFilter(s)}
              className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
              style={
                orderStatusFilter === s
                  ? { background: C.gold, color: '#0B0B0D', fontWeight: 700 }
                  : { background: C.card, color: C.textMuted, border: `1px solid ${C.border}` }
              }
            >
              {s === 'ALL' ? 'All' : statusLabel(s)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-20 rounded-2xl animate-pulse"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={<Utensils className="w-10 h-10" />}
            title="No orders"
            subtitle="Orders will appear here when placed"
          />
        ) : (
          <div className="space-y-2.5">
            {filteredOrders.map((o) => {
              const statusColor = getStatusColor(o.status);
              const created = o.createdAt ? minutesAgo(o.createdAt) : 0;
              const itemsPreview = Array.isArray(o.items)
                ? o.items.map((i: any) => `${i.name || i.menuItem?.name} ×${i.quantity}`).join(', ')
                : '';
              return (
                <div
                  key={o.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-2xl transition-all"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.border}`,
                  }}
                >
                  {/* Table indicator */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${C.gold}18` }}
                  >
                    <span
                      className="text-lg font-semibold"
                      style={{ color: C.gold, fontFamily: 'Playfair Display, Georgia, serif' }}
                    >
                      {o.tableNumber || o.table?.tableNumber || '—'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold" style={{ color: C.textPrimary }}>
                        #{o.orderNumber || o.id?.slice(-6)}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                    <p className="text-xs truncate mb-1" style={{ color: C.textMuted }}>
                      {itemsPreview || 'No items'}
                    </p>
                    <p className="text-[11px]" style={{ color: C.textMuted }}>
                      {elapsedLabel(created)}
                      {o.createdAt ? ` · ${formatTime(o.createdAt)}` : ''}
                    </p>
                  </div>

                  {/* Total */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold" style={{ color: C.gold }}>
                      PKR {(o.total || o.totalAmount || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── READY TO SERVE ─────────────────────────────────────────
  const renderReady = () => {
    return (
      <div>
        {readyOrders.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-10 h-10" />}
            title="All caught up"
            subtitle="No orders ready for delivery right now"
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
          >
            {readyOrders.map((o) => {
              const readyMinutes = o.readyAt ? minutesAgo(o.readyAt) : o.updatedAt ? minutesAgo(o.updatedAt) : 0;
              const isServing = servingOrderIds.has(o.id);
              const itemsPreview = Array.isArray(o.items) ? o.items : [];

              return (
                <div
                  key={o.id}
                  className="rounded-2xl p-5 flex flex-col gap-3"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.teal}50`,
                    boxShadow: `0 4px 20px rgba(91,191,174,0.1)`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="text-base font-semibold"
                        style={{
                          color: C.textPrimary,
                          fontFamily: 'Playfair Display, Georgia, serif',
                        }}
                      >
                        Table {o.tableNumber || o.table?.tableNumber || '—'}
                      </span>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        #{o.orderNumber || o.id?.slice(-6)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-xs font-semibold px-2 py-1 rounded-full"
                        style={{ background: `${C.teal}20`, color: C.teal }}
                      >
                        Ready {readyMinutes > 0 ? `${readyMinutes}m ago` : 'just now'}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  {itemsPreview.length > 0 && (
                    <ul className="space-y-1">
                      {itemsPreview.map((item: any, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs"
                          style={{ color: C.textMuted }}
                        >
                          <span>
                            {item.name || item.menuItem?.name || 'Item'} ×{item.quantity}
                          </span>
                          {item.subtotal != null && (
                            <span style={{ color: C.textPrimary }}>
                              PKR {item.subtotal.toLocaleString()}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Total */}
                  <div
                    className="flex justify-between items-center border-t pt-2"
                    style={{ borderColor: C.border }}
                  >
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      Total
                    </span>
                    <span className="text-sm font-bold" style={{ color: C.gold }}>
                      PKR {(o.total || o.totalAmount || 0).toLocaleString()}
                    </span>
                  </div>

                  {/* Mark as Served */}
                  <button
                    onClick={() => handleServeOrder(o.id)}
                    disabled={isServing}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: isServing ? `${C.gold}60` : C.gold,
                      color: '#0B0B0D',
                      cursor: isServing ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isServing ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    {isServing ? 'Marking served…' : 'Mark as Served'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── BILLS ──────────────────────────────────────────────────
  const renderBills = () => {
    return (
      <div>
        {billTables.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-10 h-10" />}
            title="No pending bills"
            subtitle="Tables requesting bills will appear here"
          />
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}
          >
            {billTables.map((tbl) => {
              const isSending = sendingBillIds.has(tbl.id);
              const method = paymentMethods[tbl.id] || 'Cash';
              const primaryOrder = tbl.activeOrders[0];

              // Use API-calculated totals — do NOT recalculate in browser
              const subtotal = primaryOrder ? (tbl.totalAmount * 100) / 116 : 0; // rough GST reverse if no subtotal field
              const total = tbl.totalAmount;

              return (
                <div
                  key={tbl.id}
                  className="rounded-2xl p-5 flex flex-col gap-4"
                  style={{
                    background: C.card,
                    border: `1px solid ${C.orange}40`,
                    boxShadow: `0 4px 20px rgba(231,133,90,0.08)`,
                  }}
                >
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className="text-base font-semibold"
                        style={{
                          color: C.textPrimary,
                          fontFamily: 'Playfair Display, Georgia, serif',
                        }}
                      >
                        Table {tbl.tableNumber}
                      </span>
                      <p className="text-xs" style={{ color: C.textMuted }}>
                        {tbl.capacity} seats · {tbl.activeOrdersCount} order(s)
                      </p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2.5 py-1 rounded-full"
                      style={{ background: `${C.orange}20`, color: C.orange }}
                    >
                      Bill Requested
                    </span>
                  </div>

                  {/* Order items summary */}
                  {primaryOrder && primaryOrder.items.length > 0 && (
                    <ul className="space-y-1">
                      {primaryOrder.items.slice(0, 5).map((item: any, idx: number) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between text-xs"
                          style={{ color: C.textMuted }}
                        >
                          <span>
                            {item.name} ×{item.quantity}
                          </span>
                          <span style={{ color: C.textPrimary }}>
                            PKR {(item.subtotal || item.unitPrice * item.quantity || 0).toLocaleString()}
                          </span>
                        </li>
                      ))}
                      {primaryOrder.items.length > 5 && (
                        <li className="text-[11px]" style={{ color: C.textMuted }}>
                          +{primaryOrder.items.length - 5} more items
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Total */}
                  <div
                    className="flex justify-between items-center border-t pt-2"
                    style={{ borderColor: C.border }}
                  >
                    <span className="text-xs" style={{ color: C.textMuted }}>
                      Total
                    </span>
                    <span className="text-base font-bold" style={{ color: C.gold }}>
                      PKR {total.toLocaleString()}
                    </span>
                  </div>

                  {/* Payment method pills */}
                  <div className="flex gap-2">
                    {(['Cash', 'Card', 'Online'] as PaymentMethod[]).map((m) => (
                      <button
                        key={m}
                        onClick={() =>
                          setPaymentMethods((prev) => ({ ...prev, [tbl.id]: m }))
                        }
                        className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all"
                        style={
                          method === m
                            ? { background: `${C.gold}25`, color: C.gold, border: `1px solid ${C.gold}60` }
                            : {
                                background: C.raised,
                                color: C.textMuted,
                                border: `1px solid ${C.border}`,
                              }
                        }
                      >
                        {m}
                      </button>
                    ))}
                  </div>

                  {/* Send to cashier */}
                  <button
                    onClick={() => handleRequestBill(tbl.id)}
                    disabled={isSending}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{
                      background: isSending ? `${C.orange}60` : C.orange,
                      color: '#0B0B0D',
                      cursor: isSending ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isSending ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    {isSending ? 'Sending…' : 'Send to Cashier'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // ── PROFILE ────────────────────────────────────────────────
  const renderProfile = () => {
    const name = user?.name || user?.email || 'Waiter';
    const role = user?.role || 'WAITER';
    const initials = name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const activeTables = tables.filter((t) => t.status !== 'AVAILABLE' && t.status !== 'RESERVED');

    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Avatar card */}
        <div
          className="rounded-2xl p-6 flex flex-col items-center gap-3"
          style={{ background: C.card, border: `1px solid ${C.border}` }}
        >
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: C.gold, color: '#0B0B0D' }}
          >
            {initials}
          </div>
          <div className="text-center">
            <h3
              className="text-xl font-semibold"
              style={{ color: C.textPrimary, fontFamily: 'Playfair Display, Georgia, serif' }}
            >
              {name}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: C.textMuted }}>
              {role.charAt(0) + role.slice(1).toLowerCase()} · Silver Sapoon
            </p>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tables Served', value: summary.servedOrders, color: C.teal },
            { label: 'Orders Taken', value: summary.totalOrders, color: C.gold },
            { label: 'Avg Serve Time', value: 'N/A', color: C.textMuted, note: 'Not tracked' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl p-4 text-center"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <p
                className="text-2xl font-bold mb-1"
                style={{ color: s.color }}
              >
                {s.value}
              </p>
              <p className="text-xs" style={{ color: C.textMuted }}>
                {s.label}
              </p>
              {s.note && (
                <p className="text-[10px] mt-0.5" style={{ color: C.textMuted }}>
                  {s.note}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Active tables */}
        {activeTables.length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <h4
              className="text-sm font-semibold mb-3"
              style={{ color: C.textPrimary }}
            >
              Assigned Active Tables
            </h4>
            <div className="flex flex-wrap gap-2">
              {activeTables.map((t) => (
                <span
                  key={t.id}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ background: `${C.gold}20`, color: C.gold, border: `1px solid ${C.gold}40` }}
                >
                  T{t.tableNumber}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Customer requests */}
        {requests.filter((r) => r.status === 'PENDING').length > 0 && (
          <div
            className="rounded-2xl p-4"
            style={{ background: C.card, border: `1px solid ${C.border}` }}
          >
            <h4 className="text-sm font-semibold mb-3" style={{ color: C.textPrimary }}>
              Pending Requests ({requests.filter((r) => r.status === 'PENDING').length})
            </h4>
            <div className="space-y-2">
              {requests
                .filter((r) => r.status === 'PENDING')
                .map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-xl text-xs"
                    style={{ background: C.raised, border: `1px solid ${C.border}` }}
                  >
                    <div>
                      <span className="font-semibold" style={{ color: C.textPrimary }}>
                        Table {req.tableNumber}
                      </span>
                      <span className="ml-2" style={{ color: C.textMuted }}>
                        {req.type.replace(/_/g, ' ')}
                      </span>
                      {req.message && (
                        <p style={{ color: C.textMuted }} className="mt-0.5">
                          {req.message}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleResolveRequest(req.id)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={{
                        background: 'rgba(34,197,94,0.15)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.3)',
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Resolve
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sign out */}
        <button
          onClick={() => logout?.()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all"
          style={{
            background: C.raised,
            color: '#EF4444',
            border: '1px solid rgba(239,68,68,0.3)',
          }}
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    );
  };

  // ===========================================================
  // MAIN RENDER
  // ===========================================================
  return (
    <>
      <WaiterLayout
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        badgeCounts={badgeCounts}
        userName={user?.name || user?.email || 'Waiter'}
        userRole={user?.role || 'WAITER'}
        connectionStatus={connectionStatus}
        soundEnabled={soundEnabled}
        onToggleSound={() => setSoundEnabled((p) => !p)}
        sectionTitle={meta.title}
        sectionSubtitle={meta.subtitle}
      >
        {activeSection === 'tables' && renderTables()}
        {activeSection === 'orders' && renderOrders()}
        {activeSection === 'ready' && renderReady()}
        {activeSection === 'bills' && renderBills()}
        {activeSection === 'profile' && renderProfile()}
      </WaiterLayout>

      {/* Food Ready Toast Alerts */}
      <FoodReadyAlert
        notifications={notifications}
        onDismiss={dismissAlert}
        onView={(orderId) => {
          dismissAlert(orderId);
          setActiveSection('ready');
        }}
        soundEnabled={soundEnabled}
      />

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
          setWalkInTableInfo({ id: tId, number: tNum });
          setWalkInModalOpen(true);
        }}
        onOpenTransfer={(tId) => {
          setIsDrawerOpen(false);
          setTransferSourceId(tId);
          setTransferModalOpen(true);
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
    </>
  );
}
