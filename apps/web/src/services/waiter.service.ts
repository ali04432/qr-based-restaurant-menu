import { apiClient } from '../lib/api-client';
import {
  WaiterSummary,
  TableWithOrders,
  CustomerRequestRecord,
  WalkInOrderInput,
  AddItemsToOrderInput,
  Order,
  OrderStatus,
  OperationalAiResponse,
} from '@qr-menu/shared';

// ============================================================
// Phase 5: Waiter API Client Service
// ============================================================

export const waiterService = {
  /** Fetch real-time waiter summary KPIs */
  async getSummary(restaurantId: string, token: string): Promise<WaiterSummary> {
    return apiClient.get<WaiterSummary>(`/api/waiter/summary?restaurantId=${restaurantId}`, { token });
  },

  /** Fetch dining tables with active order state */
  async getTables(restaurantId: string, token: string): Promise<TableWithOrders[]> {
    return apiClient.get<TableWithOrders[]>(`/api/waiter/tables?restaurantId=${restaurantId}`, { token });
  },

  /** Fetch complete details for a single table */
  async getTableDetails(tableId: string, token: string): Promise<any> {
    return apiClient.get<any>(`/api/waiter/tables/${tableId}`, { token });
  },

  /** Mark a table as occupied */
  async openTable(tableId: string, token: string): Promise<any> {
    return apiClient.post<any>(`/api/waiter/tables/${tableId}/open`, {}, { token });
  },

  /** Mark a table as available / closed */
  async closeTable(tableId: string, token: string): Promise<any> {
    return apiClient.post<any>(`/api/waiter/tables/${tableId}/close`, {}, { token });
  },

  /** Transfer orders from one table to another */
  async transferTable(sourceTableId: string, targetTableId: string, token: string): Promise<any> {
    return apiClient.post<any>(`/api/waiter/tables/${sourceTableId}/transfer`, { targetTableId }, { token });
  },

  /** Request bill for a table */
  async requestBill(tableId: string, token: string): Promise<any> {
    return apiClient.post<any>(`/api/waiter/tables/${tableId}/request-bill`, {}, { token });
  },

  /** Create walk-in order directly from waiter interface */
  async createWalkInOrder(input: WalkInOrderInput, token: string): Promise<any> {
    return apiClient.post<any>('/api/waiter/orders/walk-in', input, { token });
  },

  /** Add extra items to an existing active order */
  async addItemsToOrder(orderId: string, items: AddItemsToOrderInput['items'], token: string): Promise<any> {
    return apiClient.post<any>(`/api/waiter/orders/${orderId}/add-items`, { items }, { token });
  },

  /** List orders with filters */
  async getOrders(
    params: {
      status?: string;
      tableId?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
    token: string
  ): Promise<any[]> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.tableId) query.set('tableId', params.tableId);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', params.page.toString());
    if (params.limit) query.set('limit', params.limit.toString());

    return apiClient.get<any[]>(`/api/waiter/orders?${query.toString()}`, { token });
  },

  /** Get single order details */
  async getOrderDetails(orderId: string, token: string): Promise<any> {
    return apiClient.get<any>(`/api/waiter/orders/${orderId}`, { token });
  },

  /** Update order status */
  async updateOrderStatus(orderId: string, status: OrderStatus, token: string): Promise<any> {
    return apiClient.patch<any>(`/api/waiter/orders/${orderId}/status`, { status }, { token });
  },

  /** Fast-action: Mark order served */
  async serveOrder(orderId: string, token: string): Promise<any> {
    return apiClient.patch<any>(`/api/waiter/orders/${orderId}/serve`, {}, { token });
  },

  /** Get pending customer assistance requests */
  async getCustomerRequests(token: string): Promise<CustomerRequestRecord[]> {
    return apiClient.get<CustomerRequestRecord[]>('/api/waiter/requests', { token });
  },

  /** Create a customer assistance request */
  async createCustomerRequest(
    input: { tableId: string; type: string; message?: string },
    token: string
  ): Promise<CustomerRequestRecord> {
    return apiClient.post<CustomerRequestRecord>('/api/waiter/requests', input, { token });
  },

  /** Resolve a customer request */
  async resolveCustomerRequest(requestId: string, status: string = 'RESOLVED', token: string): Promise<any> {
    return apiClient.patch<any>(`/api/waiter/requests/${requestId}/resolve`, { status }, { token });
  },

  /** Query Waiter AI operational assistant */
  async queryAi(query: string, token: string): Promise<OperationalAiResponse> {
    return apiClient.post<OperationalAiResponse>('/api/waiter/ai/query', { query, role: 'WAITER' }, { token });
  },
};
