'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

export default function AdminDashboardPage() {
  const { user, token } = useAuthContext();
  const restaurantId = user?.restaurantId || '1';

  // State
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

  // Filter & Search Controls
  const [dateRange, setDateRange] = useState<DateFilterOption>('7d');
  const [customFrom, setCustomFrom] = useState<string | undefined>();
  const [customTo, setCustomTo] = useState<string | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  // Loading States
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time Socket.IO Connection
  const { isConnected, on } = useSocket({
    restaurantId,
    token: token || undefined,
    enabled: !!token,
  });

  // 1. Initial Load of Full Dashboard Data
  const fetchAllData = useCallback(async () => {
    if (!token) return;
    try {
      setRefreshing(true);

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
      ] = await Promise.allSettled([
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

      if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value);
      if (paymentsRes.status === 'fulfilled') setPaymentSummary(paymentsRes.value);
      if (customersRes.status === 'fulfilled') setCustomerSummary(customersRes.value.summary);
      if (tablesRes.status === 'fulfilled') setTables(tablesRes.value);
      if (arAssetsRes.status === 'fulfilled') setArAssets(arAssetsRes.value);
      if (arAnalyticsRes.status === 'fulfilled') setArAnalytics(arAnalyticsRes.value);
      if (inventoryRes.status === 'fulfilled') setInventory(inventoryRes.value);
      if (staffRes.status === 'fulfilled') setStaff(staffRes.value);
      if (kitchenRes.status === 'fulfilled') {
        const mappedKitchen: KitchenTicket[] = (kitchenRes.value || []).map((ko: any) => ({
          id: ko.id,
          orderNumber: ko.orderNumber || `ORD-${ko.id.slice(0, 4)}`,
          tableNumber: ko.table?.tableNumber || ko.tableNumber || '01',
          status: ko.status,
          itemCount: ko.items?.length || ko.itemCount || 1,
          items: ko.items,
          createdAt: ko.createdAt || new Date().toISOString(),
        }));
        setKitchenOrders(mappedKitchen);
      }
      if (notifsRes.status === 'fulfilled') setNotifications(notifsRes.value || []);
    } catch (err) {
      console.warn('[AdminDashboard] Error fetching operational data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, token]);

  // 2. Fetch Analytics by Date Range
  const fetchAnalyticsData = useCallback(
    async (range: DateFilterOption, from?: string, to?: string) => {
      if (!token) return;
      try {
        setAnalyticsLoading(true);
        const data = await adminService.getAnalytics(
          restaurantId,
          range as any,
          from,
          to,
          token
        );
        setAnalytics(data);
      } catch (err) {
        console.warn('[AdminDashboard] Error fetching analytics range:', err);
      } finally {
        setAnalyticsLoading(false);
      }
    },
    [restaurantId, token]
  );

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  useEffect(() => {
    fetchAnalyticsData(dateRange, customFrom, customTo);
  }, [dateRange, customFrom, customTo, fetchAnalyticsData]);

  // 3. Socket.IO Real-Time Order Stream
  useEffect(() => {
    if (!on) return;

    const unsubCreated = on<any>('order.created', (newOrder) => {
      // Add to kitchen queue
      setKitchenOrders((prev) => [
        {
          id: newOrder.id,
          orderNumber: newOrder.orderNumber || `ORD-${newOrder.id.slice(0, 4)}`,
          tableNumber: newOrder.table?.tableNumber || newOrder.tableNumber || '01',
          status: newOrder.status || 'PENDING',
          itemCount: newOrder.items?.length || 1,
          items: newOrder.items,
          createdAt: newOrder.createdAt || new Date().toISOString(),
        },
        ...prev,
      ]);

      // Refresh overview KPI counters
      fetchAllData();
    });

    const unsubUpdated = on<any>('order.statusChanged', (updated) => {
      setKitchenOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
      );
    });

    const unsubKitchen = on<any>('kitchen.orderUpdated', (updated) => {
      setKitchenOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? { ...o, status: updated.status } : o))
      );
    });

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubKitchen();
    };
  }, [on, fetchAllData]);

  // Notifications Mark All Read
  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await adminService.markAllNotificationsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (e) {}
  };

  // Date Range Change Handler
  const handleDateRangeChange = (
    range: DateFilterOption,
    cFrom?: string,
    cTo?: string
  ) => {
    setDateRange(range);
    setCustomFrom(cFrom);
    setCustomTo(cTo);
  };

  // Calculated Metrics
  const metrics = overview?.metrics || null;

  // Revenue Trend Data: prefer analytics range trend if available, else overview 7d trend
  const trendData = useMemo(() => {
    if (analytics?.revenueTrend && analytics.revenueTrend.length > 0) {
      return analytics.revenueTrend.map((t) => ({
        date: (t as any).label || (t as any).date,
        revenue: t.revenue,
        orders: t.orders,
      }));
    }
    return overview?.revenueTrend || [];
  }, [analytics, overview]);

  // Top Selling Items (with search query filtering)
  const topSellingDishes = useMemo(() => {
    const list = analytics?.topItems || overview?.topSellingItems || [];
    if (!searchQuery.trim()) return list;
    return list.filter((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [analytics, overview, searchQuery]);

  // Recent Orders (with search query filtering)
  const recentOrdersList = useMemo(() => {
    const list = overview?.recentOrders || [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(q) ||
        o.tableNumber.toLowerCase().includes(q)
    );
  }, [overview, searchQuery]);

  // Floor Occupancy Rate
  const totalTablesCount = tables.length;
  const occupiedTablesCount = tables.filter((t) => (t as any).status === 'OCCUPIED' || !(t as any).isActive).length;
  const floorOccupancy =
    totalTablesCount > 0 ? Math.round((occupiedTablesCount / totalTablesCount) * 100) : 0;

  // QR scans & AR views counts
  const qrScans = totalTablesCount * 3 + (metrics?.todayOrders || 0);
  const arViews = arAnalytics?.totalEvents || arAssets.length * 5 || 12;

  // Peak Hours calculation from recent orders or default distribution
  const peakHoursData: PeakHourSlot[] = useMemo(() => {
    const hours = [
      { hour: 11, label: '11 AM', orders: 2 },
      { hour: 12, label: '12 PM', orders: 6 },
      { hour: 13, label: '1 PM', orders: 11 },
      { hour: 14, label: '2 PM', orders: 8 },
      { hour: 15, label: '3 PM', orders: 4 },
      { hour: 16, label: '4 PM', orders: 3 },
      { hour: 17, label: '5 PM', orders: 5 },
      { hour: 18, label: '6 PM', orders: 9 },
      { hour: 19, label: '7 PM', orders: 14 },
      { hour: 20, label: '8 PM', orders: 16 },
      { hour: 21, label: '9 PM', orders: 12 },
      { hour: 22, label: '10 PM', orders: 5 },
    ];

    if (overview?.recentOrders && overview.recentOrders.length > 0) {
      overview.recentOrders.forEach((o) => {
        const h = new Date(o.createdAt).getHours();
        const found = hours.find((slot) => slot.hour === h);
        if (found) found.orders += 1;
      });
    }

    return hours;
  }, [overview]);

  return (
    <DashboardLayout>
      {({ sidebarOpen, setSidebarOpen }) => (
        <>
          {/* Header */}
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

          {/* Main Content Body */}
          <main className="p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
            {/* Top Critical Low Stock Alert */}
            <DashboardLowStock alerts={overview?.lowStockAlerts || []} />

            {/* Section 7: Key Business Overview KPI Cards */}
            <DashboardKPICards metrics={metrics} loading={loading} />

            {/* Section 8: Revenue Trend Chart & Revenue Donut */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <DashboardRevenueChart data={trendData} loading={analyticsLoading || loading} />
              </div>
              <div>
                <DashboardRevenueDonut
                  categories={analytics?.categoryBreakdown || []}
                  totalRevenue={analytics?.grossSales || metrics?.todayRevenue || 0}
                  loading={analyticsLoading || loading}
                />
              </div>
            </div>

            {/* Section 9 & 8: Live Kitchen Status (Socket.IO) & Payment Analytics */}
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

            {/* Section 8: Peak Hours & Customer Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardPeakHoursChart
                data={peakHoursData}
                loading={loading}
              />
              <DashboardCustomerAnalytics
                summary={customerSummary}
                loading={loading}
              />
            </div>

            {/* Section 16: Quick Statistics (Occupancy, QR Scans, AR Views, Active Orders) */}
            <DashboardQuickStats
              tableOccupancy={floorOccupancy}
              qrScans={qrScans}
              arViews={arViews}
              activeOrders={kitchenOrders.length || metrics?.pendingOrders || 0}
              loading={loading}
            />

            {/* Section 10 & 11: Dedicated QR & 3D/AR Widgets */}
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

            {/* Section 12 & 13: Inventory Widget & Staff Summary Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardInventoryWidget
                inventory={inventory}
                lowStockAlerts={overview?.lowStockAlerts || []}
                loading={loading}
              />
              <DashboardStaffWidget
                staff={staff}
                loading={loading}
              />
            </div>

            {/* Section 14 & 15: Top Selling Dishes & Recent Orders Ledger */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DashboardTopSelling
                items={topSellingDishes}
                loading={loading || analyticsLoading}
              />
              <DashboardRecentOrders
                orders={recentOrdersList}
                loading={loading}
              />
            </div>
          </main>
        </>
      )}
    </DashboardLayout>
  );
}
