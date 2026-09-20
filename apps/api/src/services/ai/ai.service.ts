import { prisma } from '../../config/database';
import { env } from '../../config/env';
import type {
  AIStandardResponse,
  AIConfidenceLevel,
  AIRecommendation,
  AssistantAIData,
  AssistantIntent,
  OperationsAIData,
  AnalyticsAIData,
  OptimizationAIData,
} from '@qr-menu/shared';

// ============================================================
// AI Service Layer — Phase 5 Intelligence Engine
//
// Architecture:
//   1. Attempt Gemini API call (if GEMINI_API_KEY is configured).
//   2. Fall back to high-quality database heuristic responses
//      if the key is missing, quota exceeded, or network fails.
//
// Four Pillars:
//   - Assistant    : Natural-language business Q&A
//   - Operations   : Table / floor / order-flow analysis
//   - Analytics    : Revenue, menu performance, forecasting
//   - Optimization : Inventory, pricing, and menu improvement
//
// IMPORTANT: AI is an intelligence layer, NOT a dependency for
// basic restaurant operation. All pillars gracefully degrade.
// ============================================================

/** Interface every AI provider must implement */
export interface IAIProvider {
  name: string;
  isAvailable(): boolean;
  query(prompt: string, context: RestaurantContext): Promise<string>;
}

export interface RestaurantContext {
  restaurantId: string;
  restaurantName: string;
  todaySales: number;
  todayProfit: number;
  todayOrders: number;
  weekSales: number;
  weekProfit: number;
  lowStockItems: Array<{ name: string; stock: number; threshold: number }>;
  topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  allTables: number;
  activeTables: number;
}

// ── Gemini Provider ───────────────────────────────────────────

class GeminiProvider implements IAIProvider {
  name = 'gemini';

  isAvailable(): boolean {
    return Boolean(env.GEMINI_API_KEY && env.GEMINI_API_KEY.length > 10);
  }

  async query(prompt: string, context: RestaurantContext): Promise<string> {
    if (!env.GEMINI_API_KEY) throw new Error('Gemini API key not configured');

    const systemPrompt = `You are an expert AI restaurant business analyst for ${context.restaurantName}.
Current restaurant data:
- Today's Revenue: Rs. ${context.todaySales.toLocaleString()} (${context.todayOrders} orders)
- This Week's Gross Sales: Rs. ${context.weekSales.toLocaleString()}
- This Week's Gross Profit: Rs. ${context.weekProfit.toLocaleString()}
- Active Tables: ${context.activeTables}/${context.allTables}
- Low Stock Items: ${context.lowStockItems.length}
${context.lowStockItems.length > 0 ? `  Items needing restock: ${context.lowStockItems.map((i) => i.name).join(', ')}` : ''}
- Top Sellers: ${context.topSellingItems.slice(0, 3).map((i) => `${i.name} (${i.quantity} sold)`).join(', ')}

Answer the following question with specific, actionable insight using only the data provided. Be concise and use markdown formatting where appropriate.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\nQuestion: ${prompt}` }],
            },
          ],
          generationConfig: { maxOutputTokens: 512, temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const json = (await response.json()) as any;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty Gemini response');
    return text;
  }
}

// ── Heuristic Database Provider (fallback) ────────────────────

class HeuristicProvider implements IAIProvider {
  name = 'heuristic';

  isAvailable(): boolean {
    return true; // Always available
  }

