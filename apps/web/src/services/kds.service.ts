import { Order, OrderStatus } from '@qr-menu/shared';
import { apiClient } from '../lib/api-client';

export const kdsService = {
  /** Fetch live orders for the KDS */
  async getOrders(restaurantId: string, token: string): Promise<Order[]> {
    // Dev bypass: skip real API call for mock sessions
    if (token === 'mock-chef-token') {
      return getMockOrders(restaurantId);
    }
    try {
      const orders = await apiClient.get<Order[]>(`/api/orders?restaurantId=${restaurantId}`, { token });
      return orders;
    } catch (e) {
      console.warn('Failed to fetch real orders from API, falling back to mock seed.', e);
      return getMockOrders(restaurantId);
    }
  },

  /** Update an order's status */
  async updateOrderStatus(orderId: string, status: OrderStatus, token: string): Promise<Order> {
    const order = await apiClient.patch<Order>(`/api/orders/${orderId}/status`, { status }, { token });
    return order;
  },

  /** Play a subtle audio chime for new orders */
  playNewOrderSound() {
    if (typeof window === 'undefined') return;
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc.frequency.exponentialRampToValueAtTime(1046.50, ctx.currentTime + 0.1); // C6
      
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (err) {
      console.warn('Audio play failed', err);
    }
  }
};

/** Provide realistic mock data for KDS if API is offline to showcase the UI */
function getMockOrders(restaurantId: string): Order[] {
  const now = Date.now();
  
  return [
    {
      id: 'mock-1',
      restaurantId,
      tableId: 't7',
      tableNumber: '07',
      status: 'NEW',
      items: [
        { menuItemId: 'm1', name: 'Chicken Wings', quantity: 2, price: 500, specialInstructions: 'Note: No onions' },
        { menuItemId: 'm2', name: 'Garlic Bread', quantity: 1, price: 300 },
        { menuItemId: 'm3', name: 'Chicken Tikka', quantity: 1, price: 880 }
      ],
      subtotal: 1680,
      tax: 0,
      serviceCharge: 0,
      total: 1680,
      paymentStatus: 'PENDING',
      createdAt: new Date(now - 1000 * 60 * 5).toISOString(), // 5 mins ago
      updatedAt: new Date(now - 1000 * 60 * 5).toISOString()
    },
    {
      id: 'mock-2',
      restaurantId,
      tableId: 't5',
      tableNumber: '05',
      status: 'PREPARING',
      items: [
        { menuItemId: 'm4', name: 'Chicken Karahi', quantity: 1, price: 1500 },
        { menuItemId: 'm5', name: 'Tandoori Roti', quantity: 4, price: 400 },
        { menuItemId: 'm6', name: 'Green Salad', quantity: 1, price: 250 }
      ],
      subtotal: 2150,
      tax: 0,
      serviceCharge: 0,
      total: 2150,
      paymentStatus: 'PAID',
      createdAt: new Date(now - 1000 * 60 * 15).toISOString(), // 15 mins ago
      updatedAt: new Date(now - 1000 * 60 * 8).toISOString()
    },
    {
      id: 'mock-3',
      restaurantId,
      tableId: 't1',
      tableNumber: '01',
      status: 'READY',
      items: [
        { menuItemId: 'm7', name: 'Chicken Handi', quantity: 1, price: 1200 },
        { menuItemId: 'm8', name: 'Butter Naan', quantity: 2, price: 440 },
        { menuItemId: 'm9', name: 'Salad', quantity: 1, price: 250 }
      ],
      subtotal: 1890,
      tax: 0,
      serviceCharge: 0,
      total: 1890,
      paymentStatus: 'PAID',
      createdAt: new Date(now - 1000 * 60 * 25).toISOString(), // 25 mins ago
      updatedAt: new Date(now - 1000 * 60 * 2).toISOString()
    }
  ];
}
