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

  // ── Phase 5 Events: Payment, Requests & Table Sync
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_REFUNDED: 'payment.refunded',
  CUSTOMER_REQUEST_CREATED: 'customer.requestCreated',
  CUSTOMER_REQUEST_RESOLVED: 'customer.requestResolved',
  TABLE_UPDATED: 'table.updated',

  // ── System events
  SYSTEM_ERROR: 'system.error',

  // ── AR / 3D Visualization events (Phase 4)
  AR_VIEWER_OPENED: 'ar.viewer.opened',
  AR_MODEL_LOADED: 'ar.model.loaded',
  AR_SESSION_STARTED: 'ar.session.started',
  AR_SESSION_ENDED: 'ar.session.ended',
  AR_FAILED: 'ar.failed',
  VIEW3D_OPENED: 'view3d.opened',
  MENU_ITEM_VISUALIZED: 'menu_item.visualized',
} as const;

export type SocketEvent = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];
