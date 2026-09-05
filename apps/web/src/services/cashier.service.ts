import { apiClient } from '../lib/api-client';
import {
  CashierSummary,
  CashierOrderListItem,
  BillingDetail,
  PaymentConfirmationInput,
  ThermalReceiptPayload,
  PaymentRefundInput,
  PaymentMethodDistribution,
  OperationalAiResponse,
} from '@qr-menu/shared';

// ============================================================
// Phase 5: Cashier & POS Billing Client Service
// ============================================================

export const cashierService = {
  /** Fetch live cashier register summary metrics */
  async getSummary(restaurantId: string, token: string): Promise<CashierSummary> {
    return apiClient.get<CashierSummary>(`/api/cashier/summary?restaurantId=${restaurantId}`, { token });
  },

  /** Fetch filterable orders for cashier register queue */
  async getOrders(
    params: {
      status?: string;
      paymentStatus?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
    token: string
  ): Promise<CashierOrderListItem[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient.get<CashierOrderListItem[]>(`/api/cashier/orders?${query.toString()}`, { token });
  },

  /** Fetch complete itemized billing breakdown for an order */
  async getBillDetails(orderId: string, token: string): Promise<BillingDetail> {
    return apiClient.get<BillingDetail>(`/api/cashier/orders/${orderId}/bill`, { token });
  },

  /** Confirm payment atomically and generate receipt */
  async confirmPayment(
    input: PaymentConfirmationInput,
    token: string
  ): Promise<{ payment: any; order: any; receipt: ThermalReceiptPayload }> {
    return apiClient.post<{ payment: any; order: any; receipt: ThermalReceiptPayload }>(
      '/api/cashier/payments/confirm',
      input,
      { token }
    );
  },

  /** Get thermal receipt data for printing or reprinting */
  async getReceipt(paymentId: string, token: string): Promise<ThermalReceiptPayload> {
    return apiClient.get<ThermalReceiptPayload>(`/api/cashier/payments/${paymentId}/receipt`, { token });
  },

  /** Fetch payment transactions ledger */
  async getTransactions(
    params: {
      method?: string;
      status?: string;
      search?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    } = {},
    token: string
  ): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.method) query.set('method', params.method);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient.get<any[]>(`/api/cashier/transactions?${query.toString()}`, { token });
  },

  /** Process refund on a completed transaction */
  async refundPayment(paymentId: string, input: PaymentRefundInput, token: string): Promise<any> {
    return apiClient.post<any>(`/api/cashier/payments/${paymentId}/refund`, input, { token });
  },

  /** Fetch distribution of payment methods (Cash, Card, JazzCash, etc.) */
  async getPaymentMethodAnalytics(
    params: { startDate?: string; endDate?: string } = {},
    token: string
  ): Promise<{
    totalRevenue: number;
    totalTransactions: number;
    breakdown: PaymentMethodDistribution[];
  }> {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);

    return apiClient.get<{
      totalRevenue: number;
      totalTransactions: number;
      breakdown: PaymentMethodDistribution[];
    }>(`/api/cashier/analytics/payment-methods?${query.toString()}`, { token });
  },

  /** Query Cashier AI operational assistant */
  async queryAi(query: string, token: string): Promise<OperationalAiResponse> {
    return apiClient.post<OperationalAiResponse>('/api/cashier/ai/query', { query, role: 'CASHIER' }, { token });
  },
};
