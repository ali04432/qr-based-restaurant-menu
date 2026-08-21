import { io, Socket } from 'socket.io-client';
import { Order } from '@qr-menu/shared';
import { publicEnv } from './env';

const SOCKET_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.statusChanged',
  KITCHEN_ORDER_UPDATED: 'kitchen.orderUpdated',
};

class SocketClient {
  private socket: Socket | null = null;
  private isConnected = false;

  private getSocket(): Socket {
    if (!this.socket) {
      this.socket = io(process.env.NEXT_PUBLIC_API_URL || publicEnv.apiBaseUrl, {
        autoConnect: true,
        transports: ['websocket', 'polling'],
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('[Socket] Connected to server');
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
        console.log('[Socket] Disconnected from server');
      });
    }
    return this.socket;
  }

  joinRestaurant(restaurantId: string) {
    const s = this.getSocket();
    // Re-assign restaurantId into handshake if we ever need it there,
    // or just let it connect normally. Our API uses query parameter on connect,
    // but doing it retroactively requires reconnections or a specific room-join event.
    // In our api setup, the socket auto-joins if query.restaurantId is present.
    // For now we assume the room logic handles it, or we simply listen.
    s.io.opts.query = { restaurantId };
    s.disconnect().connect();
  }

  leaveRestaurant(restaurantId: string) {
    const s = this.getSocket();
    s.io.opts.query = {};
    s.disconnect();
  }

  // --- Order Listeners ---

  onOrderCreated(cb: (order: Order) => void) {
    this.getSocket().on(SOCKET_EVENTS.ORDER_CREATED, cb);
  }
  offOrderCreated(cb: (order: Order) => void) {
    this.getSocket().off(SOCKET_EVENTS.ORDER_CREATED, cb);
  }

  onKitchenOrderUpdated(cb: (order: Order) => void) {
    this.getSocket().on(SOCKET_EVENTS.KITCHEN_ORDER_UPDATED, cb);
  }
  offKitchenOrderUpdated(cb: (order: Order) => void) {
    this.getSocket().off(SOCKET_EVENTS.KITCHEN_ORDER_UPDATED, cb);
  }
}

export const socketClient = new SocketClient();
