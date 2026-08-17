import { z } from 'zod';
import { UserRole } from '../types/user';

// ============================================================
// User Zod Schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

export const createUserSchema = z.object({
  restaurantId: z.string().uuid('Invalid restaurant ID').optional(),
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must be at most 100 characters')
    .trim(),
  email: z.string().email('Invalid email address').toLowerCase(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  role: z.nativeEnum(UserRole, { errorMap: () => ({ message: 'Invalid role' }) }),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  email: z.string().email().toLowerCase().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export type LoginSchema = z.infer<typeof loginSchema>;
export type CreateUserSchema = z.infer<typeof createUserSchema>;
export type UpdateUserSchema = z.infer<typeof updateUserSchema>;
