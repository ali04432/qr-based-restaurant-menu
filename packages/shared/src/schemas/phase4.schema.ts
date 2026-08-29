import { z } from 'zod';

// ============================================================
// Phase 4 Zod Validation Schemas
// ============================================================

export const CustomerTierSchema = z.enum(['BRONZE', 'SILVER', 'GOLD', 'PLATINUM']);
export const RewardTypeSchema = z.enum(['DISCOUNT_PERCENT', 'DISCOUNT_FIXED', 'FREE_ITEM']);
export const SubscriptionPlanTierSchema = z.enum(['STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']);
export const SubscriptionStatusSchema = z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED']);
export const ReportFrequencySchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export const ProviderTypeSchema = z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'PRINTER', 'ACCOUNTING', 'DELIVERY']);

// ── Loyalty & Rewards Schemas
export const CreateLoyaltyAccountSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  phone: z.string().min(8, 'Phone number must be at least 8 characters').max(30),
  email: z.string().email('Invalid email address').optional().nullable(),
  customerName: z.string().min(2, 'Name must be at least 2 characters').max(100).optional().nullable(),
});

export const AdjustLoyaltyPointsSchema = z.object({
  points: z.number().int('Points must be an integer'),
  description: z.string().max(255).optional(),
  orderId: z.string().uuid().optional().nullable(),
});

export const CreateRewardSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  name: z.string().min(2, 'Reward name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  rewardType: RewardTypeSchema,
  discountValue: z.number().min(0).default(0),
  menuItemId: z.string().uuid().optional().nullable(),
  pointsCost: z.number().int().min(1, 'Points cost must be at least 1'),
  minOrderAmount: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
  expiryDays: z.number().int().min(1).default(30),
});

export const UpdateRewardSchema = CreateRewardSchema.partial();

export const RedeemRewardSchema = z.object({
  loyaltyAccountId: z.string().uuid('Invalid loyalty account ID'),
  rewardId: z.string().uuid('Invalid reward ID'),
  orderId: z.string().uuid().optional().nullable(),
});

// ── Multi-Branch Schemas
export const CreateBranchSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  name: z.string().min(2, 'Branch name is required').max(100),
  code: z.string().min(2, 'Branch code is required').max(30).regex(/^[A-Za-z0-9_-]+$/, 'Code must be alphanumeric'),
  address: z.string().max(255).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const UpdateBranchSchema = CreateBranchSchema.partial();

// ── Integrations Schemas
export const SaveIntegrationConfigSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  providerType: ProviderTypeSchema,
  providerName: z.string().min(2).max(100),
  isEnabled: z.boolean(),
  configJson: z.string(),
});

export const TestIntegrationSchema = z.object({
  providerType: ProviderTypeSchema,
  recipient: z.string().optional(),
  testPayload: z.record(z.any()).optional(),
});

// ── Scheduled Reports Schemas
export const CreateScheduledReportSchema = z.object({
  restaurantId: z.string().uuid().optional(),
  reportType: z.enum(['SALES', 'PROFIT', 'INVENTORY', 'STAFF', 'LOYALTY', 'TAX']),
  frequency: ReportFrequencySchema,
  recipients: z.array(z.string().email()).min(1, 'At least one recipient email required'),
  format: z.enum(['CSV', 'JSON']).default('CSV'),
  isActive: z.boolean().default(true),
});

export const UpdateScheduledReportSchema = CreateScheduledReportSchema.partial();
