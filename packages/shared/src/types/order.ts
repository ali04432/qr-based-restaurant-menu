import { MenuItem } from './menu';

export interface CartItem {
  id: string; // unique ID for cart entry
  menuItem: MenuItem;
  quantity: number;
  specialInstructions?: string;
}

export type OrderStatus = 'PENDING' | 'RECEIVED' | 'IN_KITCHEN' | 'COOKING' | 'READY' | 'SERVED' | 'CANCELLED';
export type PaymentMethod = 'CASH' | 'CARD' | 'ONLINE';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  serviceCharge: number;
  total: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export interface CustomerOrderRequest {
  restaurantId: string;
  tableId: string;
  items: Array<{
    menuItemId: string;
    quantity: number;
    specialInstructions?: string;
  }>;
  paymentMethod?: PaymentMethod;
}
