import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../services/auth';
import { registerSocketHandlers } from './handlers';

// ============================================================
// Socket.io Server Setup
// Multi-Tenant Isolated Architecture
// ============================================================

let io: SocketServer | null = null;

/**
 * Initialize the Socket.io server and attach it to the HTTP server.
 * Restaurant-scoped rooms follow the convention: `restaurant:{restaurantId}`
 */
export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: env.SOCKET_CORS_ORIGINS.split(',').map((origin) => origin.trim()),
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // ── Optional JWT authentication for socket connections
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Attach user context to socket data for tenant authorization
        socket.data.user = payload;
        socket.data.restaurantId = payload.restaurantId;
      }
    }

    // Allow connection regardless — public QR scan sessions don't need JWT
    next();
  });

  io.on('connection', (socket: Socket) => {
    // If the client provides a restaurantId in handshake query or auth, join the restaurant room
    const requestedRestaurantId =
      (socket.handshake.query.restaurantId as string | undefined) ?? socket.data.restaurantId;

    if (requestedRestaurantId) {
      // Enforce tenant authorization: Authenticated staff can only join their assigned restaurant (unless SUPER_ADMIN)
      if (socket.data.user && socket.data.restaurantId && socket.data.user.role !== 'SUPER_ADMIN') {
        if (socket.data.restaurantId !== requestedRestaurantId) {
          console.warn(
            `[Socket Security] Blocked client ${socket.id} (user ${socket.data.user.id}) from joining unauthorized restaurant: ${requestedRestaurantId}`
          );
          return;
        }
      }

      const room = `restaurant:${requestedRestaurantId}`;
      void socket.join(room);
      console.log(`[Socket] ${socket.id} joined tenant room ${room}`);
    }

    // Also listen for explicit join:restaurant events with tenant boundary check
    socket.on('join:restaurant', (rId: string) => {
      if (!rId) return;

      if (socket.data.user && socket.data.restaurantId && socket.data.user.role !== 'SUPER_ADMIN') {
        if (socket.data.restaurantId !== rId) {
          console.warn(
            `[Socket Security] Blocked client ${socket.id} from unauthorized join:restaurant for ${rId}`
          );
          return;
        }
      }

      const room = `restaurant:${rId}`;
      void socket.join(room);
      console.log(`[Socket] ${socket.id} joined tenant room via event: ${room}`);
    });

    // Support room:join for clients using that convention with multi-tenant enforcement
    socket.on('room:join', (payload: { room: string } | string) => {
      const room = typeof payload === 'string' ? payload : payload?.room;
      if (!room) return;

      if (room.startsWith('restaurant:')) {
        const targetId = room.replace('restaurant:', '');
        if (socket.data.user && socket.data.restaurantId && socket.data.user.role !== 'SUPER_ADMIN') {
          if (socket.data.restaurantId !== targetId) {
            console.warn(
              `[Socket Security] Blocked client ${socket.id} from unauthorized room:join for ${room}`
            );
            return;
          }
        }
      } else if (room === 'orders' || room === 'global') {
        // Reject global unisolated orders room joins to prevent cross-tenant exposure
        console.warn(
          `[Socket Security] Blocked client ${socket.id} from joining global room '${room}' to preserve tenant isolation.`
        );
        return;
      }

      void socket.join(room);
      console.log(`[Socket] ${socket.id} joined room ${room}`);
    });

    registerSocketHandlers(socket);
  });

  console.log('[Socket.io] Server initialized with multi-tenant isolation');
  return io;
}

/**
 * Get the initialized Socket.io server instance.
 * Throws if called before initSocketServer().
 */
export function getSocketServer(): SocketServer {
  if (!io) {
    throw new Error('Socket.io server has not been initialized. Call initSocketServer() first.');
  }
  return io;
}

/**
 * Emit an event to all authorized clients in a specific restaurant's room.
 * Strictly enforces tenant isolation: NEVER broadcasts to global namespace or cross-restaurant rooms.
 */
export function emitToRestaurant(
  restaurantId: string,
  event: string,
  data: unknown
): void {
  const server = getSocketServer();
  // Strictly emit to the isolated restaurant room only
  server.to(`restaurant:${restaurantId}`).emit(event, data);
}
