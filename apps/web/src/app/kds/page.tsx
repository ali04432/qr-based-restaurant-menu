'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '../../context/AuthContext';
import { Order, OrderStatus } from '@qr-menu/shared';
import { socketClient } from '../../lib/socket-client';
import { kdsService } from '../../services/kds.service';

import { KdsSidebar } from '../../components/kds/KdsSidebar';
import { KdsHeader } from '../../components/kds/KdsHeader';
import { KdsKanbanBoard } from '../../components/kds/KdsKanbanBoard';
import { KdsMenuManagement } from '../../components/kds/KdsMenuManagement';
import { KdsSettings } from '../../components/kds/KdsSettings';

export default function KdsPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, quickChefLogin } = useAuthContext();
  
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

  // Quick simulated login for demo if needed
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // In production, you would redirect to /login.
      // For this demo, we simulate a fast login for the Chef if they hit this route.
      quickChefLogin('1');
    }
  }, [isLoading, isAuthenticated, quickChefLogin]);

  // Auth Guard
  useEffect(() => {
    if (!isLoading && isAuthenticated && user?.role !== 'CHEF' && user?.role !== 'SUPER_ADMIN') {
      router.push('/');
    }
  }, [isLoading, isAuthenticated, user, router]);

  // Fetch initial data
  const loadOrders = useCallback(async () => {
    if (!user?.restaurantId || !token) return;
    setIsDataLoading(true);
    const data = await kdsService.getOrders(user.restaurantId, token);
    setOrders(data);
    setIsDataLoading(false);
  }, [user?.restaurantId, token]);

  useEffect(() => {
    if (isAuthenticated) {
      loadOrders();
    }
  }, [isAuthenticated, loadOrders]);

  // Setup Socket Listeners — real-time new orders and status updates
  useEffect(() => {
    const restId = user?.restaurantId;
    if (!restId) return;

    const onOrderCreated = (order: Order) => {
      setOrders((prev) => {
        // Avoid duplicates if order already exists
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

    socketClient.joinRestaurant(restId);
    socketClient.onOrderCreated(onOrderCreated);
    socketClient.onKitchenOrderUpdated(onOrderUpdated);

    return () => {
      socketClient.offOrderCreated(onOrderCreated);
      socketClient.offKitchenOrderUpdated(onOrderUpdated);
      socketClient.leaveRestaurant(restId);
    };
  }, [user?.restaurantId, soundEnabled]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    if (!token) return;
    try {
      // Optimistic update
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
      await kdsService.updateOrderStatus(orderId, status, token);
    } catch (err) {
      // Revert if error
      console.error('Failed to update status', err);
      loadOrders();
    }
  };

  if (isLoading || !isAuthenticated || isDataLoading) {
    return (
      <div className="min-h-screen bg-[#08090B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
          <p className="text-zinc-400 animate-pulse font-medium">Loading Kitchen System...</p>
        </div>
      </div>
    );
  }

  // Filtering
  const filteredOrders = orders.filter((o) => {
    // Search filter
    if (search && !o.tableNumber?.toLowerCase().includes(search.toLowerCase()) && !o.id.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Tab filter
    if (activeTab === 'preparing' && !['PREPARING', 'IN_KITCHEN', 'COOKING'].includes(o.status)) return false;
    if (activeTab === 'ready' && o.status !== 'READY') return false;
    if (activeTab === 'completed' && !['COMPLETED', 'SERVED', 'CANCELLED'].includes(o.status)) return false;
    if (activeTab === 'all' && ['COMPLETED', 'SERVED', 'CANCELLED'].includes(o.status)) return false; // Hide completed in active board
    return true;
  });

  return (
    <div className="min-h-screen flex overflow-hidden transition-colors duration-300" data-kds-theme={kdsTheme} style={{ backgroundColor: kdsTheme === 'light' ? '#f1f5f9' : '#08090B' }}>
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
        <main className="flex-1 relative z-10 overflow-hidden transition-colors duration-300" style={{ backgroundColor: kdsTheme === 'light' ? '#f1f5f9' : '#08090B' }}>
          {activeTab === 'menu' ? (
            <KdsMenuManagement />
          ) : activeTab === 'settings' ? (
            <KdsSettings />
          ) : (
            <KdsKanbanBoard orders={filteredOrders} onUpdateStatus={handleUpdateStatus} kdsTheme={kdsTheme} />
          )}
        </main>
      </div>
    </div>
  );
}
