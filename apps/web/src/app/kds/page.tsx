'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../context/AuthContext';
import { Order, OrderStatus, UserRole } from '@qr-menu/shared';
import { socketClient } from '../../lib/socket-client';
import { kdsService } from '../../services/kds.service';

import { KdsSidebar } from '../../components/kds/KdsSidebar';
import { KdsHeader } from '../../components/kds/KdsHeader';
import { KdsKanbanBoard } from '../../components/kds/KdsKanbanBoard';
import { KdsOrderCard } from '../../components/kds/KdsOrderCard';
import { KdsMenuManagement } from '../../components/kds/KdsMenuManagement';
import { KdsSettings } from '../../components/kds/KdsSettings';
import { ShieldAlert, LogOut, ArrowRight, CheckCircle2, ClipboardList } from 'lucide-react';

// Authorized roles according to project permissions
const ALLOWED_ROLES: UserRole[] = [
  UserRole.CHEF,
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.SUPER_ADMIN,
];

export default function KdsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, logout } = useAuthContext();

  const [activeTab, setActiveTab] = useState('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [kdsTheme, setKdsTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('kds_theme') as 'dark' | 'light') || 'dark';
    }
    return 'dark';
  });

  const toggleKdsTheme = () => {
    setKdsTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('kds_theme', next);
      return next;
    });
  };

  // Safe restaurant ID resolution (defaults to restaurant '1' if null, e.g. for SUPER_ADMIN)
  const restaurantId = user?.restaurantId || '1';
  const userRole = user?.role as UserRole | undefined;
  const isAuthorized = userRole ? ALLOWED_ROLES.includes(userRole) : false;

  // Unauthenticated Guard: Redirect to /admin/login while preserving /kds return destination
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/admin/login?redirect=/kds');
    }
  }, [isLoading, isAuthenticated, router]);

  // Fetch initial order data
  const loadOrders = useCallback(async () => {
    if (!token) return;
    setIsDataLoading(true);
    try {
      const data = await kdsService.getOrders(restaurantId, token);
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[KDS] Failed to load orders', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [restaurantId, token]);

  // Load orders on authentication and set up periodic 15s sync interval
  useEffect(() => {
    if (isAuthenticated && isAuthorized) {
      loadOrders();
      const interval = setInterval(loadOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isAuthorized, loadOrders]);

  // Setup Real-time Socket Listeners for new orders & status changes
  useEffect(() => {
    if (!isAuthenticated || !isAuthorized || !restaurantId) return;

    const onOrderCreated = (order: Order) => {
      setOrders((prev) => {
        if (prev.some((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      if (soundEnabled) {
        kdsService.playNewOrderSound();
      }
    };

    const onOrderUpdated = (updatedOrder: Order) => {
      setOrders((prev) => prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o)));
    };

    socketClient.joinRestaurant(restaurantId);
    socketClient.onOrderCreated(onOrderCreated);
    socketClient.onKitchenOrderUpdated(onOrderUpdated);
    socketClient.onOrderStatusChanged(onOrderUpdated);

    return () => {
      socketClient.offOrderCreated(onOrderCreated);
      socketClient.offKitchenOrderUpdated(onOrderUpdated);
      socketClient.offOrderStatusChanged(onOrderUpdated);
      socketClient.leaveRestaurant(restaurantId);
    };
  }, [isAuthenticated, isAuthorized, restaurantId, soundEnabled]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    try {
      // Optimistic update
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      await kdsService.updateOrderStatus(orderId, status, token);
    } catch (err) {
      console.error('[KDS] Failed to update status', err);
      loadOrders();
    }
  };

  // 1. Loading session state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse font-medium text-sm">Loading Kitchen System...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated: waiting for router.push to complete
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse font-medium text-sm">Redirecting to Staff Login...</p>
        </div>
      </div>
    );
  }

  // 3. Authenticated but Unauthorized Role (e.g. Waiter or Cashier)
  // Display clear restricted access UI — DO NOT redirect to Customer Panel
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#08090B] text-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[#131518] border border-zinc-800 rounded-2xl p-6 text-center shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-white tracking-tight">Access Restricted</h2>
          <p className="text-xs text-zinc-400 mt-2 mb-6 leading-relaxed">
            Your current account role (<strong className="text-amber-400 font-semibold">{userRole || 'Staff'}</strong>) does not have permission to access the Kitchen Display System (KDS).
            Only <strong className="text-white">Chef, Admin, and Manager</strong> accounts are authorized.
          </p>

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                if (userRole === UserRole.WAITER) {
                  router.push('/waiter');
                } else if (userRole === UserRole.CASHIER) {
                  router.push('/cashier');
                } else {
                  router.push('/admin');
                }
              }}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
            >
              <span>Go to Your Authorized Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => {
                logout();
                router.push('/admin/login?redirect=/kds');
              }}
              className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl text-xs font-medium transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5 text-zinc-400" />
              <span>Switch Account / Sign In as Chef</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Initial orders loading state
  if (isDataLoading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse font-medium text-sm">Retrieving Kitchen Tickets...</p>
        </div>
      </div>
    );
  }

  // Order Filtering
  const filteredOrders = orders.filter((o) => {
    // Search filter
    if (
      search &&
      !o.tableNumber?.toLowerCase().includes(search.toLowerCase()) &&
      !o.id.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    // Tab filter
    if (activeTab === 'preparing' && !['PREPARING', 'IN_KITCHEN', 'COOKING'].includes(o.status)) return false;
    if (activeTab === 'ready' && o.status !== 'READY') return false;
    if (activeTab === 'completed' && !['COMPLETED', 'SERVED', 'CANCELLED'].includes(o.status)) return false;
    if (activeTab === 'all' && ['COMPLETED', 'SERVED', 'CANCELLED'].includes(o.status)) return false;
    return true;
  });

  return (
    <div
      className="min-h-screen flex overflow-hidden transition-colors duration-300"
      data-kds-theme={kdsTheme}
      style={{ backgroundColor: kdsTheme === 'light' ? '#f1f5f9' : '#08090B' }}
    >
      {/* Sidebar Navigation */}
      <KdsSidebar activeTab={activeTab} onTabChange={setActiveTab} kdsTheme={kdsTheme} />

      {/* Main Content Area */}
      <div className="ml-64 flex-1 flex flex-col h-screen overflow-hidden">
        <KdsHeader
          onSearch={setSearch}
          onFilter={setFilter}
          soundEnabled={soundEnabled}
          toggleSound={() => setSoundEnabled(!soundEnabled)}
          kdsTheme={kdsTheme}
          toggleKdsTheme={toggleKdsTheme}
        />

        {/* Dynamic Main View */}
        <main
          className="flex-1 relative z-10 overflow-hidden transition-colors duration-300"
          style={{ backgroundColor: kdsTheme === 'light' ? '#f1f5f9' : '#08090B' }}
        >
          {activeTab === 'menu' ? (
            <KdsMenuManagement />
          ) : activeTab === 'settings' ? (
            <KdsSettings />
          ) : activeTab === 'completed' ? (
            <div className="h-full overflow-y-auto custom-scrollbar p-6 pb-24">
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-800/60">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h2
                    className={`text-base font-bold tracking-wide uppercase ${
                      kdsTheme === 'light' ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    Completed Orders ({filteredOrders.length})
                  </h2>
                </div>
                <p className={`text-xs ${kdsTheme === 'light' ? 'text-slate-500' : 'text-zinc-400'}`}>
                  Archived and served tickets for this shift
                </p>
              </div>
              {filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                  <ClipboardList className="w-12 h-12 stroke-[1.2] mb-3 text-zinc-600" />
                  <p className="text-sm font-medium">No completed orders yet</p>
                  <p className="text-xs text-zinc-600 mt-1">Orders marked as completed will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredOrders.map((order) => (
                    <KdsOrderCard
                      key={order.id}
                      order={order}
                      onUpdateStatus={handleUpdateStatus}
                      kdsTheme={kdsTheme}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <KdsKanbanBoard
              orders={filteredOrders}
              onUpdateStatus={handleUpdateStatus}
              kdsTheme={kdsTheme}
            />
          )}
        </main>
      </div>
    </div>
  );
}