  async query(prompt: string, context: RestaurantContext): Promise<string> {
    const normalized = prompt.toLowerCase().trim();

    if (normalized.includes('today') && (normalized.includes('sale') || normalized.includes('revenue') || normalized.includes('order'))) {
      return `Today's revenue is **Rs. ${context.todaySales.toLocaleString()}** across **${context.todayOrders} order(s)**. Estimated gross profit today is **Rs. ${Math.round(context.todayProfit ?? 0).toLocaleString()}**.`;
    }

    if (normalized.includes('best') || normalized.includes('top') || normalized.includes('popular') || normalized.includes('most sold')) {
      if (context.topSellingItems.length > 0) {
        const topList = context.topSellingItems.slice(0, 3).map((i, idx) =>
          `${idx + 1}. **${i.name}** (${i.quantity} sold — Rs. ${i.revenue.toLocaleString()})`
        ).join('\n');
        return `Top selling dishes this week:\n${topList}`;
      }
      return 'No sales recorded yet this week to determine top-selling dishes.';
    }

    if (normalized.includes('profit') || normalized.includes('margin') || normalized.includes('gross')) {
      const margin = context.weekSales > 0 ? ((context.weekProfit / context.weekSales) * 100).toFixed(1) : '0.0';
      return `This week's gross sales are **Rs. ${context.weekSales.toLocaleString()}** with a gross profit of **Rs. ${context.weekProfit.toLocaleString()}** (${margin}% profit margin).`;
    }

    if (normalized.includes('stock') || normalized.includes('inventory') || normalized.includes('low')) {
      if (context.lowStockItems.length > 0) {
        const list = context.lowStockItems.map((i) =>
          `• **${i.name}**: ${i.stock} portions left (Threshold: ${i.threshold})`
        ).join('\n');
        return `Items currently requiring replenishment:\n${list}`;
      }
      return 'All menu items currently have healthy stock levels.';
    }

    if (normalized.includes('busy') || normalized.includes('peak') || normalized.includes('table')) {
      return `Currently **${context.activeTables}** of **${context.allTables}** tables are active at ${context.restaurantName}.`;
    }

    // Default summary
    return `Here is your current restaurant summary for **${context.restaurantName}**:\n\n` +
      `• **Today's Revenue:** Rs. ${context.todaySales.toLocaleString()} (${context.todayOrders} orders)\n` +
      `• **Weekly Gross Sales:** Rs. ${context.weekSales.toLocaleString()}\n` +
      `• **Weekly Gross Profit:** Rs. ${context.weekProfit.toLocaleString()}\n` +
      `• **Active Tables:** ${context.activeTables}/${context.allTables}\n` +
      `• **Low Stock Items:** ${context.lowStockItems.length} item(s)\n\n` +
      `Ask me about sales trends, dish profitability, inventory alerts, or underperforming dishes.`;
  }
}

// ── Service Orchestrator ──────────────────────────────────────

const geminiProvider = new GeminiProvider();
const heuristicProvider = new HeuristicProvider();

/**
 * Build a RestaurantContext by fetching live database data.
 */
export async function buildRestaurantContext(restaurantId: string): Promise<RestaurantContext> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - 6);
  startOfWeek.setHours(0, 0, 0, 0);

  const [restaurant, todayOrders, weekOrders, menuItems, tables] = await Promise.all([
    prisma.restaurant.findUnique({ where: { id: restaurantId } }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfToday }, status: { not: 'CANCELLED' as any } },
      include: { items: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfWeek }, status: { not: 'CANCELLED' as any } },
      include: { items: true },
    }),
    prisma.menuItem.findMany({
      where: { restaurantId },
      include: { inventory: true },
    }),
    prisma.table.findMany({ where: { restaurantId } }),
  ]);

  const costMap = new Map<string, number>();
  menuItems.forEach((m) => costMap.set(m.id, m.costPrice ?? 0));

  const todaySales = todayOrders.reduce((s, o) => s + o.total, 0);
  let todayCost = 0;
  todayOrders.forEach((o) => o.items.forEach((i) => { todayCost += (i.costPriceAtOrder ?? costMap.get(i.menuItemId) ?? 0) * i.quantity; }));

  const weekSales = weekOrders.reduce((s, o) => s + o.total, 0);
  let weekCost = 0;
  weekOrders.forEach((o) => o.items.forEach((i) => { weekCost += (i.costPriceAtOrder ?? costMap.get(i.menuItemId) ?? 0) * i.quantity; }));

  // Top sellers
  const itemMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  weekOrders.forEach((o) =>
    o.items.forEach((i) => {
      const curr = itemMap.get(i.menuItemId) || { name: i.name, quantity: 0, revenue: 0 };
      curr.quantity += i.quantity;
      curr.revenue += i.subtotal;
      itemMap.set(i.menuItemId, curr);
    })
  );
  const topSellingItems = Array.from(itemMap.values()).sort((a, b) => b.quantity - a.quantity);

  // Low stock
  const lowStockItems = menuItems
    .filter((m) => {
      const stock = m.stockCount ?? m.inventory[0]?.stockCount ?? null;
      const threshold = m.inventory[0]?.lowStockThreshold ?? 10;
      return stock !== null && stock <= threshold;
    })
    .map((m) => ({
      name: m.name,
      stock: m.stockCount ?? m.inventory[0]?.stockCount ?? 0,
      threshold: m.inventory[0]?.lowStockThreshold ?? 10,
    }));

  return {
    restaurantId,
    restaurantName: restaurant?.name ?? 'Restaurant',
    todaySales,
    todayOrders: todayOrders.length,
    todayProfit: todaySales - todayCost,
    weekSales,
    weekProfit: weekSales - weekCost,
    lowStockItems,
    topSellingItems,
    allTables: tables.length,
    activeTables: tables.filter((t) => t.status !== 'AVAILABLE').length,
  } as RestaurantContext & { todayProfit: number };
}

