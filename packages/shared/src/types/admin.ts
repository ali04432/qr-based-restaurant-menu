import { UserRole } from './user';
import { OrderStatus, PaymentMethod } from './order';
import { MenuItem } from './menu';

// ============================================================
// Admin Dashboard Overview Types
// ============================================================

export interface DashboardMetrics {
  todayRevenue: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  activeTables: number;
  lowStockItemsCount: number;
  grossProfitToday: number;
  profitMarginToday: number;
}

export interface RevenueTrendPoint {
  date: string;
  revenue: number;
  orders: number;
}

export interface TopSellingItem {
  id: string;
  name: string;
  categoryName?: string;
  price: number;
  costPrice?: number;
  totalQuantity: number;
  totalRevenue: number;
  totalProfit: number;
  image?: string;
}

export interface RecentOrderSummary {
  id: string;
  orderNumber: string;
  tableNumber: string;
  status: OrderStatus;
  total: number;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  paymentMethod: PaymentMethod;
  itemCount: number;
  createdAt: string;
}

export interface LowStockAlert {
  id: string;
  name: string;
  categoryName?: string;
  stockCount: number;
  lowStockThreshold: number;
  price: number;
  costPrice?: number;
  isAvailable: boolean;
}

export interface StaffActivitySummary {
  id: string;
  staffName: string;
  staffRole: UserRole;
  action: string;
  details?: string;
  createdAt: string;
}

export interface AdminDashboardOverview {
  metrics: DashboardMetrics;
  revenueTrend: RevenueTrendPoint[];
  topSellingItems: TopSellingItem[];
  recentOrders: RecentOrderSummary[];
  lowStockAlerts: LowStockAlert[];
  recentStaffActivity: StaffActivitySummary[];
}

// ============================================================
// Inventory Types
// ============================================================

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface InventoryItemSummary {
  id: string;
  menuItemId: string;
  name: string;
  categoryName: string;
  categoryId: string;
  price: number;
  costPrice: number;
  stockCount: number;
  lowStockThreshold: number;
  status: StockStatus;
  isAvailable: boolean;
  image?: string;
  lastUpdated: string;
}

export interface StockAdjustmentInput {
  menuItemId: string;
  adjustmentType: 'SET' | 'INCREASE' | 'DECREASE';
  quantity: number;
  reason?: string;
}

// ============================================================
// Staff & Payroll Types
// ============================================================

export interface StaffUser {
  id: string;
  restaurantId: string;
  name: string;
  email: string;
  role: UserRole;
  salary: number;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  createdAt: string;
  updatedAt: string;
}

export interface PayrollSummary {
  totalActiveStaff: number;
  monthlyPayrollTotal: number;
  averageSalary: number;
  roleBreakdown: Record<string, { count: number; totalCost: number }>;
}

export interface CreateStaffInput {
  restaurantId?: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  salary: number;
}

export interface UpdateStaffInput {
  name?: string;
  email?: string;
  role?: UserRole;
  salary?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  password?: string;
}

// ============================================================
// Payment Records
// ============================================================

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  tableNumber: string;
  method: PaymentMethod;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  transactionRef?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentSummary {
  totalCollected: number;
  pendingAmount: number;
  cashTotal: number;
  cardTotal: number;
  digitalTotal: number;
  paymentCount: number;
}

// ============================================================
// Business Analytics Types
// ============================================================

export interface AnalyticsSummary {
  grossSales: number;
  totalCost: number;
  grossProfit: number;
  profitMargin: number;
  totalOrders: number;
  averageOrderValue: number;
  revenueTrend: Array<{ label: string; revenue: number; cost: number; profit: number; orders: number }>;
  categoryBreakdown: Array<{ category: string; revenue: number; orders: number; percentage: number }>;
  topItems: TopSellingItem[];
  leastSellingItems: TopSellingItem[];
  mostProfitableItems: TopSellingItem[];
}

export type AnalyticsDateRange = 'today' | '7d' | '30d' | 'month' | 'year' | 'custom';

// ============================================================
// Customer Feedback Types
// ============================================================

export interface CustomerFeedback {
  id: string;
  restaurantId: string;
  orderId?: string;
  orderNumber?: string;
  tableNumber?: string;
  customerName?: string;
  rating: number; // 1 to 5
  comment?: string;
  createdAt: string;
}

export interface FeedbackSummary {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>; // 1: count, 2: count, etc.
  recentFeedback: CustomerFeedback[];
}

// ============================================================
// Promotions & Discounts
// ============================================================

export type PromotionType = 'PERCENTAGE' | 'FIXED';

export interface Promotion {
  id: string;
  restaurantId: string;
  name: string;
  code: string;
  discountType: PromotionType;
  discountValue: number;
  minOrderAmount: number;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePromotionInput {
  restaurantId?: string;
  name: string;
  code: string;
  discountType: PromotionType;
  discountValue: number;
  minOrderAmount?: number;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

// ============================================================
// Restaurant Settings
// ============================================================

export interface RestaurantSettings {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency: string;
  taxRate: number;
  serviceCharge: number;
  isOpen: boolean;
  openingHours?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateSettingsInput {
  name?: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  currency?: string;
  taxRate?: number;
  serviceCharge?: number;
  isOpen?: boolean;
  openingHours?: string;
}

// ============================================================
// Operational Notifications
// ============================================================

export type NotificationType = 'ORDER' | 'STOCK' | 'PAYMENT' | 'FEEDBACK' | 'SYSTEM';

export interface AdminNotification {
  id: string;
  restaurantId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================================
// Event Management (Phase 6)
// ============================================================

export interface Event {
  id: string;
  restaurantId: string;
  branchId?: string | null;
  name: string;
  description?: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventInput {
  restaurantId?: string;
  branchId?: string | null;
  name: string;
  description?: string | null;
  eventType: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
}
