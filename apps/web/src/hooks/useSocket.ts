'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// ============================================================
// useSocket Hook
// Manages a Socket.io client connection lifecycle.
// Automatically connects on mount and disconnects on unmount.
// ============================================================

export interface UseSocketOptions {
  /** URL of the Socket.io server */
  url?: string;
  /** Optional JWT token for authenticated connections */
  token?: string;
  /** Restaurant ID to join the appropriate room */
  restaurantId?: string;
  /** Whether to auto-connect on mount. Set to false for deferred connections. */
  enabled?: boolean;
  /** Custom query parameters */
  query?: Record<string, string>;
}

export interface UseSocketReturn {
  /** Current socket instance */
  socket: Socket | null;
  /** Whether the socket is currently connected */
  isConnected: boolean;
  /** Whether the socket is attempting to connect */
  isConnecting: boolean;
  /** Connection error if any */
  error: Error | null;
  /** Manually trigger connection */
  connect: () => void;
  /** Manually disconnect */
  disconnect: () => void;
  /** Emit an event to the server */
  emit: <T = unknown>(event: string, data?: T) => void;
  /** Subscribe to a server event (returns an unsubscribe cleanup function) */
  on: <T = unknown>(event: string, handler: (data: T) => void) => () => void;
  /** Unsubscribe from a server event */
  off: <T = unknown>(event: string, handler: (data: T) => void) => void;
  /** Join a specific room */
  joinRoom: (room: string) => void;
  /** Leave a specific room */
  leaveRoom: (room: string) => void;
}

const SOCKET_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000')
    : 'http://localhost:4000';

export function useSocket({
  url = SOCKET_URL,
  token,
  restaurantId,
  enabled = true,
  query = {},
}: UseSocketOptions = {}): UseSocketReturn {
  const socketRef = useRef<Socket | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) {
      setIsConnecting(false);
      return;
    }

    setIsConnecting(true);
    setError(null);

    // Initialize socket connection
    const socketInstance: Socket = io(url, {
      auth: { token },
      query: {
        ...(restaurantId ? { restaurantId } : {}),
        ...query,
      },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log(`[Socket] Connected: ${socketInstance.id}`);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
    });

    socketInstance.on('connect_error', (err: Error) => {
      console.error('[Socket] Connection error:', err.message);
      setIsConnected(false);
      setIsConnecting(false);
      setError(err);
    });

    socketInstance.on('disconnect', (reason: string) => {
      console.log(`[Socket] Disconnected: ${reason}`);
      setIsConnected(false);
      setIsConnecting(false);
    });

    return () => {
      socketInstance.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setIsConnecting(false);
    };
  }, [url, token, restaurantId, enabled, JSON.stringify(query)]);

  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      setIsConnecting(true);
      socketRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.disconnect();
      setIsConnected(false);
      setIsConnecting(false);
    }
  }, []);

  const emit = useCallback(<T = unknown>(event: string, data?: T): void => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn(`[Socket] Cannot emit "${event}": Socket is not connected.`);
    }
  }, []);

  const on = useCallback(<T = unknown>(event: string, handler: (data: T) => void): (() => void) => {
    const currentSocket = socketRef.current;
    if (currentSocket) {
      // Cast handler to unknown arg spread for socket.io
      const socketHandler = (...args: unknown[]) => handler(args[0] as T);
      currentSocket.on(event, socketHandler);
      return () => {
        currentSocket.off(event, socketHandler);
      };
    }
    return () => {};
  }, []);

  const off = useCallback(<T = unknown>(event: string, handler: (data: T) => void): void => {
    socketRef.current?.off(event, handler as (...args: unknown[]) => void);
  }, []);

  const joinRoom = useCallback((room: string): void => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('room:join', { room });
    }
  }, []);

  const leaveRoom = useCallback((room: string): void => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('room:leave', { room });
    }
  }, []);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
  };
}

export default useSocket;

