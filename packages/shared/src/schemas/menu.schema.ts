import { z } from 'zod';

// ============================================================
// Menu Zod Schemas
// ============================================================

export const createMenuCategorySchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  name: z.string().min(1, 'Category name is required').max(100).trim(),
  description: z.string().max(500).trim().optional(),
  order: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const updateMenuCategorySchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  order: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const createMenuItemSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID'),
  categoryId: z.string().uuid('Invalid category ID'),
  name: z.string().min(1, 'Item name is required').max(200).trim(),
  description: z.string().max(1000).trim().default(''),
  price: z.number().positive('Price must be positive'),
  image: z.string().url('Image must be a valid URL').optional().or(z.literal('')),
  prepTimeMin: z.number().int().min(1).default(10),
  prepTimeMax: z.number().int().min(1).default(20),
  badge: z.string().max(50).optional().nullable(),
  tags: z.array(z.string()).default([]),
  isAvailable: z.boolean().default(true),
});

export const updateMenuItemSchema = createMenuItemSchema
  .omit({ restaurantId: true, categoryId: true })
  .partial();

export type CreateMenuCategorySchema = z.infer<typeof createMenuCategorySchema>;
export type UpdateMenuCategorySchema = z.infer<typeof updateMenuCategorySchema>;
export type CreateMenuItemSchema = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemSchema = z.infer<typeof updateMenuItemSchema>;
