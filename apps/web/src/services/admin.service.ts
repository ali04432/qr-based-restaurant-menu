import {
  AdminDashboardOverview,
  Order,
  OrderStatus,
  InventoryItemSummary,
  StockAdjustmentInput,
  StaffUser,
  PayrollSummary,
  CreateStaffInput,
  UpdateStaffInput,
  PaymentRecord,
  PaymentSummary,
  AnalyticsSummary,
  AnalyticsDateRange,
  CustomerFeedback,
  FeedbackSummary,
  Promotion,
  CreatePromotionInput,
  RestaurantSettings,
  UpdateSettingsInput,
  AdminNotification,
  Table,
  MenuCategory,
  MenuItem,
  LoyaltyAccount,
  Reward,
  CreateRewardInput,
  UpdateRewardInput,
  Branch,
  CreateBranchInput,
  UpdateBranchInput,
  DemandForecastResult,
  InventoryIntelligenceResult,
  IntegrationConfig,
  IntegrationTestResult,
  ScheduledReport,
  SubscriptionPlan,
  Subscription,
  AuditLog,
  SystemHealthStatus,
} from '@qr-menu/shared';
import { apiClient } from '../lib/api-client';

export const adminService = {
  // ── Dashboard Overview
  async getDashboardOverview(restaurantId: string, token: string): Promise<AdminDashboardOverview> {
    return apiClient.get<AdminDashboardOverview>(`/api/admin/dashboard/overview?restaurantId=${restaurantId}`, { token });
  },

  // ── Order Management
  async getOrders(
    restaurantId: string,
    params: {
      status?: string;
      tableId?: string;
      branchId?: string;
      paymentStatus?: string;
      dateFrom?: string;
      dateTo?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
    token: string = ''
  ): Promise<{ orders: Order[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const query = new URLSearchParams({ restaurantId });
    if (params.status) query.append('status', params.status);
    if (params.tableId) query.append('tableId', params.tableId);
    if (params.branchId) query.append('branchId', params.branchId);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params.dateTo) query.append('dateTo', params.dateTo);
    if (params.search) query.append('search', params.search);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());

    return apiClient.get(`/api/admin/orders?${query.toString()}`, { token });
  },

  async getOrderById(id: string, token: string): Promise<any> {
    return apiClient.get(`/api/admin/orders/${id}`, { token });
  },

  async updateOrderStatus(id: string, status: OrderStatus, token: string): Promise<Order> {
    return apiClient.patch<Order>(`/api/admin/orders/${id}/status`, { status }, { token });
  },

  async cancelOrder(id: string, reason: string, token: string): Promise<Order> {
    return apiClient.patch<Order>(`/api/admin/orders/${id}/cancel`, { reason }, { token });
  },

  // ── Kitchen KDS
  async getKitchenOrders(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/kitchen/orders?restaurantId=${restaurantId}`, { token });
  },

  async updateKitchenStatus(id: string, status: string, token: string): Promise<Order> {
    return apiClient.patch<Order>(`/api/admin/kitchen/orders/${id}/status`, { status }, { token });
  },

  // ── Waiter Panel
  async getReadyOrders(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/waiter/ready?restaurantId=${restaurantId}`, { token });
  },

  async getWaiterTables(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/waiter/tables?restaurantId=${restaurantId}`, { token });
  },

  async serveOrder(id: string, token: string): Promise<Order> {
    return apiClient.patch<Order>(`/api/admin/waiter/serve/${id}`, {}, { token });
  },

  async openTable(tableId: string, token: string): Promise<any> {
    return apiClient.patch(`/api/admin/waiter/table/${tableId}/open`, {}, { token });
  },

  // ── Table Management
  async getTables(restaurantId: string, token: string): Promise<Table[]> {
    return apiClient.get<Table[]>(`/api/admin/tables?restaurantId=${restaurantId}`, { token });
  },

  async createTable(data: { restaurantId: string; tableNumber: string; capacity?: number; status?: any; isActive?: boolean; branchId?: string }, token: string): Promise<Table> {
    return apiClient.post<Table>('/api/admin/tables', data, { token });
  },

  async updateTable(id: string, data: Partial<Table>, token: string): Promise<Table> {
    return apiClient.patch<Table>(`/api/admin/tables/${id}`, data, { token });
  },

  async deleteTable(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/tables/${id}`, { token });
  },

  async regenerateQR(id: string, token: string): Promise<{ id: string; qrToken: string; qrUrl: string }> {
    return apiClient.post(`/api/admin/tables/${id}/regenerate-qr`, {}, { token });
  },

  // ── Categories
  async getCategories(restaurantId: string, token: string): Promise<MenuCategory[]> {
    return apiClient.get<MenuCategory[]>(`/api/admin/categories?restaurantId=${restaurantId}`, { token });
  },

  async createCategory(data: Partial<MenuCategory> & { restaurantId: string; name: string }, token: string): Promise<MenuCategory> {
    return apiClient.post<MenuCategory>('/api/admin/categories', data, { token });
  },

  async updateCategory(id: string, data: Partial<MenuCategory>, token: string): Promise<MenuCategory> {
    return apiClient.patch<MenuCategory>(`/api/admin/categories/${id}`, data, { token });
  },

  async deleteCategory(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/categories/${id}`, { token });
  },

  // ── Menu Items
  async getMenuItems(restaurantId: string, filterOrCategory?: any, maybeToken?: string): Promise<MenuItem[]> {
    let token = maybeToken;
    const query = new URLSearchParams({ restaurantId });
    if (typeof filterOrCategory === 'string') {
      query.append('categoryId', filterOrCategory);
    } else if (typeof filterOrCategory === 'object' && filterOrCategory !== null) {
      if (filterOrCategory.categoryId) query.append('categoryId', filterOrCategory.categoryId);
      if (filterOrCategory.search) query.append('search', filterOrCategory.search);
    }
    return apiClient.get<MenuItem[]>(`/api/admin/menu?${query.toString()}`, { token });
  },

  async createMenuItem(data: any, token: string): Promise<MenuItem> {
    return apiClient.post<MenuItem>('/api/admin/menu', data, { token });
  },

  async updateMenuItem(id: string, data: any, token: string): Promise<MenuItem> {
    return apiClient.patch<MenuItem>(`/api/admin/menu/${id}`, data, { token });
  },

  async deleteMenuItem(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/menu/${id}`, { token });
  },

  // ── Inventory
  async getInventory(restaurantId: string, filterOrSearch?: any, statusOrToken?: string, maybeToken?: string): Promise<InventoryItemSummary[]> {
    let token = maybeToken || (typeof statusOrToken === 'string' && !statusOrToken.includes(' ') && statusOrToken.length > 30 ? statusOrToken : undefined);
    const query = new URLSearchParams({ restaurantId });
    if (typeof filterOrSearch === 'string') {
      query.append('search', filterOrSearch);
    } else if (typeof filterOrSearch === 'object' && filterOrSearch !== null) {
      if (filterOrSearch.search) query.append('search', filterOrSearch.search);
      if (filterOrSearch.status) query.append('status', filterOrSearch.status);
      token = statusOrToken;
    }
    if (typeof statusOrToken === 'string' && statusOrToken !== token) {
      query.append('status', statusOrToken);
    }
    return apiClient.get<InventoryItemSummary[]>(`/api/admin/inventory?${query.toString()}`, { token });
  },

  async adjustStock(idOrData: any, dataOrToken?: any, maybeToken?: string): Promise<{ menuItemId: string; stockCount: number; previousStock: number }> {
    let data: StockAdjustmentInput;
    let token = maybeToken;
    if (typeof idOrData === 'string') {
      data = dataOrToken;
      token = maybeToken;
    } else {
      data = idOrData;
      token = dataOrToken;
    }
    return apiClient.post('/api/admin/inventory/adjust', data, { token });
  },

  async getStockMovements(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/inventory/movements?restaurantId=${restaurantId}`, { token });
  },

  async getInventoryHistory(restaurantId: string, limitOrToken: number | string = 50, maybeToken?: string): Promise<any[]> {
    const token = typeof limitOrToken === 'string' ? limitOrToken : maybeToken;
    const limit = typeof limitOrToken === 'number' ? limitOrToken : 50;
    return apiClient.get<any[]>(`/api/admin/inventory/movements?restaurantId=${restaurantId}&limit=${limit}`, { token });
  },

  async updateLowStockThreshold(id: string, lowStockThreshold: number, token: string): Promise<any> {
    return apiClient.patch(`/api/admin/inventory/${id}/threshold`, { lowStockThreshold }, { token });
  },

  async getInventoryIntelligence(restaurantId: string, token: string): Promise<InventoryIntelligenceResult> {
    return apiClient.get<InventoryIntelligenceResult>(`/api/admin/inventory/intelligence?restaurantId=${restaurantId}`, { token });
  },

  // ── Staff & Payroll
  async getStaff(restaurantId: string, token: string): Promise<StaffUser[]> {
    return apiClient.get<StaffUser[]>(`/api/admin/staff?restaurantId=${restaurantId}`, { token });
  },

  async createStaff(data: CreateStaffInput, token: string): Promise<StaffUser> {
    return apiClient.post<StaffUser>('/api/admin/staff', data, { token });
  },

  async updateStaff(id: string, data: UpdateStaffInput, token: string): Promise<StaffUser> {
    return apiClient.patch<StaffUser>(`/api/admin/staff/${id}`, data, { token });
  },

  async getPayrollSummary(restaurantId: string, token: string): Promise<PayrollSummary> {
    return apiClient.get<PayrollSummary>(`/api/admin/staff/payroll?restaurantId=${restaurantId}`, { token });
  },

  async getStaffActionLogs(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/staff/logs?restaurantId=${restaurantId}`, { token });
  },

  async getStaffActivity(restaurantId: string, limitOrToken: number | string = 20, maybeToken?: string): Promise<any[]> {
    const token = typeof limitOrToken === 'string' ? limitOrToken : maybeToken;
    const limit = typeof limitOrToken === 'number' ? limitOrToken : 20;
    return apiClient.get<any[]>(`/api/admin/staff/logs?restaurantId=${restaurantId}&limit=${limit}`, { token });
  },

  // ── Payments
  async getPayments(restaurantId: string, filters: any = {}, token: string = ''): Promise<PaymentRecord[]> {
    const actualToken = typeof filters === 'string' ? filters : token;
    const actualFilters = typeof filters === 'object' ? filters : {};
    const query = new URLSearchParams({ restaurantId, ...actualFilters });
    return apiClient.get<PaymentRecord[]>(`/api/admin/payments?${query.toString()}`, { token: actualToken });
  },

  async getPaymentSummary(restaurantId: string, token: string): Promise<PaymentSummary> {
    return apiClient.get<PaymentSummary>(`/api/admin/payments/summary?restaurantId=${restaurantId}`, { token });
  },

  async markPaymentCompleted(id: string, token: string): Promise<PaymentRecord> {
    return apiClient.patch<PaymentRecord>(`/api/admin/payments/${id}/complete`, {}, { token });
  },

  async markPaymentStatus(id: string, status: string, notesOrToken?: string, maybeToken?: string): Promise<PaymentRecord> {
    const token = maybeToken || (typeof notesOrToken === 'string' && notesOrToken.length > 30 ? notesOrToken : undefined);
    const notes = typeof notesOrToken === 'string' && notesOrToken.length <= 30 ? notesOrToken : undefined;
    return apiClient.patch<PaymentRecord>(`/api/admin/payments/${id}/complete`, { status, notes }, { token });
  },

  // ── Analytics & Profit Intelligence
  async getAnalytics(restaurantId: string, range: AnalyticsDateRange = 'today', fromOrToken?: string, to?: string, maybeToken?: string): Promise<AnalyticsSummary> {
    let token = maybeToken;
    let from: string | undefined;
    if (fromOrToken && fromOrToken.length > 30 && !to) {
      token = fromOrToken;
    } else {
      from = fromOrToken;
    }
    const query = new URLSearchParams({ restaurantId, range });
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    return apiClient.get<AnalyticsSummary>(`/api/admin/analytics?${query.toString()}`, { token });
  },

  async getDemandForecast(restaurantId: string, token: string): Promise<DemandForecastResult> {
    return apiClient.get<DemandForecastResult>(`/api/admin/analytics/forecast?restaurantId=${restaurantId}`, { token });
  },

  // ── Reports
  async getSalesReport(restaurantId: string, from?: string, to?: string, token?: string): Promise<any> {
    const query = new URLSearchParams({ restaurantId });
    if (from) query.append('from', from);
    if (to) query.append('to', to);
    return apiClient.get(`/api/admin/reports/sales?${query.toString()}`, { token });
  },

  async getProfitReport(restaurantId: string, token: string): Promise<any[]> {
    return apiClient.get<any[]>(`/api/admin/reports/profit?restaurantId=${restaurantId}`, { token });
  },

  async getInventoryReport(restaurantId: string, token: string): Promise<any> {
    return apiClient.get(`/api/admin/reports/inventory?restaurantId=${restaurantId}`, { token });
  },

  // ── Feedback
  async getFeedback(restaurantId: string, token: string): Promise<CustomerFeedback[]> {
    return apiClient.get<CustomerFeedback[]>(`/api/admin/feedback?restaurantId=${restaurantId}`, { token });
  },

  async getFeedbackSummary(restaurantId: string, token: string): Promise<FeedbackSummary> {
    return apiClient.get<FeedbackSummary>(`/api/admin/feedback/summary?restaurantId=${restaurantId}`, { token });
  },

  // ── Promotions
  async getPromotions(restaurantId: string, token: string): Promise<Promotion[]> {
    return apiClient.get<Promotion[]>(`/api/admin/promotions?restaurantId=${restaurantId}`, { token });
  },

  async createPromotion(data: CreatePromotionInput, token: string): Promise<Promotion> {
    return apiClient.post<Promotion>('/api/admin/promotions', data, { token });
  },

  async updatePromotion(id: string, data: Partial<Promotion>, token: string): Promise<Promotion> {
    return apiClient.patch<Promotion>(`/api/admin/promotions/${id}`, data, { token });
  },

  async deletePromotion(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/promotions/${id}`, { token });
  },

  // ── Notifications
  async getNotifications(restaurantId: string, token: string): Promise<AdminNotification[]> {
    return apiClient.get<AdminNotification[]>(`/api/admin/notifications?restaurantId=${restaurantId}`, { token });
  },

  async markNotificationRead(id: string, token: string): Promise<any> {
    return apiClient.patch(`/api/admin/notifications/${id}/read`, {}, { token });
  },

  async markAllNotificationsRead(token: string): Promise<any> {
    return apiClient.patch('/api/admin/notifications/read-all', {}, { token });
  },

  // ── Admin AI Assistant
  async queryAdminAI(restaurantId: string, query: string, token: string): Promise<{ reply: string; timestamp: string; metricsSummary?: any }> {
    return apiClient.post('/api/admin/ai/query', { restaurantId, query }, { token });
  },

  // ── Settings
  async getSettings(restaurantId: string, token: string): Promise<RestaurantSettings> {
    return apiClient.get<RestaurantSettings>(`/api/admin/settings?restaurantId=${restaurantId}`, { token });
  },

  async updateSettings(data: UpdateSettingsInput, token: string): Promise<RestaurantSettings> {
    return apiClient.patch<RestaurantSettings>('/api/admin/settings', data, { token });
  },

  // ── Customer Loyalty & Tier Management (Phase 4)
  async getLoyaltyAccounts(
    restaurantId: string,
    params: { search?: string; tier?: string } = {},
    token: string = ''
  ): Promise<{ accounts: LoyaltyAccount[]; summary: { totalMembers: number; totalPointsCirculating: number; tierBreakdown: Record<string, number> } }> {
    const query = new URLSearchParams({ restaurantId });
    if (params.search) query.append('search', params.search);
    if (params.tier) query.append('tier', params.tier);
    return apiClient.get(`/api/admin/loyalty/accounts?${query.toString()}`, { token });
  },

  async adjustLoyaltyPoints(accountId: string, data: { points: number; description?: string }, token: string): Promise<LoyaltyAccount> {
    return apiClient.post<LoyaltyAccount>(`/api/admin/loyalty/accounts/${accountId}/adjust`, data, { token });
  },

  // ── Rewards Catalog (Phase 4)
  async getRewards(restaurantId: string, token: string): Promise<Reward[]> {
    return apiClient.get<Reward[]>(`/api/admin/rewards?restaurantId=${restaurantId}`, { token });
  },

  async createReward(data: CreateRewardInput & { restaurantId?: string }, token: string): Promise<Reward> {
    return apiClient.post<Reward>('/api/admin/rewards', data, { token });
  },

  async updateReward(id: string, data: UpdateRewardInput, token: string): Promise<Reward> {
    return apiClient.put<Reward>(`/api/admin/rewards/${id}`, data, { token });
  },

  async deleteReward(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/rewards/${id}`, { token });
  },

  // ── Multi-Branch Management (Phase 4)
  async getBranches(restaurantId: string, token: string): Promise<Branch[]> {
    return apiClient.get<Branch[]>(`/api/admin/branches?restaurantId=${restaurantId}`, { token });
  },

  async createBranch(data: CreateBranchInput & { restaurantId?: string }, token: string): Promise<Branch> {
    return apiClient.post<Branch>('/api/admin/branches', data, { token });
  },

  async updateBranch(id: string, data: UpdateBranchInput, token: string): Promise<Branch> {
    return apiClient.put<Branch>(`/api/admin/branches/${id}`, data, { token });
  },

  async deleteBranch(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/branches/${id}`, { token });
  },

  async getConsolidatedBranchAnalytics(restaurantId: string, token: string): Promise<{
    summary: { totalLocations: number; grandTotalRevenue: number; grandTotalOrders: number; avgRevenuePerLocation: number };
    locations: Array<{
      branchId: string;
      name: string;
      code: string;
      isActive: boolean;
      tablesCount: number;
      staffCount: number;
      totalOrders: number;
      completedOrders: number;
      totalRevenue: number;
      avgOrderValue: number;
      revenueSharePercent: number;
    }>;
  }> {
    return apiClient.get(`/api/admin/branches/analytics/consolidated?restaurantId=${restaurantId}`, { token });
  },

  async assignTableToBranch(branchId: string, tableId: string, token: string): Promise<any> {
    return apiClient.post(`/api/admin/branches/${branchId}/assign-table`, { tableId }, { token });
  },

  async assignStaffToBranch(branchId: string, userId: string, token: string): Promise<any> {
    return apiClient.post(`/api/admin/branches/${branchId}/assign-staff`, { userId }, { token });
  },

  // ── Integrations & Hardware (Phase 4)
  async getIntegrations(restaurantId: string, token: string): Promise<IntegrationConfig[]> {
    return apiClient.get<IntegrationConfig[]>(`/api/admin/integrations?restaurantId=${restaurantId}`, { token });
  },

  async saveIntegration(data: { restaurantId: string; providerType: string; providerName: string; isEnabled: boolean; configJson: string }, token: string): Promise<IntegrationConfig> {
    return apiClient.post<IntegrationConfig>('/api/admin/integrations', data, { token });
  },

  async testIntegration(restaurantId: string, providerType: string, recipient?: string, token?: string): Promise<IntegrationTestResult> {
    return apiClient.post<IntegrationTestResult>('/api/admin/integrations/test', { restaurantId, providerType, recipient }, { token });
  },

  // ── Scheduled Reports (Phase 4)
  async getScheduledReports(restaurantId: string, token: string): Promise<ScheduledReport[]> {
    return apiClient.get<ScheduledReport[]>(`/api/admin/scheduled-reports?restaurantId=${restaurantId}`, { token });
  },

  async createScheduledReport(data: any, token: string): Promise<ScheduledReport> {
    return apiClient.post<ScheduledReport>('/api/admin/scheduled-reports', data, { token });
  },

  async deleteScheduledReport(id: string, token: string): Promise<{ id: string }> {
    return apiClient.delete<{ id: string }>(`/api/admin/scheduled-reports/${id}`, { token });
  },

  // ── System Health & Audit (Phase 4)
  async getSystemHealth(): Promise<SystemHealthStatus> {
    return apiClient.get<SystemHealthStatus>('/api/health/system');
  },

  async getAuditLogs(restaurantId?: string, params: { page?: number; limit?: number; action?: string } = {}, token?: string): Promise<{ logs: AuditLog[]; total: number }> {
    const query = new URLSearchParams();
    if (restaurantId) query.append('restaurantId', restaurantId);
    if (params.action) query.append('action', params.action);
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    return apiClient.get(`/api/admin/audit-logs?${query.toString()}`, { token });
  },

  // ── SaaS Subscriptions & Entitlements (Phase 4)
  async getSubscriptionPlans(token: string): Promise<SubscriptionPlan[]> {
    return apiClient.get<SubscriptionPlan[]>('/api/admin/subscriptions/plans', { token });
  },

  async getCurrentSubscription(restaurantId: string, token: string): Promise<{
    subscription: Subscription;
    usage: {
      tables: { current: number; limit: number; percent: number };
      staff: { current: number; limit: number; percent: number };
      branches: { current: number; limit: number; percent: number };
      ordersThisMonth: { current: number; limit: number; percent: number };
      features: {
        hasAiFeatures: boolean;
        hasAdvancedAnalytics: boolean;
        hasIntegrations: boolean;
        hasCustomBranding: boolean;
      };
    };
  }> {
    return apiClient.get(`/api/admin/subscriptions/current?restaurantId=${restaurantId}`, { token });
  },

  async upgradeSubscription(planTier: string, billingCycle: 'MONTHLY' | 'YEARLY', token: string, restaurantId?: string): Promise<Subscription> {
    return apiClient.post<Subscription>('/api/admin/subscriptions/upgrade', { planTier, billingCycle, restaurantId }, { token });
  },

  async cancelSubscription(restaurantId: string, token: string): Promise<Subscription> {
    return apiClient.post<Subscription>('/api/admin/subscriptions/cancel', { restaurantId }, { token });
  },

  // ── Platform Super Admin (Phase 4)
  async getSuperAdminOverview(token: string): Promise<{
    totalRestaurants: number;
    totalUsers: number;
    totalOrders: number;
    platformGMV: number;
    mrr: number;
    arr: number;
    activeSubscriptions: number;
    planBreakdown: Record<string, number>;
  }> {
    return apiClient.get('/api/super-admin/overview', { token });
  },

  async getSuperAdminRestaurants(token: string): Promise<Array<{
    id: string;
    name: string;
    slug: string;
    createdAt: string;
    planTier: string;
    subscriptionStatus: string;
    branchesCount: number;
    tablesCount: number;
    staffCount: number;
    ordersCount: number;
    ownerEmail: string;
    ownerName: string;
  }>> {
    return apiClient.get('/api/super-admin/restaurants', { token });
  },

  async provisionTenant(data: { name: string; slug: string; ownerName: string; ownerEmail: string; ownerPassword: string; planTier?: string }, token: string): Promise<any> {
    return apiClient.post('/api/super-admin/restaurants', data, { token });
  },

  async updateTenantPlan(restaurantId: string, planTier: string, token: string): Promise<any> {
    return apiClient.patch(`/api/super-admin/restaurants/${restaurantId}/plan`, { planTier }, { token });
  },
};
