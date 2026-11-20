'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { DashboardLayout } from '../../components/dashboard/DashboardLayout';
import { DashboardHeader, DateFilterOption } from '../../components/dashboard/DashboardHeader';
import { DashboardKPICards } from '../../components/dashboard/DashboardKPICards';
import { DashboardRevenueChart } from '../../components/dashboard/DashboardRevenueChart';
import { DashboardRevenueDonut } from '../../components/dashboard/DashboardRevenueDonut';
import { DashboardPaymentAnalytics } from '../../components/dashboard/DashboardPaymentAnalytics';
import { DashboardPeakHoursChart, PeakHourSlot } from '../../components/dashboard/DashboardPeakHoursChart';
import { DashboardCustomerAnalytics } from '../../components/dashboard/DashboardCustomerAnalytics';
import { DashboardLiveKitchen, KitchenTicket } from '../../components/dashboard/DashboardLiveKitchen';
import { DashboardQRWidget } from '../../components/dashboard/DashboardQRWidget';
import { DashboardARWidget } from '../../components/dashboard/DashboardARWidget';
import { DashboardInventoryWidget } from '../../components/dashboard/DashboardInventoryWidget';
import { DashboardStaffWidget } from '../../components/dashboard/DashboardStaffWidget';
import { DashboardRecentOrders } from '../../components/dashboard/DashboardRecentOrders';
import { DashboardTopSelling } from '../../components/dashboard/DashboardTopSelling';
import { DashboardQuickStats } from '../../components/dashboard/DashboardQuickStats';
import { DashboardLowStock } from '../../components/dashboard/DashboardLowStock';

import { adminService } from '../../services/admin.service';
import { useAuthContext } from '../../context/AuthContext';
import { useSocket } from '../../hooks/useSocket';
import {
  AdminDashboardOverview,
  AnalyticsSummary,
  PaymentSummary,
  Table,
  ArAsset,
  InventoryItemSummary,
  StaffUser,
  AdminNotification,
} from '@qr-menu/shared';

/** Convert an API order into the shape expected by the Live Kitchen widget. */
function toKitchenTicket(order: any): KitchenTicket | null {
  if (!order?.id) return null;

  const items = Array.isArray(order.items) ? order.items : [];

  return {
    id: String(order.id),
    orderNumber: order.orderNumber || `ORD-${String(order.id).slice(0, 4)}`,
    tableNumber: String(order.table?.tableNumber || order.tableNumber || '01'),
    status: order.status || 'PENDING',
    itemCount: items.length || Number(order.itemCount) || 1,
    items,
    createdAt: order.createdAt || new Date().toISOString(),
  };
}

/** Log individual request failures while allowing the rest of the dashboard to load. */
function logRequestFailure<T>(
  label: string,
  result: PromiseSettledResult<T>
): void {
  if (result.status === 'rejected') {
    console.warn(`[AdminDashboard] ${label} request failed:`, result.reason);
  }
}

