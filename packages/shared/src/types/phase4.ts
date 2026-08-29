// ============================================================
// Phase 4 Types: Loyalty, Rewards, Branch, SaaS, Integrations, Jobs, BI
// ============================================================

export type CustomerTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
export type RewardType = 'DISCOUNT_PERCENT' | 'DISCOUNT_FIXED' | 'FREE_ITEM';
export type SubscriptionPlanTier = 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';
export type SubscriptionStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED';
export type ReportFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type DeliveryStatus = 'UNASSIGNED' | 'PENDING_PICKUP' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'FAILED';
export type ProviderType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PRINTER' | 'ACCOUNTING' | 'DELIVERY';

// ── Loyalty & Rewards
export interface LoyaltyAccount {
  id: string;
  restaurantId: string;
  phone: string;
  email?: string | null;
  customerName?: string | null;
  pointsBalance: number;
  lifetimePoints: number;
  tier: CustomerTier;
  createdAt: string;
  updatedAt: string;
}

export interface LoyaltyTransaction {
  id: string;
  restaurantId: string;
  loyaltyAccountId?: string | null;
  customerId?: string | null;
  orderId?: string | null;
  points: number;
  description?: string | null;
  createdAt: string;
}

export interface Reward {
  id: string;
  restaurantId: string;
  name: string;
  description?: string | null;
  rewardType: RewardType;
  discountValue: number;
  menuItemId?: string | null;
  pointsCost: number;
  minOrderAmount: number;
  isActive: boolean;
  expiryDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface RewardRedemption {
  id: string;
  restaurantId: string;
  loyaltyAccountId: string;
  rewardId: string;
  orderId?: string | null;
  pointsSpent: number;
  status: 'ACTIVE' | 'REDEEMED' | 'EXPIRED';
  code: string;
  expiresAt: string;
  redeemedAt?: string | null;
  createdAt: string;
}

export interface CreateRewardInput {
  name: string;
  description?: string;
  rewardType: RewardType;
  discountValue?: number;
  menuItemId?: string;
  pointsCost: number;
  minOrderAmount?: number;
  isActive?: boolean;
  expiryDays?: number;
}

export interface UpdateRewardInput {
  name?: string;
  description?: string;
  rewardType?: RewardType;
  discountValue?: number;
  menuItemId?: string;
  pointsCost?: number;
  minOrderAmount?: number;
  isActive?: boolean;
  expiryDays?: number;
}

// ── Multi-Branch / Location
export interface Branch {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchInput {
  name: string;
  code: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateBranchInput {
  name?: string;
  code?: string;
  address?: string;
  phone?: string;
  email?: string;
  isActive?: boolean;
}

// ── SaaS Subscriptions & Entitlements
export interface SubscriptionPlan {
  id: string;
  tier: SubscriptionPlanTier;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxStaff: number;
  maxTables: number;
  maxBranches: number;
  maxOrdersPerMonth: number;
  hasAiFeatures: boolean;
  hasAdvancedAnalytics: boolean;
  hasIntegrations: boolean;
  hasCustomBranding: boolean;
}

export interface Subscription {
  id: string;
  restaurantId: string;
  planId: string;
  status: SubscriptionStatus;
  billingCycle: 'MONTHLY' | 'YEARLY';
  startDate: string;
  renewalDate: string;
  cancelledAt?: string | null;
  plan?: SubscriptionPlan;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  feature: string;
  currentUsage: number;
  limit: number;
  planTier: SubscriptionPlanTier;
  reason?: string;
}

// ── Demand Forecasting & Intelligence
export interface DemandForecastResult {
  hasSufficientData: boolean;
  confidenceScore: number;
  predictedOrderVolumeTomorrow: number;
  predictedRevenueTomorrow: number;
  peakHoursForecast: Array<{ hour: number; predictedOrders: number; label: string }>;
  itemDemandForecast: Array<{
    menuItemId: string;
    name: string;
    predictedUnitsNeeded: number;
    currentStock: number;
    projectedStockoutRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  }>;
  explanation: string;
  generatedAt?: string;
  lookbackDays?: number;
  next7DaysForecast?: Array<{
    date: string;
    dayName: string;
    predictedOrders: number;
    predictedRevenue: number;
    expectedCovers: number;
    confidenceScore: number;
  }>;
  peakHours?: Array<{
    timeSlot: string;
    hour: number;
    expectedVolumeFactor: number;
    recommendation: string;
  }>;
  topItemsForecast?: Array<{
    menuItemId: string;
    name: string;
    categoryName: string;
    dailyVelocity: number;
    forecastedWeeklyDemand: number;
    predictedRevenue: number;
  }>;
  stockoutRisks?: Array<{
    menuItemId: string;
    name: string;
    currentStock: number;
    dailyVelocity: number;
    daysUntilDepletion: number;
    severity: string;
    suggestedReorderQuantity: number;
  }>;
  aiSummary?: string;
}

export interface InventoryIntelligenceResult {
  fastMovingItems: Array<{
    menuItemId: string;
    name: string;
    categoryName: string;
    dailyVelocity: number;
    currentStock: number;
    daysOfStockLeft: number;
  }>;
  slowMovingItems: Array<{
    menuItemId: string;
    name: string;
    categoryName: string;
    daysWithoutSale: number;
    currentStock: number;
    tiedUpCapital: number;
  }>;
  reorderRecommendations: Array<{
    menuItemId: string;
    name: string;
    currentStock: number;
    recommendedReorderQty: number;
    urgency: 'CRITICAL' | 'SOON' | 'OPTIMAL';
  }>;
  totalInventoryValuation: number;
  deadStockValue: number;
}

// ── Integrations & Providers
export interface IntegrationConfig {
  id: string;
  restaurantId: string;
  providerType: ProviderType;
  providerName: string;
  isEnabled: boolean;
  configJson: string;
  lastTestedAt?: string | null;
  lastStatus?: string | null;
}

export interface IntegrationTestResult {
  success: boolean;
  providerType?: ProviderType;
  provider?: string;
  providerName?: string;
  message: string;
  latencyMs?: number;
  payloadPreview?: any;
  previewPayload?: any;
  details?: any;
}

export interface PrintReceiptPayload {
  orderId: string;
  orderNumber: string;
  restaurantName: string;
  tableNumber: string;
  serverName?: string;
  items: Array<{ name: string; quantity: number; unitPrice: number; subtotal: number }>;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
  paymentMethod: string;
  createdAt: string;
  footerNote?: string;
}

// ── Scheduled Reports & Background Jobs
export interface ScheduledReport {
  id: string;
  restaurantId: string;
  reportType: 'SALES' | 'PROFIT' | 'INVENTORY' | 'STAFF' | 'LOYALTY' | 'TAX';
  frequency: ReportFrequency;
  recipients: string[];
  format: string;
  isActive: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  createdAt: string;
}

export interface BackgroundJobLog {
  id: string;
  restaurantId?: string | null;
  jobType: string;
  status: JobStatus;
  payload?: any;
  result?: any;
  error?: string | null;
  retries: number;
  maxRetries: number;
  scheduledFor: string;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
}

// ── Audit Log
export interface AuditLog {
  id: string;
  restaurantId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: string | null;
  ipAddress?: string | null;
  createdAt: string;
}

// ── Health Diagnostics
export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable';
  timestamp: string;
  uptimeSeconds: number;
  database: { status: 'healthy' | 'unavailable'; latencyMs: number };
  memory: { usedMb: number; totalMb: number; freePercent: number };
  socketServer: { status: 'healthy' | 'unavailable'; connectedClients: number };
  jobsWorker: { status: 'healthy' | 'degraded'; pendingJobs: number; failedRecent: number };
  integrations: Array<{ providerType: ProviderType; isEnabled: boolean; status: string }>;
}
