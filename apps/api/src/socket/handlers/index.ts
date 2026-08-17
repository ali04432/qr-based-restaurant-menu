import { Socket } from 'socket.io';
import { SOCKET_EVENTS } from '../events';

// ============================================================
// Socket.io Event Handler Aggregator
// Register all socket event listeners here.
// Split into domain-specific handler files as features grow.
// ============================================================

/**
 * Attach all event handlers to an authenticated socket connection.
 * Called once per new client connection.
 */
export function registerSocketHandlers(socket: Socket): void {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // ── Disconnect handler
  socket.on(SOCKET_EVENTS.DISCONNECT, (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id} — reason: ${reason}`);
  });

  // ── Placeholder: order handlers (Phase 2+)
  // registerOrderHandlers(socket);

  // ── Placeholder: kitchen handlers (Phase 4+)
  // registerKitchenHandlers(socket);

  // ── Placeholder: table handlers (Phase 2+)
  // registerTableHandlers(socket);
}
