// ============================================================
// Socket.io Event Constants
// Typed event names for all real-time communications.
// Import these in both server handlers and client-side hooks
// to keep event names in sync.
// ============================================================

export const SOCKET_EVENTS = {
  // ── Connection lifecycle
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  CONNECTION_ERROR: 'connect_error',

  // ── Order events (Phase 2+)
  ORDER_CREATED: 'order.created',
  ORDER_UPDATED: 'order.updated',
  ORDER_STATUS_CHANGED: 'order.statusChanged',
  ORDER_CANCELLED: 'order.cancelled',

  // ── Kitchen events (Phase 4+)
  KITCHEN_ORDER_UPDATED: 'kitchen.orderUpdated',
  KITCHEN_ITEM_READY: 'kitchen.itemReady',

  // ── Table events (Phase 2+)
  TABLE_CALLED_WAITER: 'table.calledWaiter',
  TABLE_REQUESTED_BILL: 'table.requestedBill',

  // ── Staff events (Phase 3+)
  STAFF_NOTIFICATION: 'staff.notification',

  // ── System events
  SYSTEM_ERROR: 'system.error',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
