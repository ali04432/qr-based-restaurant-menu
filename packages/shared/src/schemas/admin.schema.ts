import { z } from 'zod';
import { UserRole } from '../types/user';

// ============================================================
// Staff Validation Schemas
// ============================================================

export const createStaffSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.nativeEnum(UserRole),
  salary: z.number().nonnegative('Salary must be a positive number').default(0),
});

export const updateStaffSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  role: z.nativeEnum(UserRole).optional(),
  salary: z.number().nonnegative().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED']).optional(),
  password: z.string().min(6).optional(),
});

// ============================================================
// Inventory Adjustment Schema
// ============================================================

export const stockAdjustmentSchema = z.object({
  menuItemId: z.string().min(1, 'Menu item ID is required'),
  adjustmentType: z.enum(['SET', 'INCREASE', 'DECREASE']),
  quantity: z.number().int().nonnegative('Quantity must be non-negative'),
  reason: z.string().max(200).optional(),
});

export const lowStockThresholdSchema = z.object({
  threshold: z.number().int().nonnegative('Threshold must be non-negative'),
});

// ============================================================
// Category Management Schema
// ============================================================

export const createCategorySchema = z.object({
  restaurantId: z.string().min(1).optional(),
  name: z.string().min(2, 'Category name is required').max(100),
  slug: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url('Invalid image URL').optional().or(z.literal('')).nullable(),
  order: z.number().int().nonnegative().default(0),
  isActive: z.boolean().default(true),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  image: z.string().url().optional().or(z.literal('')).nullable(),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Menu Item Management Schema
// ============================================================

export const createMenuItemAdminSchema = z.object({
  restaurantId: z.string().min(1).optional(),
  categoryId: z.string().min(1, 'Category is required'),
  name: z.string().min(2, 'Item name is required').max(200),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive('Price must be greater than 0'),
  costPrice: z.number().nonnegative('Cost price must be non-negative').default(0),
  stockCount: z.number().int().nonnegative().optional().nullable(),
  lowStockThreshold: z.number().int().nonnegative().default(10),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  isPopular: z.boolean().default(false),
  prepTimeMin: z.number().int().positive().default(10),
  prepTimeMax: z.number().int().positive().default(20),
  badge: z.string().optional().nullable(),
  tags: z.array(z.string()).default([]),
  image: z.string().optional().or(z.literal('')).nullable(),
});

export const updateMenuItemAdminSchema = z.object({
  categoryId: z.string().min(1).optional(),
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  price: z.number().positive().optional(),
  costPrice: z.number().nonnegative().optional(),
  stockCount: z.number().int().nonnegative().optional().nullable(),
  lowStockThreshold: z.number().int().nonnegative().optional(),
  isAvailable: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  prepTimeMin: z.number().int().positive().optional(),
  prepTimeMax: z.number().int().positive().optional(),
  badge: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  image: z.string().optional().or(z.literal('')).nullable(),
});

// ============================================================
// Table Management Schema
// ============================================================

export const createTableAdminSchema = z.object({
  restaurantId: z.string().min(1).optional(),
  tableNumber: z.string().min(1, 'Table number is required').max(20),
  capacity: z.number().int().positive('Capacity must be at least 1').default(4),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED']).default('AVAILABLE'),
  isActive: z.boolean().default(true),
});

export const updateTableAdminSchema = z.object({
  tableNumber: z.string().min(1).max(20).optional(),
  capacity: z.number().int().positive().optional(),
  status: z.enum(['AVAILABLE', 'OCCUPIED', 'RESERVED']).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Promotion Schema
// ============================================================

export const createPromotionSchema = z.object({
  restaurantId: z.string().min(1).optional(),
  name: z.string().min(2, 'Name is required').max(100),
  code: z.string().min(3, 'Code must be at least 3 characters').max(50).toUpperCase(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']),
  discountValue: z.number().positive('Discount value must be greater than 0'),
  minOrderAmount: z.number().nonnegative().default(0),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updatePromotionSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(3).max(50).toUpperCase().optional(),
  discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
  discountValue: z.number().positive().optional(),
  minOrderAmount: z.number().nonnegative().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

// ============================================================
// Feedback Schema
// ============================================================

export const createFeedbackSchema = z.object({
  restaurantId: z.string().min(1, 'Restaurant ID is required'),
  orderId: z.string().optional().nullable(),
  tableNumber: z.string().optional().nullable(),
  customerName: z.string().max(100).optional().nullable(),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().max(1000).optional().nullable(),
});

// ============================================================
// Restaurant Settings Schema
// ============================================================

export const updateSettingsSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  logo: z.string().optional().or(z.literal('')).nullable(),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  currency: z.string().min(1).max(10).optional(),
  taxRate: z.number().nonnegative().max(100).optional(),
  serviceCharge: z.number().nonnegative().optional(),
  isOpen: z.boolean().optional(),
  openingHours: z.string().max(100).optional().nullable(),
});
