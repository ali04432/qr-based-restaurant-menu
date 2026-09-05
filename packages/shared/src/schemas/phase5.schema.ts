import { z } from 'zod';

// ============================================================
// Phase 5: Waiter & Cashier Zod Validation Schemas
// ============================================================

export const walkInOrderItemSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  specialInstructions: z.string().max(300).optional(),
});

export const walkInOrderSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  tableId: z.string().min(1, 'Table ID is required'),
  customerName: z.string().max(100).optional(),
  customerPhone: z.string().max(30).optional(),
  guestsCount: z.number().int().min(1).max(30).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(walkInOrderItemSchema).min(1, 'Order must contain at least one item'),
});

export const addItemsToOrderSchema = z.object({
  items: z.array(walkInOrderItemSchema).min(1, 'Must include at least one item'),
});

export const transferTableSchema = z.object({
  targetTableId: z.string().min(1, 'Target table ID is required'),
});

export const mergeTableSchema = z.object({
  targetTableId: z.string().min(1, 'Target table to merge into is required'),
});

export const paymentConfirmationSchema = z.object({
  orderId: z.string().min(1, 'Order ID is required'),
  method: z.enum([
    'CASH',
    'CARD',
    'JAZZCASH',
    'EASYPAISA',
    'ONLINE',
    'BANK_TRANSFER',
    'OTHER',
  ]),
  amount: z.number().min(0, 'Amount cannot be negative'),
  receivedAmount: z.number().min(0).optional(),
  changeAmount: z.number().min(0).optional(),
  transactionRef: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const customerRequestSchema = z.object({
  tableId: z.string().min(1, 'Table ID is required'),
  type: z.enum([
    'WATER',
    'EXTRA_PLATES',
    'CALL_WAITER',
    'BILL_REQUEST',
    'NAPKINS',
    'EXTRA_SAUCE',
    'CUSTOM',
  ]),
  message: z.string().max(500).optional(),
});

export const resolveCustomerRequestSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'RESOLVED', 'CANCELLED']).default('RESOLVED'),
});

export const paymentRefundSchema = z.object({
  amount: z.number().positive('Refund amount must be greater than zero'),
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  method: z.string().default('CASH'),
});

export const operationalAiQuerySchema = z.object({
  query: z.string().min(2, 'Query is too short'),
  role: z.enum(['WAITER', 'CASHIER']),
  context: z.record(z.any()).optional(),
});
