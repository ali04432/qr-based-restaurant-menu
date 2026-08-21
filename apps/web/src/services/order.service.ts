import { CustomerOrderRequest, Order } from '@qr-menu/shared';
import { apiClient } from '../lib/api-client';

export const orderService = {
  /**
   * Submit customer order to Express backend API (port 4000).
   * Backend saves to DB and broadcasts real-time Socket.io event to KDS.
   */
  async submitOrder(request: CustomerOrderRequest): Promise<Order> {
    try {
      const order = await apiClient.post<Order>('/api/orders', request);
      return order;
    } catch (err) {
      console.error('[orderService] Failed to submit order to API:', err);
      throw err;
    }
  },

  /**
   * Retrieve order details for customer tracking.
   */
  async getOrder(orderId: string): Promise<Order | null> {
    try {
      const order = await apiClient.get<Order>(`/api/orders/${orderId}`);
      return order;
    } catch (err) {
      console.warn('[orderService] Could not fetch order status from API:', err);
      return null;
    }
  },
};