/**
 * Main AI query entry point. Tries Gemini first, falls back to heuristics.
 * Never throws — always returns a structured response.
 */
export async function aiQuery(
  restaurantId: string,
  query: string
): Promise<{ reply: string; provider: 'gemini' | 'heuristic'; context: RestaurantContext }> {
  const context = await buildRestaurantContext(restaurantId);

  if (geminiProvider.isAvailable()) {
    try {
      const reply = await geminiProvider.query(query, context);
      return { reply, provider: 'gemini', context };
    } catch (err) {
      console.warn('[AI] Gemini failed, falling back to heuristic:', (err as Error).message);
    }
  }

  const reply = await heuristicProvider.query(query, context);
  return { reply, provider: 'heuristic', context };
}

/**
 * Get AI-powered recommendations enriched with AR asset availability flags.
 */
export async function getAiRecommendations(
  restaurantId: string,
  cartItemIds: string[],
  budget?: number
): Promise<Array<{
  id: string; name: string; description: string | null; price: number;
  image: string | null; badge: string | null; score: number; reason: string;
  hasArAsset: boolean; arAssetId: string | null;
}>> {
  const allAvailable = await prisma.menuItem.findMany({
    where: {
      restaurantId,
      isAvailable: true,
      id: { notIn: cartItemIds },
      ...(budget ? { price: { lte: budget } } : {}),
    },
    include: {
      arAsset: { select: { id: true } },
      category: { select: { name: true } },
    },
  });

  if (allAvailable.length === 0) return [];

  // Co-occurrence scoring
  const coOccurrence = new Map<string, number>();
  if (cartItemIds.length > 0) {
    const relatedOrders = await prisma.order.findMany({
      where: {
        restaurantId,
        status: { not: 'CANCELLED' as any },
        items: { some: { menuItemId: { in: cartItemIds } } },
      },
      include: { items: true },
      take: 50,
    });
    relatedOrders.forEach((o) =>
      o.items.forEach((i) => {
        if (!cartItemIds.includes(i.menuItemId)) {
          coOccurrence.set(i.menuItemId, (coOccurrence.get(i.menuItemId) || 0) + i.quantity);
        }
      })
    );
  }

  return allAvailable
    .map((item) => {
      let score = 0;
      let reason = "Chef's Special Recommendation";
      const coCount = coOccurrence.get(item.id) || 0;
      if (coCount > 0) { score += coCount * 10; reason = 'Frequently Ordered Together'; }
      if (item.isFeatured) { score += 5; if (coCount === 0) reason = 'Restaurant Favorite'; }
      if (item.badge === 'BESTSELLER') { score += 8; if (coCount === 0) reason = 'Bestselling Item'; }
      if (item.isPopular) { score += 3; if (coCount === 0 && !item.isFeatured) reason = 'Popular Choice'; }
      // Boost items with AR assets — they are more engaging
      if (item.arAsset) { score += 4; }

      return {
        id: item.id,
        name: item.name,
        description: item.description,
        price: item.price,
        image: item.image,
        badge: item.badge,
        score,
        reason,
        hasArAsset: Boolean(item.arAsset),
        arAssetId: item.arAsset?.id ?? null,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

// ============================================================
// ── PHASE 5: FOUR-PILLAR AI ENGINE ───────────────────────────
// ============================================================

// ── Helpers ───────────────────────────────────────────────────

function detectIntent(query: string): AssistantIntent {
  const q = query.toLowerCase();
  if (q.includes('revenue') || q.includes('sale') || q.includes('earning') || q.includes('income')) return 'revenue_query';
  if (q.includes('stock') || q.includes('inventory') || q.includes('reorder') || q.includes('low')) return 'inventory_query';
  if (q.includes('dish') || q.includes('menu') || q.includes('item') || q.includes('food') || q.includes('popular') || q.includes('bestsell')) return 'menu_performance_query';
  if (q.includes('staff') || q.includes('waiter') || q.includes('chef') || q.includes('cashier')) return 'staff_query';
  if (q.includes('table') || q.includes('seat') || q.includes('capacity') || q.includes('floor')) return 'table_query';
  if (q.includes('trend') || q.includes('forecast') || q.includes('predict') || q.includes('growth')) return 'trend_analysis';
  if (q.includes('summary') || q.includes('overview') || q.includes('report') || q.includes('status')) return 'general_summary';
  return 'unknown';
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function buildProviderLabel(provider: string): 'gemini' | 'heuristic' {
  return provider === 'gemini' ? 'gemini' : 'heuristic';
}

// ── Pillar 1: AI Assistant ─────────────────────────────────────

/**
 * Natural-language restaurant Q&A assistant.
 * Wraps the existing aiQuery() in the standard Phase 5 envelope.
 */
export async function runAssistantPillar(
  restaurantId: string,
  query: string
): Promise<AIStandardResponse<AssistantAIData>> {
  const { reply, provider, context } = await aiQuery(restaurantId, query);

  const intent = detectIntent(query);

  const metrics: Record<string, number | string> = {
    todayRevenue: context.todaySales,
    todayOrders: context.todayOrders,
    weekRevenue: context.weekSales,
    weekProfit: context.weekProfit,
    lowStockCount: context.lowStockItems.length,
    activeTables: context.activeTables,
  };

  const recommendations: AIRecommendation[] = [];

  if (context.lowStockItems.length > 0) {
    recommendations.push({
      id: makeId(),
      category: 'inventory',
      priority: context.lowStockItems.length >= 3 ? 'critical' : 'high',
      title: `${context.lowStockItems.length} item(s) need restocking`,
      description: `Low stock detected: ${context.lowStockItems.map((i) => i.name).join(', ')}`,
      impact: 'Prevents menu gaps and lost revenue',
      effort: 'low',
      actionUrl: '/admin/inventory',
    });
  }

  if (context.todayOrders === 0 && new Date().getHours() >= 12) {
    recommendations.push({
      id: makeId(),
      category: 'revenue',
      priority: 'high',
      title: 'No orders recorded today',
      description: 'Consider running a lunch promotion or checking if the ordering system is active.',
      effort: 'medium',
      actionUrl: '/admin/promotions',
    });
  }

  return {
    pillar: 'assistant',
    provider: buildProviderLabel(provider),
    generatedAt: new Date().toISOString(),
    timeRange: 'Today + last 7 days',
    answer: reply,
    data: {
      intent,
      metrics,
      entities: context.topSellingItems.slice(0, 3).map((i) => ({
        type: 'menu_item',
        name: i.name,
        value: `Rs. ${i.revenue.toLocaleString()} revenue`,
      })),
    },
    recommendations,
    confidence: context.todayOrders > 0 ? 'high' : 'medium',
    dataSourceIsLive: true,
  };
}

// ── Pillar 2: Operations AI ───────────────────────────────────

/**
 * Analyzes table utilization, peak hours, order flow, and operational health.
 * Pure database-driven — no external AI call needed.
 */
export async function runOperationsPillar(
  restaurantId: string
): Promise<AIStandardResponse<OperationsAIData>> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOf7Days = new Date(now);
  startOf7Days.setDate(now.getDate() - 6);
  startOf7Days.setHours(0, 0, 0, 0);

  const [tables, todayOrders, weekOrders] = await Promise.all([
    prisma.table.findMany({ where: { restaurantId } }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOfToday }, status: { not: 'CANCELLED' as any } },
      select: { id: true, total: true, status: true, createdAt: true, tableId: true },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOf7Days }, status: { not: 'CANCELLED' as any } },
      select: { id: true, total: true, createdAt: true, status: true },
    }),
  ]);

  const allTables = tables.length;
  const activeTables = tables.filter((t) => t.status !== 'AVAILABLE').length;
  const utilizationPercent = allTables > 0 ? Math.round((activeTables / allTables) * 100) : 0;

  // Peak hours from last 7 days
  const hourMap = new Map<number, { orderCount: number; revenue: number }>();
  for (let h = 0; h < 24; h++) hourMap.set(h, { orderCount: 0, revenue: 0 });
  weekOrders.forEach((o) => {
    const h = new Date(o.createdAt).getHours();
    const curr = hourMap.get(h)!;
    curr.orderCount += 1;
    curr.revenue += o.total;
  });
  const peakHours = Array.from(hourMap.entries())
    .filter(([, v]) => v.orderCount > 0)
    .map(([hour, v]) => ({ hour, ...v }))
    .sort((a, b) => b.orderCount - a.orderCount);

  // Cancel rate today
  const [cancelledToday] = await Promise.all([
    prisma.order.count({
      where: { restaurantId, createdAt: { gte: startOfToday }, status: 'CANCELLED' as any },
    }),
  ]);
  const totalToday = todayOrders.length + cancelledToday;
  const cancelRate = totalToday > 0 ? Math.round((cancelledToday / totalToday) * 100) : 0;

  const staffingAlerts: OperationsAIData['staffingAlerts'] = [];
  if (utilizationPercent >= 80) {
    staffingAlerts.push({
      role: 'Waiter',
      issue: `High table utilization (${utilizationPercent}%) — consider deploying extra staff`,
      severity: 'warning',
    });
  }
  if (cancelRate >= 10) {
    staffingAlerts.push({
      role: 'Kitchen',
      issue: `Cancel rate is ${cancelRate}% today — review kitchen throughput`,
      severity: 'warning',
    });
  }

  const recommendations: AIRecommendation[] = [];
  if (utilizationPercent >= 90) {
    recommendations.push({
      id: makeId(),
      category: 'operations',
      priority: 'critical',
      title: 'Near maximum table capacity',
      description: `${activeTables}/${allTables} tables are active. Consider a waitlist or reservations system.`,
      effort: 'medium',
      actionUrl: '/admin/tables',
    });
  }

  const topPeak = peakHours[0];
  const answerParts: string[] = [
    `**Table Utilization:** ${activeTables}/${allTables} tables active (${utilizationPercent}%).`,
  ];
  if (topPeak) {
    const formattedHour = topPeak.hour >= 12
      ? `${topPeak.hour === 12 ? 12 : topPeak.hour - 12}:00 PM`
      : `${topPeak.hour === 0 ? 12 : topPeak.hour}:00 AM`;
    answerParts.push(`**Peak Hour (last 7 days):** ${formattedHour} (${topPeak.orderCount} orders, Rs. ${topPeak.revenue.toLocaleString()}).`);
  }
  answerParts.push(`**Today's Cancel Rate:** ${cancelRate}%.`);
  if (staffingAlerts.length > 0) {
    answerParts.push(`**Alerts:** ${staffingAlerts.map((a) => a.issue).join(' | ')}`);
  }

  return {
    pillar: 'operations',
    provider: 'heuristic',
    generatedAt: new Date().toISOString(),
    timeRange: 'Today + last 7 days',
    answer: answerParts.join('\n\n'),
    data: {
      tableUtilization: { totalTables: allTables, activeTables, utilizationPercent },
      peakHours,
      orderFlowHealth: {
        cancelRate,
      },
      staffingAlerts,
    },
    recommendations,
    confidence: weekOrders.length >= 10 ? 'high' : weekOrders.length >= 3 ? 'medium' : 'insufficient_data',
    dataSourceIsLive: true,
  };
}

