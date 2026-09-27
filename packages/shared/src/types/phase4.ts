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
export type ProviderType = 'WHATSAPP' | 'SMS' | 'EMAIL' | 'PRINTER' | 'THERMAL_PRINTER' | 'ACCOUNTING' | 'DELIVERY';

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
  predictedOrdersNext7Days?: number;
  peakLoadSlots?: string[];
  stockoutAlerts?: string[];
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

// ============================================================
// AR & 3D Visualization Types (Phase 4 — AR Infrastructure)
// ============================================================

export type ArAssetType = 'MODEL_3D' | 'AR_GLTF' | 'AR_USDZ';
/** Asset readiness / lifecycle status */
export type ArAssetStatus = 'ACTIVE' | 'INACTIVE' | 'DRAFT';
/** Asset production-readiness classification (stored in metadata or a dedicated field) */
export type ArAssetReadiness = 'DEMO' | 'TEST' | 'PRODUCTION' | 'READY';

export interface ArAsset {
  id: string;
  restaurantId: string;
  menuItemId?: string | null;
  name: string;
  assetType: ArAssetType;
  modelUrl: string;
  iosModelUrl?: string | null;
  previewImage?: string | null;
  mimeType: string;
  fileSize?: number | null;
  scale: number;
  /** Real-world physical width of the dish/container in centimetres */
  widthCm?: number | null;
  /** Real-world physical height of the dish/container in centimetres */
  heightCm?: number | null;
  /** Real-world physical depth of the dish/container in centimetres */
  depthCm?: number | null;
  /** Human-readable portion description, e.g. "1 Plate" or "Half Portion" */
  portionLabel?: string | null;
  status: ArAssetStatus;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ArAssetWithItem extends ArAsset {
  menuItem?: {
    id: string;
    name: string;
    price: number;
    image?: string | null;
  } | null;
}

export interface CreateArAssetInput {
  menuItemId?: string;
  name: string;
  assetType?: ArAssetType;
  modelUrl: string;
  iosModelUrl?: string;
  previewImage?: string;
  mimeType?: string;
  fileSize?: number;
  scale?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  portionLabel?: string;
  status?: ArAssetStatus;
  metadata?: string;
}

export interface UpdateArAssetInput {
  name?: string;
  assetType?: ArAssetType;
  modelUrl?: string;
  iosModelUrl?: string;
  previewImage?: string;
  mimeType?: string;
  fileSize?: number;
  scale?: number;
  widthCm?: number;
  heightCm?: number;
  depthCm?: number;
  portionLabel?: string;
  status?: ArAssetStatus;
  metadata?: string;
}

export type VisualizationEventType =
  | 'ar.viewer.opened'
  | 'ar.model.loaded'
  | 'ar.session.started'
  | 'ar.session.ended'
  | 'ar.failed'
  | 'view3d.opened'
  | 'view3d.rotated'
  | 'view3d.zoomed';

export interface VisualizationEvent {
  id: string;
  restaurantId: string;
  menuItemId?: string | null;
  assetId?: string | null;
  sessionId?: string | null;
  eventType: VisualizationEventType;
  deviceType?: string | null;
  arSupported: boolean;
  metadata?: string | null;
  createdAt: string;
}

export interface TrackVisualizationInput {
  menuItemId?: string;
  assetId?: string;
  sessionId?: string;
  eventType: VisualizationEventType;
  deviceType?: string;
  arSupported?: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================
// AI Service Layer Types (Phase 4 — Swappable AI Provider)
// ============================================================

export interface AiQueryRequest {
  restaurantId: string;
  query: string;
  context?: Record<string, unknown>;
}

export interface AiQueryResponse {
  reply: string;
  provider: 'gemini' | 'heuristic';
  timestamp: string;
  metricsSummary?: {
    todayRevenue: number;
    todayOrders: number;
    weekRevenue: number;
    weekProfit: number;
    lowStockCount: number;
  };
}

export interface AiRecommendationItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  image?: string | null;
  badge?: string | null;
  score: number;
  reason: string;
  hasArAsset: boolean;
  arAssetId?: string | null;
}

