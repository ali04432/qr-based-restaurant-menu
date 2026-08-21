import { z } from 'zod';

// ============================================================
// Order Zod Schemas
// ============================================================

/** A single line-item in a customer order request */
const orderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').max(20),
  specialInstructions: z.string().max(500).trim().optional(),
});

/** Payment methods supported by the platform */
const paymentMethodSchema = z.enum(['CASH', 'CARD', 'ONLINE']);

/**
 * Schema for a customer's order request submitted from the QR menu page.
 * Validates restaurant context, table, items, and payment method.
 */
export const customerOrderSchema = z.object({
  restaurantId: z.string().min(1, 'restaurantId is required'),
  tableId: z.string().min(1, 'tableId is required'),
  items: z
    .array(orderItemSchema)
    .min(1, 'Order must contain at least one item')
    .max(50, 'Order cannot exceed 50 items'),
  paymentMethod: paymentMethodSchema.optional().default('ONLINE'),
});

/**
 * Schema for updating an order's status (used by kitchen / staff).
 */
export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'RECEIVED', 'IN_KITCHEN', 'COOKING', 'READY', 'SERVED', 'CANCELLED'], {
    errorMap: () => ({
      message:
        'status must be one of: PENDING, RECEIVED, IN_KITCHEN, COOKING, READY, SERVED, CANCELLED',
    }),
  }),
});

export type CustomerOrderSchema = z.infer<typeof customerOrderSchema>;
export type UpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;