// ── Pillar 3: Analytics AI ────────────────────────────────────

/**
 * Revenue breakdown, menu performance, customer insights, and revenue forecasting.
 */
export async function runAnalyticsPillar(
  restaurantId: string
): Promise<AIStandardResponse<AnalyticsAIData>> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
  const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - 6);
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(now);
  startOfLastWeek.setDate(now.getDate() - 13);
  startOfLastWeek.setHours(0, 0, 0, 0);
  const endOfLastWeek = new Date(now);
  endOfLastWeek.setDate(now.getDate() - 7);
  endOfLastWeek.setHours(23, 59, 59, 999);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

  const [todayOrders, yesterdayOrders, thisWeekOrders, lastWeekOrders, thisMonthOrders, menuItems] =
    await Promise.all([
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: startOfToday }, status: { not: 'CANCELLED' as any } },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: startOfYesterday, lte: endOfYesterday }, status: { not: 'CANCELLED' as any } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: startOfThisWeek }, status: { not: 'CANCELLED' as any } },
        include: { items: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: startOfLastWeek, lte: endOfLastWeek }, status: { not: 'CANCELLED' as any } },
        select: { total: true },
      }),
      prisma.order.findMany({
        where: { restaurantId, createdAt: { gte: startOfThisMonth }, status: { not: 'CANCELLED' as any } },
        select: { total: true },
      }),
      prisma.menuItem.findMany({
        where: { restaurantId },
        include: { category: { select: { name: true } } },
      }),
    ]);

  const today = todayOrders.reduce((s, o) => s + o.total, 0);
  const yesterday = yesterdayOrders.reduce((s, o) => s + o.total, 0);
  const thisWeek = thisWeekOrders.reduce((s, o) => s + o.total, 0);
  const lastWeek = lastWeekOrders.reduce((s, o) => s + o.total, 0);
  const thisMonth = thisMonthOrders.reduce((s, o) => s + o.total, 0);
  const growthPercent = lastWeek > 0 ? Math.round(((thisWeek - lastWeek) / lastWeek) * 100) : undefined;

  // Cost map for profit margins
  const costMap = new Map<string, number>();
  menuItems.forEach((m) => costMap.set(m.id, m.costPrice ?? 0));

  // Menu performance from this week
  const itemPerfMap = new Map<
    string,
    { name: string; category: string; quantitySold: number; revenue: number; cost: number; price: number }
  >();
  thisWeekOrders.forEach((o) =>
    o.items.forEach((i) => {
      const curr = itemPerfMap.get(i.menuItemId) || {
        name: i.name,
        category: menuItems.find((m) => m.id === i.menuItemId)?.category?.name ?? 'Uncategorized',
        quantitySold: 0,
        revenue: 0,
        cost: 0,
        price: i.unitPrice,
      };
      curr.quantitySold += i.quantity;
      curr.revenue += i.subtotal;
      curr.cost += (i.costPriceAtOrder ?? costMap.get(i.menuItemId) ?? 0) * i.quantity;
      itemPerfMap.set(i.menuItemId, curr);
    })
  );

  const menuPerformance = Array.from(itemPerfMap.entries())
    .map(([menuItemId, d]) => {
      const profitMargin = d.revenue > 0 ? Math.round(((d.revenue - d.cost) / d.revenue) * 100) : 0;
      // Simple trend: above average quantity = rising
      const avgQty = Array.from(itemPerfMap.values()).reduce((s, x) => s + x.quantitySold, 0) / (itemPerfMap.size || 1);
      const trend: 'rising' | 'stable' | 'declining' = d.quantitySold > avgQty * 1.2 ? 'rising' : d.quantitySold < avgQty * 0.5 ? 'declining' : 'stable';
      return { menuItemId, name: d.name, category: d.category, quantitySold: d.quantitySold, revenue: d.revenue, profitMargin, trend };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Customer insights
  const avgOrderValue = thisWeekOrders.length > 0 ? thisWeek / thisWeekOrders.length : 0;

  // Simple revenue forecast (7-day rolling average * days remaining in week)
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const daysIntoWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
  const dailyAvg = thisWeek / daysIntoWeek;
  const forecastedRevenue = {
    nextDay: Math.round(dailyAvg),
    nextWeek: Math.round(dailyAvg * 7),
    confidence: (thisWeekOrders.length >= 20 ? 'medium' : 'low') as AIConfidenceLevel,
  };

  const growthLabel = growthPercent !== undefined
    ? growthPercent >= 0 ? `up ${growthPercent}%` : `down ${Math.abs(growthPercent)}%`
    : 'compared to last week: insufficient data';

  const recommendations: AIRecommendation[] = [];
  if (growthPercent !== undefined && growthPercent < -10) {
    recommendations.push({
      id: makeId(),
      category: 'revenue',
      priority: 'high',
      title: `Weekly revenue is down ${Math.abs(growthPercent)}%`,
      description: 'Consider launching a promotion or revisiting menu pricing.',
      effort: 'medium',
      actionUrl: '/admin/promotions',
    });
  }

  const topItem = menuPerformance[0];
  const answer = [
    `**Revenue Snapshot:**`,
    `• Today: Rs. ${today.toLocaleString()} | Yesterday: Rs. ${yesterday.toLocaleString()}`,
    `• This Week: Rs. ${thisWeek.toLocaleString()} (${growthLabel} vs last week)`,
    `• This Month: Rs. ${thisMonth.toLocaleString()}`,
    `• Avg Order Value: Rs. ${Math.round(avgOrderValue).toLocaleString()}`,
    topItem ? `\n**Top Performer:** ${topItem.name} — Rs. ${topItem.revenue.toLocaleString()} (${topItem.profitMargin}% margin)` : '',
    `\n**Revenue Forecast (next 7 days):** Rs. ${forecastedRevenue.nextWeek.toLocaleString()} (${forecastedRevenue.confidence} confidence)`,
  ].filter(Boolean).join('\n');

  return {
    pillar: 'analytics',
    provider: 'heuristic',
    generatedAt: new Date().toISOString(),
    timeRange: 'Today, yesterday, last 7 days, this month',
    answer,
    data: {
      revenueBreakdown: {
        today,
        yesterday,
        thisWeek,
        lastWeek,
        thisMonth,
        growthPercent,
      },
      menuPerformance,
      customerInsights: {
        totalOrdersThisWeek: thisWeekOrders.length,
        avgOrderValue: Math.round(avgOrderValue),
      },
      forecastedRevenue,
    },
    recommendations,
    confidence: thisWeekOrders.length >= 10 ? 'high' : thisWeekOrders.length >= 3 ? 'medium' : 'insufficient_data',
    dataSourceIsLive: true,
  };
}

// ── Pillar 4: Optimization AI ─────────────────────────────────

/**
 * Inventory reorder recommendations, pricing opportunities,
 * menu mix optimization, and operational savings suggestions.
 */
export async function runOptimizationPillar(
  restaurantId: string
): Promise<AIStandardResponse<OptimizationAIData>> {
  const now = new Date();
  const startOf30Days = new Date(now);
  startOf30Days.setDate(now.getDate() - 29);
  startOf30Days.setHours(0, 0, 0, 0);

  const [menuItems, recentOrders] = await Promise.all([
    prisma.menuItem.findMany({
      where: { restaurantId },
      include: {
        inventory: true,
        category: { select: { name: true } },
      },
    }),
    prisma.order.findMany({
      where: { restaurantId, createdAt: { gte: startOf30Days }, status: { not: 'CANCELLED' as any } },
      include: { items: true },
    }),
  ]);

  // ── Inventory Optimizations ──────────────────────────────────
  const itemSalesMap = new Map<string, number>(); // menuItemId -> qty sold in 30d
  recentOrders.forEach((o) => o.items.forEach((i) => {
    itemSalesMap.set(i.menuItemId, (itemSalesMap.get(i.menuItemId) || 0) + i.quantity);
  }));

  const inventoryOptimizations: OptimizationAIData['inventoryOptimizations'] = [];
  menuItems.forEach((m) => {
    const stock = m.stockCount ?? m.inventory[0]?.stockCount ?? null;
    const threshold = m.inventory[0]?.lowStockThreshold ?? 10;
    if (stock === null) return;

    const dailyAvgSales = (itemSalesMap.get(m.id) || 0) / 30;
    const estimatedDaysRemaining = dailyAvgSales > 0 ? Math.floor(stock / dailyAvgSales) : undefined;

    if (stock <= threshold) {
      const urgency: 'critical' | 'soon' | 'planned' =
        stock === 0 ? 'critical' : estimatedDaysRemaining !== undefined && estimatedDaysRemaining <= 2 ? 'critical' : 'soon';
      inventoryOptimizations.push({
        menuItemId: m.id,
        name: m.name,
        currentStock: stock,
        recommendedReorderQty: Math.max(threshold * 3, 20),
        urgency,
        estimatedDaysRemaining,
      });
    }
  });
  inventoryOptimizations.sort((a, b) => {
    const order = { critical: 0, soon: 1, planned: 2 };
    return order[a.urgency] - order[b.urgency];
  });

  // ── Pricing Opportunities ────────────────────────────────────
  const pricingOpportunities: OptimizationAIData['pricingOpportunities'] = [];
  menuItems.forEach((m) => {
    const qtySold = itemSalesMap.get(m.id) || 0;
    const costPrice = m.costPrice ?? 0;
    if (costPrice === 0 || m.price === 0) return;

    const currentMargin = ((m.price - costPrice) / m.price) * 100;

    // Suggest price increase for high-volume, low-margin items (< 30% margin)
    if (qtySold >= 20 && currentMargin < 30) {
      const suggestedPrice = Math.ceil((costPrice / 0.65) / 10) * 10; // target 35% margin, round to nearest 10
      if (suggestedPrice > m.price) {
        pricingOpportunities.push({
          menuItemId: m.id,
          name: m.name,
          currentPrice: m.price,
          suggestedPrice,
          rationale: `Margin is ${currentMargin.toFixed(1)}% — below the 30% target for a popular item (${qtySold} sold in 30 days)`,
          estimatedRevenueImpact: Math.round((suggestedPrice - m.price) * qtySold * 0.85),
        });
      }
    }
  });
  pricingOpportunities.sort((a, b) => (b.estimatedRevenueImpact ?? 0) - (a.estimatedRevenueImpact ?? 0));

  // ── Menu Optimizations ───────────────────────────────────────
  const menuOptimizations: OptimizationAIData['menuOptimizations'] = [];
  const avgSales = Array.from(itemSalesMap.values()).reduce((s, v) => s + v, 0) / (itemSalesMap.size || 1);

  menuItems.forEach((m) => {
    const qtySold = itemSalesMap.get(m.id) || 0;
    if (!m.isAvailable) return;

    if (qtySold >= avgSales * 2 && !m.isFeatured) {
      menuOptimizations.push({
        menuItemId: m.id,
        name: m.name,
        action: 'promote',
        reason: `Sells ${qtySold}x in 30 days — far above average. Feature this dish to maximize revenue.`,
      });
    } else if (qtySold === 0 && recentOrders.length >= 20) {
      menuOptimizations.push({
        menuItemId: m.id,
        name: m.name,
        action: 'retire',
        reason: `Zero sales in 30 days across ${recentOrders.length} orders. Consider removing or replacing.`,
      });
    }
  });

  // ── Operational Savings ──────────────────────────────────────
  const operationalSavings: OptimizationAIData['operationalSavings'] = [];
  const zeroSalesItems = menuItems.filter((m) => m.isAvailable && (itemSalesMap.get(m.id) || 0) === 0);
  if (zeroSalesItems.length > 0) {
    operationalSavings.push({
      area: 'Menu & Inventory',
      potentialSavingRs: zeroSalesItems.length * 500, // estimated procurement saving
      recommendation: `${zeroSalesItems.length} active menu item(s) have zero sales in 30 days — disabling them reduces wasteful procurement.`,
    });
  }

  const criticalItems = inventoryOptimizations.filter((i) => i.urgency === 'critical');

  const recommendations: AIRecommendation[] = [];
  if (criticalItems.length > 0) {
    recommendations.push({
      id: makeId(),
      category: 'inventory',
      priority: 'critical',
      title: `${criticalItems.length} item(s) need immediate reorder`,
      description: criticalItems.map((i) => i.name).join(', '),
      effort: 'low',
      actionUrl: '/admin/inventory',
    });
  }
  if (pricingOpportunities.length > 0) {
    const totalImpact = pricingOpportunities.reduce((s, p) => s + (p.estimatedRevenueImpact ?? 0), 0);
    recommendations.push({
      id: makeId(),
      category: 'revenue',
      priority: 'medium',
      title: `Potential Rs. ${totalImpact.toLocaleString()} revenue uplift from pricing adjustments`,
      description: `${pricingOpportunities.length} item(s) are underpriced relative to their cost and popularity.`,
      effort: 'low',
      actionUrl: '/admin/menu',
    });
  }

  const answerParts = [
    `**Optimization Summary for the last 30 days:**`,
    `• **Inventory Alerts:** ${inventoryOptimizations.length} item(s) below threshold`,
    `• **Pricing Opportunities:** ${pricingOpportunities.length} item(s) could be repriced for better margins`,
    `• **Menu Actions:** ${menuOptimizations.length} suggested changes (promote, bundle, or retire)`,
    `• **Operational Savings:** Rs. ${operationalSavings.reduce((s: number, o: { potentialSavingRs: number }) => s + o.potentialSavingRs, 0).toLocaleString()} estimated`,
  ];

  return {
    pillar: 'optimization',
    provider: 'heuristic',
    generatedAt: new Date().toISOString(),
    timeRange: 'Last 30 days',
    answer: answerParts.join('\n'),
    data: {
      inventoryOptimizations,
      pricingOpportunities: pricingOpportunities.slice(0, 10),
      menuOptimizations: menuOptimizations.slice(0, 10),
      operationalSavings,
    },
    recommendations,
    confidence: recentOrders.length >= 20 ? 'high' : recentOrders.length >= 5 ? 'medium' : 'insufficient_data',
    dataSourceIsLive: true,
  };
}
