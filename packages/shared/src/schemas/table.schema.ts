import { z } from 'zod';

// ============================================================
// Table Zod Schemas
// ============================================================

export const createTableSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  tableNumber: z
    .string()
    .min(1, 'Table number is required')
    .max(20, 'Table number must be at most 20 characters')
    .trim(),
});

export const updateTableSchema = z.object({
  tableNumber: z.string().min(1).max(20).trim().optional(),
  isActive: z.boolean().optional(),
});

export type CreateTableSchema = z.infer<typeof createTableSchema>;
export type UpdateTableSchema = z.infer<typeof updateTableSchema>;
