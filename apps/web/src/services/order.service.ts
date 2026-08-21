import { CustomerOrderRequest, Order } from '@qr-menu/shared';

// In a real application, this would use apiClient.post('/orders', request)
// For Phase 2 frontend integration, we simulate the backend.

export const orderService = {
  async submitOrder(request: CustomerOrderRequest): Promise<Order> {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    
    // Simulate calculating totals
    const subtotal = 100; // Mocked
    const tax = 8; // Mocked
    const serviceCharge = 5; // Mocked

    return {
      id: `ord-${Math.random().toString(36).substring(7)}`,
      restaurantId: request.restaurantId,
      tableId: request.tableId,
      tableNumber: '07', // In reality, backend resolves this
      status: 'RECEIVED',
      items: request.items.map((i, idx) => ({
        menuItemId: i.menuItemId,
        name: `Item ${idx}`, // Mocked
        price: 25, // Mocked
        quantity: i.quantity,
        specialInstructions: i.specialInstructions,
      })),
      subtotal,
      tax,
      serviceCharge,
      total: subtotal + tax + serviceCharge,
      paymentMethod: request.paymentMethod,
      paymentStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  },

  async getOrder(orderId: string): Promise<Order | null> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Real implementation would fetch status from backend API
    return null; // Mock
  }
};
