import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { env } from '../config/env';
import { verifyToken } from '../services/auth';
import { registerSocketHandlers } from './handlers';

// ============================================================
// Socket.io Server Setup
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
  // Unauthenticated connections are allowed in Phase 1.
  // In Phase 2+, enforce auth for staff namespaces.
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        // Attach user context to socket data for use in handlers
        socket.data.user = payload;
        socket.data.restaurantId = payload.restaurantId;
      }
    }

    // Allow connection regardless — public QR scan sessions don't need JWT
    next();
  });

  io.on('connection', (socket: Socket) => {
    // If the client provides a restaurantId, join the restaurant room
    const restaurantId =
      socket.data.restaurantId ?? (socket.handshake.query.restaurantId as string | undefined);

    if (restaurantId) {
      const room = `restaurant:${restaurantId}`;
      void socket.join(room);
      console.log(`[Socket] ${socket.id} joined room ${room}`);
    }

    registerSocketHandlers(socket);
  });

  console.log('[Socket.io] Server initialized');
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
 * Emit an event to all clients in a specific restaurant's room.
 */
export function emitToRestaurant(
  restaurantId: string,
  event: string,
  data: unknown
): void {
  getSocketServer().to(`restaurant:${restaurantId}`).emit(event, data);
}
