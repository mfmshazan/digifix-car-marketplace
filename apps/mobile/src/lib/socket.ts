import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/api.config';

let socket: Socket | null = null;
let joinedUserId: string | null = null;
let listenersAttached = false;

const getBackendUrl = (): string => getApiUrl().replace(/\/api\/?$/, '');

const joinUserRoom = (userId?: string | null): void => {
  if (!userId || !socket?.connected) return;
  socket.emit('join', userId);
};

const attachSocketListeners = (): void => {
  if (!socket || listenersAttached) return;
  listenersAttached = true;

  socket.on('connect', () => {
    console.log('🔌 Mobile socket connected:', socket?.id);
    joinUserRoom(joinedUserId);
  });

  socket.on('reconnect', () => {
    joinUserRoom(joinedUserId);
  });

  socket.on('connect_error', (err) => {
    console.warn('🔌 Mobile socket connection error:', err.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Mobile socket disconnected:', reason);
  });
};

/**
 * Returns a singleton Socket.io client connected to the backend.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
    attachSocketListeners();
  }
  return socket;
}

/**
 * Connects to the backend socket and joins the user's private room.
 * Call this after the customer logs in.
 */
export function connectSocket(userId: string): Socket {
  const s = getSocket();
  joinedUserId = userId;
  if (!s.connected) {
    s.connect();
  }
  joinUserRoom(userId);
  return s;
}

/**
 * Disconnects the socket. Call on logout.
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
  joinedUserId = null;
}
