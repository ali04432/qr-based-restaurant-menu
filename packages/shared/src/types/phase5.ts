// ============================================================
// Phase 5: Waiter & Cashier POS System Types
// ============================================================

export type Phase5TableStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'RESERVED'
  | 'READY_TO_SERVE'
  | 'ORDERING'
  | 'PREPARING';

export type CustomerRequestType =
  | 'WATER'
  | 'EXTRA_PLATES'
  | 'CALL_WAITER'
  | 'BILL_REQUEST'
  | 'NAPKINS'
  | 'EXTRA_SAUCE'
  | 'CUSTOM';

export type CustomerRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CANCELLED';

export interface WaiterSummary {
  totalOrders: number;
  servedOrders: number;
  pendingOrders: number;
  todaySales: number;
  activeTables: number;
}

export interface ActiveOrderItemSummary {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  specialInstructions?: string | null;
}

export interface ActiveOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  itemsCount: number;
  createdAt: string;
  items: ActiveOrderItemSummary[];
}

export interface TableWithOrders {
  id: string;
  tableNumber: string;
  capacity: number;
  status: Phase5TableStatus;
  activeOrdersCount: number;
  totalAmount: number;
  elapsedMinutes: number;
  openedAt?: string;
  waiterName?: string;
  activeOrders: ActiveOrderSummary[];
}

export interface CustomerRequestRecord {
  id: string;
  restaurantId: string;
  tableId: string;
  tableNumber: string;
  type: CustomerRequestType;
  message?: string | null;
  status: CustomerRequestStatus;
  assignedToName?: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface WalkInOrderItemInput {
  menuItemId: string;
  quantity: number;
  specialInstructions?: string;
}

export interface WalkInOrderInput {
  restaurantId: string;
  tableId: string;
  customerName?: string;
  customerPhone?: string;
  guestsCount?: number;
  notes?: string;
  items: WalkInOrderItemInput[];
}

export interface AddItemsToOrderInput {
  orderId: string;
  items: WalkInOrderItemInput[];
}

export interface TransferTableInput {
  sourceTableId: string;
  targetTableId: string;
}

export interface CashierSummary {
  todaySales: number;
  totalOrders: number;
  paidOrders: number;
  pendingPayments: number;
  cashTotal: number;
  cardTotal: number;
  digitalTotal: number;
}

export interface CashierOrderListItem {
  id: string;
  orderNumber: string;
  tableId: string;
  tableNumber: string;
  status: string;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_PAID';
  paymentMethod?: string;
  total: number;
  itemsCount: number;
  createdAt: string;
  customerName?: string;
}

export interface BillingLineItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface BillingDetail {
  orderId: string;
  orderNumber: string;
  tableId: string;
  tableNumber: string;
  createdAt: string;
  items: BillingLineItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  taxRate: number;
  discount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  paymentStatus: string;
  existingPaymentId?: string;
}

export interface PaymentConfirmationInput {
  orderId: string;
  method: 'CASH' | 'CARD' | 'JAZZCASH' | 'EASYPAISA' | 'ONLINE' | 'BANK_TRANSFER' | 'OTHER';
  amount: number;
  receivedAmount?: number;
  changeAmount?: number;
  transactionRef?: string;
  notes?: string;
}

export interface ThermalReceiptPayload {
  restaurantName: string;
  address?: string;
  phone?: string;
  orderNumber: string;
  tableNumber: string;
  date: string;
  time: string;
  cashierName: string;
  items: BillingLineItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: string;
  amountReceived?: number;
  change?: number;
  transactionRef?: string;
}

export interface PaymentRefundInput {
  paymentId: string;
  amount: number;
  reason: string;
  method?: string;
}

export interface PaymentMethodDistribution {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface OperationalAiQueryInput {
  query: string;
  role: 'WAITER' | 'CASHIER';
  context?: Record<string, any>;
}

export interface OperationalAiResponse {
  question: string;
  answer: string;
  suggestions?: string[];
  data?: any;
}
