// ============================================================
// AI Type Contracts — Phase 5 Intelligence Engine
// Shared between API and Web packages.
// ============================================================

// ── Legacy types (Phase 3 — customer-facing, kept for backwards compat) ──

export interface AIRecommendationResponse {
  recommendations: Array<{
    menuItemId: string;
    reasoning: string;
    confidence: number;
    badge: string; // e.g., 'Best Match', 'Perfect Combo'
  }>;
}

export interface AIChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AIChatQuery {
  message: string;
  context: {
    restaurantId: string;
    cartItemIds: string[];
    currentTime: string;
  };
}

export interface AIUpsellSuggestion {
  triggerItemId: string;
  suggestedItemId: string;
  reason: string;
}

// ── Phase 5 Standard Response Envelope ────────────────────────

/**
 * Standard envelope returned by every Phase 5 AI pillar.
 * Guarantees a uniform shape for the frontend and avoids fabrication.
 */
export interface AIStandardResponse<T = unknown> {
  /** The pillar that produced this response */
  pillar: 'assistant' | 'operations' | 'analytics' | 'optimization';
  /** AI provider that was used */
  provider: 'gemini' | 'heuristic';
  /** ISO timestamp of when the analysis was generated */
  generatedAt: string;
  /** Time range the data covers (human-readable) */
  timeRange: string;
  /** Narrative answer / summary (may contain markdown) */
  answer: string;
  /** Pillar-specific structured payload */
  data: T;
  /** Optional actionable recommendations */
  recommendations?: AIRecommendation[];
  /** Confidence / caveat note shown to the user */
  confidence: AIConfidenceLevel;
  /** Whether the answer was generated from live DB data */
  dataSourceIsLive: boolean;
}

export type AIConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient_data';

export interface AIRecommendation {
  id: string;
  category: 'revenue' | 'operations' | 'inventory' | 'staffing' | 'menu' | 'marketing';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  impact?: string;
  effort?: 'low' | 'medium' | 'high';
  actionUrl?: string; // deep-link into the admin UI
}

// ── Pillar 1: AI Assistant ─────────────────────────────────────

export interface AssistantAIData {
  /** Parsed query intent */
  intent: AssistantIntent;
  /** Relevant live metrics referenced in the answer */
  metrics: Record<string, number | string>;
  /** Related data entities (items, tables, staff) */
  entities?: Array<{ type: string; name: string; value?: string }>;
}

export type AssistantIntent =
  | 'revenue_query'
  | 'inventory_query'
  | 'menu_performance_query'
  | 'staff_query'
  | 'table_query'
  | 'general_summary'
  | 'trend_analysis'
  | 'unknown';

// ── Pillar 2: Operations AI ───────────────────────────────────

export interface OperationsAIData {
  tableUtilization: {
    totalTables: number;
    activeTables: number;
    utilizationPercent: number;
    turnoverRate?: number; // orders per table per hour
  };
  peakHours: Array<{
    hour: number; // 0-23
    orderCount: number;
    revenue: number;
  }>;
  orderFlowHealth: {
    avgPrepTimeMinutes?: number;
    lateOrderPercent?: number;
    cancelRate: number;
  };
  staffingAlerts: Array<{
    role: string;
    issue: string;
    severity: 'critical' | 'warning' | 'info';
  }>;
}

// ── Pillar 3: Analytics AI ────────────────────────────────────

export interface AnalyticsAIData {
  revenueBreakdown: {
    today: number;
    yesterday?: number;
    thisWeek: number;
    lastWeek?: number;
    thisMonth: number;
    growthPercent?: number;
  };
  menuPerformance: Array<{
    menuItemId: string;
    name: string;
    category: string;
    quantitySold: number;
    revenue: number;
    profitMargin: number;
    trend: 'rising' | 'stable' | 'declining';
  }>;
  customerInsights: {
    totalOrdersThisWeek: number;
    avgOrderValue: number;
    repeatCustomerRate?: number;
  };
  forecastedRevenue?: {
    nextDay: number;
    nextWeek: number;
    confidence: AIConfidenceLevel;
  };
}

// ── Pillar 4: Optimization AI ─────────────────────────────────

export interface OptimizationAIData {
  inventoryOptimizations: Array<{
    menuItemId: string;
    name: string;
    currentStock: number;
    recommendedReorderQty: number;
    urgency: 'critical' | 'soon' | 'planned';
    estimatedDaysRemaining?: number;
  }>;
  pricingOpportunities: Array<{
    menuItemId: string;
    name: string;
    currentPrice: number;
    suggestedPrice: number;
    rationale: string;
    estimatedRevenueImpact: number;
  }>;
  menuOptimizations: Array<{
    menuItemId: string;
    name: string;
    action: 'promote' | 'bundle' | 'retire' | 'reprice';
    reason: string;
  }>;
  operationalSavings: Array<{
    area: string;
    potentialSavingRs: number;
    recommendation: string;
  }>;
}

// ── AI Background Job Types ───────────────────────────────────

export interface AIJobPayload {
  restaurantId: string;
  pillar: AIStandardResponse['pillar'];
  triggeredBy: 'schedule' | 'manual' | 'event';
  parameters?: Record<string, unknown>;
}

export interface AIInsightCacheEntry {
  pillar: AIStandardResponse['pillar'];
  restaurantId: string;
  cachedAt: string;
  expiresAt: string;
  response: AIStandardResponse;
}

// ── Frontend component props helpers ─────────────────────────

export interface AIDashboardState {
  isLoading: boolean;
  activeTab: 'assistant' | 'operations' | 'analytics' | 'optimization';
  assistant?: AIStandardResponse<AssistantAIData>;
  operations?: AIStandardResponse<OperationsAIData>;
  analytics?: AIStandardResponse<AnalyticsAIData>;
  optimization?: AIStandardResponse<OptimizationAIData>;
  error?: string;
}