export default function AdminDashboardPage() {
  const { user, token } = useAuthContext();

  // Do not send requests using a made-up restaurant ID. The dashboard needs a real
  // restaurant scope from the authenticated user.
  const restaurantId = user?.restaurantId || '';

  // Request counters prevent an older response from overwriting newer dashboard data.
  const dataRequestId = useRef(0);
  const analyticsRequestId = useRef(0);

  // Dashboard data
  const [overview, setOverview] = useState<AdminDashboardOverview | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [customerSummary, setCustomerSummary] = useState<{
    totalCustomers: number;
    totalSpend: number;
    totalOrders: number;
    averageSpendPerCustomer: number;
  } | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [arAssets, setArAssets] = useState<ArAsset[]>([]);
  const [arAnalytics, setArAnalytics] = useState<{ totalEvents: number } | null>(null);
  const [inventory, setInventory] = useState<InventoryItemSummary[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenTicket[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);

  // Filter and search controls
  const [dateRange, setDateRange] = useState<DateFilterOption>('7d');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time Socket.IO connection
  const { isConnected, on } = useSocket({
    restaurantId,
    token: token || undefined,
    enabled: Boolean(token && restaurantId),
  });

  /** Load the operational dashboard data. Failed sections do not block other sections. */
  const fetchAllData = useCallback(async () => {
    const requestId = ++dataRequestId.current;

    if (!token || !restaurantId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setRefreshing(true);

      const results = await Promise.allSettled([
        adminService.getDashboardOverview(restaurantId, token),
        adminService.getPaymentSummary(restaurantId, token),
        adminService.getCustomers(restaurantId, { page: 1, limit: 1 }, token),
        adminService.getTables(restaurantId, token),
        adminService.getArAssets(token),
        adminService.getArAnalytics(7, token),
        adminService.getInventory(restaurantId, undefined, undefined, token),
        adminService.getStaff(restaurantId, token),
        adminService.getKitchenOrders(restaurantId, token),
        adminService.getNotifications(restaurantId, token),
      ]);

      // Ignore responses from a previous user, restaurant, or refresh request.
      if (requestId !== dataRequestId.current) return;

      const [
        overviewRes,
        paymentsRes,
        customersRes,
        tablesRes,
        arAssetsRes,
        arAnalyticsRes,
        inventoryRes,
        staffRes,
        kitchenRes,
        notifsRes,
      ] = results;

      logRequestFailure('Dashboard overview', overviewRes);
      logRequestFailure('Payment analytics', paymentsRes);
      logRequestFailure('Customer analytics', customersRes);
      logRequestFailure('Tables', tablesRes);
      logRequestFailure('AR assets', arAssetsRes);
      logRequestFailure('AR analytics', arAnalyticsRes);
      logRequestFailure('Inventory', inventoryRes);
      logRequestFailure('Staff', staffRes);
      logRequestFailure('Kitchen orders', kitchenRes);
      logRequestFailure('Notifications', notifsRes);

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (paymentsRes.status === 'fulfilled') setPaymentSummary(paymentsRes.value);
      if (customersRes.status === 'fulfilled') {
        setCustomerSummary(customersRes.value?.summary || null);
      }
      if (tablesRes.status === 'fulfilled') setTables(tablesRes.value || []);
      if (arAssetsRes.status === 'fulfilled') setArAssets(arAssetsRes.value || []);
      if (arAnalyticsRes.status === 'fulfilled') setArAnalytics(arAnalyticsRes.value || null);
      if (inventoryRes.status === 'fulfilled') setInventory(inventoryRes.value || []);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value || []);

      if (kitchenRes.status === 'fulfilled') {
        const mappedKitchen = (kitchenRes.value || [])
          .map((order: any) => toKitchenTicket(order))
          .filter((ticket: KitchenTicket | null): ticket is KitchenTicket => ticket !== null);
        setKitchenOrders(mappedKitchen);
      }

      if (notifsRes.status === 'fulfilled') {
        setNotifications(notifsRes.value || []);
      }
    } catch (error) {
      console.warn('[AdminDashboard] Unexpected error fetching dashboard data:', error);
    } finally {
      if (requestId === dataRequestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [restaurantId, token]);

  /** Load analytics for the currently selected date range. */
  const fetchAnalyticsData = useCallback(
    async (range: DateFilterOption, from?: string, to?: string) => {
      const requestId = ++analyticsRequestId.current;

      if (!token || !restaurantId) {
        setAnalyticsLoading(false);
        return;
      }

      try {
        setAnalyticsLoading(true);
        const data = await adminService.getAnalytics(
          restaurantId,
          range as any,
          from,
          to,
          token
        );

        // Prevent an older date-range request from replacing the latest selection.
        if (requestId === analyticsRequestId.current) {
          setAnalytics(data);
        }
      } catch (error) {
        if (requestId === analyticsRequestId.current) {
          console.warn('[AdminDashboard] Error fetching analytics for selected range:', error);
        }
      } finally {
        if (requestId === analyticsRequestId.current) {
          setAnalyticsLoading(false);
        }
      }
    },
    [restaurantId, token]
  );

  useEffect(() => {
    void fetchAllData();
    return () => {
      dataRequestId.current += 1;
    };
  }, [fetchAllData]);

  useEffect(() => {
    void fetchAnalyticsData(dateRange, customFrom, customTo);
    return () => {
      analyticsRequestId.current += 1;
    };
  }, [dateRange, customFrom, customTo, fetchAnalyticsData]);

  // Socket.IO real-time order updates
  useEffect(() => {
    if (!on || !token || !restaurantId) return;

    const unsubCreated = on<any>('order.created', (newOrder) => {
      const newTicket = toKitchenTicket(newOrder);
      if (!newTicket) return;

      // Upsert by order ID so reconnects or repeated events cannot create duplicates.
      setKitchenOrders((previous) => [
        newTicket,
        ...previous.filter((ticket) => ticket.id !== newTicket.id),
      ]);

      // Refresh totals and the other operational widgets after a new order arrives.
      void fetchAllData();
    });

    const updateOrderStatus = (updated: any) => {
      if (!updated?.id || !updated?.status) return;

      setKitchenOrders((previous) =>
        previous.map((ticket) =>
          ticket.id === String(updated.id)
            ? { ...ticket, status: updated.status }
            : ticket
        )
      );
    };

    const unsubUpdated = on<any>('order.statusChanged', updateOrderStatus);
    const unsubKitchen = on<any>('kitchen.orderUpdated', updateOrderStatus);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubKitchen();
    };
  }, [on, token, restaurantId, fetchAllData]);

  // Mark all notifications as read
  const handleMarkAllRead = useCallback(async () => {
    if (!token || notifications.length === 0) return;

    try {
      await adminService.markAllNotificationsRead(token);
      setNotifications((previous) => previous.map((notification) => ({
        ...notification,
        isRead: true,
      })));
    } catch (error) {
      console.warn('[AdminDashboard] Could not mark notifications as read:', error);
    }
  }, [notifications.length, token]);

  // Date range change handler
  const handleDateRangeChange = useCallback(
    (range: DateFilterOption, from?: string, to?: string) => {
      setDateRange(range);
      setCustomFrom(from);
      setCustomTo(to);
    },
    []
  );

  // Calculated metrics
  const metrics = overview?.metrics || null;

  // Revenue trend: use the selected analytics period, with the overview trend as fallback.
  const trendData = useMemo(() => {
    if (analytics?.revenueTrend?.length) {
      return analytics.revenueTrend.map((trend) => ({
        date: (trend as any).label || (trend as any).date,
        revenue: trend.revenue,
        orders: trend.orders,
      }));
    }

    return overview?.revenueTrend || [];
  }, [analytics, overview]);

  // Top-selling items, filtered by the dashboard search field.
  const topSellingDishes = useMemo(() => {
    const items = analytics?.topItems || overview?.topSellingItems || [];
    const query = searchQuery.trim().toLowerCase();

    if (!query) return items;
    return items.filter((item) => String(item.name || '').toLowerCase().includes(query));
  }, [analytics, overview, searchQuery]);

  // Recent orders, filtered by order number or table number.
  const recentOrdersList = useMemo(() => {
    const orders = overview?.recentOrders || [];
    const query = searchQuery.trim().toLowerCase();

    if (!query) return orders;

    return orders.filter((order) =>
      String(order.orderNumber || '').toLowerCase().includes(query) ||
      String(order.tableNumber || '').toLowerCase().includes(query)
    );
  }, [overview, searchQuery]);

  // Floor occupancy
  const totalTablesCount = tables.length;
  const occupiedTablesCount = tables.filter((table) => {
    // The API returns Table.status, but the shared frontend Table type currently omits it.
    const status = (table as unknown as { status?: string }).status;
    return status === 'OCCUPIED';
  }).length;
  const floorOccupancy = totalTablesCount > 0
    ? Math.round((occupiedTablesCount / totalTablesCount) * 100)
    : 0;

  // Use API-provided counts only. Do not show estimated QR scans or AR views as real metrics.
  const qrScans = Number((metrics as any)?.qrScans ?? 0);
  const arViews = Number(arAnalytics?.totalEvents ?? 0);

  // Peak-hour distribution from the timestamps of the available recent orders.
  // Slots without observed orders remain zero instead of displaying sample/fake values.
  const peakHoursData: PeakHourSlot[] = useMemo(() => {
    const hours: PeakHourSlot[] = [
      { hour: 11, label: '11 AM', orders: 0 },
      { hour: 12, label: '12 PM', orders: 0 },
      { hour: 13, label: '1 PM', orders: 0 },
      { hour: 14, label: '2 PM', orders: 0 },
      { hour: 15, label: '3 PM', orders: 0 },
      { hour: 16, label: '4 PM', orders: 0 },
      { hour: 17, label: '5 PM', orders: 0 },
      { hour: 18, label: '6 PM', orders: 0 },
      { hour: 19, label: '7 PM', orders: 0 },
      { hour: 20, label: '8 PM', orders: 0 },
      { hour: 21, label: '9 PM', orders: 0 },
      { hour: 22, label: '10 PM', orders: 0 },
    ];

    for (const order of overview?.recentOrders || []) {
      const timestamp = new Date(order.createdAt).getTime();
      if (!Number.isFinite(timestamp)) continue;

      const orderHour = new Date(timestamp).getHours();
      const slot = hours.find((entry) => entry.hour === orderHour);
      if (slot) slot.orders += 1;
    }

    return hours;
  }, [overview]);

  return (
    <DashboardLayout>
      {({ sidebarOpen, setSidebarOpen }) => (
        <>
          <DashboardHeader
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            selectedDateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            customFrom={customFrom}
            customTo={customTo}
            onRefresh={fetchAllData}
            isRefreshing={refreshing}
            isConnected={isConnected}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            notifications={notifications}
            onMarkAllNotificationsRead={handleMarkAllRead}
          />

          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            <DashboardLowStock alerts={overview?.lowStockAlerts || []} />

            <DashboardKPICards metrics={metrics} loading={loading} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DashboardRevenueChart
                  data={trendData}
                  loading={analyticsLoading || loading}
                />
              </div>
              <div>
                <DashboardRevenueDonut
                  categories={analytics?.categoryBreakdown || []}
                  totalRevenue={analytics?.grossSales || metrics?.todayRevenue || 0}
                  loading={analyticsLoading || loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardLiveKitchen
                orders={kitchenOrders}
                loading={loading}
                isConnected={isConnected}
              />
              <DashboardPaymentAnalytics
                paymentSummary={paymentSummary}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardPeakHoursChart data={peakHoursData} loading={loading} />
              <DashboardCustomerAnalytics summary={customerSummary} loading={loading} />
            </div>

            <DashboardQuickStats
              tableOccupancy={floorOccupancy}
              qrScans={qrScans}
              arViews={arViews}
              activeOrders={kitchenOrders.length || metrics?.pendingOrders || 0}
              loading={loading}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardQRWidget
                tables={tables}
                totalScans={qrScans}
                totalOrdersFromQR={metrics?.todayOrders || 0}
                loading={loading}
              />
              <DashboardARWidget
                assets={arAssets}
                totalViews={arViews}
                loading={loading}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardInventoryWidget
                inventory={inventory}
                lowStockAlerts={overview?.lowStockAlerts || []}
                loading={loading}
              />
              <DashboardStaffWidget staff={staff} loading={loading} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardTopSelling
                items={topSellingDishes}
                loading={loading || analyticsLoading}
              />
              <DashboardRecentOrders orders={recentOrdersList} loading={loading} />
            </div>
          </main>
        </>
      )}
    </DashboardLayout>
  );
}
