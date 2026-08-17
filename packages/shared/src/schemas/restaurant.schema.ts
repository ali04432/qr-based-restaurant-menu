import { z } from 'zod';

// ============================================================
// Restaurant Zod Schemas
// ============================================================

export const createRestaurantSchema = z.object({
  name: z
    .string()
    .min(2, 'Restaurant name must be at least 2 characters')
    .max(100, 'Restaurant name must be at most 100 characters')
    .trim(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(60, 'Slug must be at most 60 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase letters, numbers, and hyphens')
    .trim(),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  slug: z
    .string()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/)
    .trim()
    .optional(),
});

export type CreateRestaurantSchema = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantSchema = z.infer<typeof updateRestaurantSchema>;
