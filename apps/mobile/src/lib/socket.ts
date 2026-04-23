import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/api.config';

// Strip "/api" from the URL to get the base server URL (e.g., "http://192.168.x.x:3000")
const BACKEND_URL = API_URL.replace(/\/api$/, '');

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.io client connected to the backend.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });

    socket.on('connect', () => {
      console.log('🔌 Mobile socket connected:', socket?.id);
    });

    socket.on('connect_error', (err) => {
      console.warn('🔌 Mobile socket connection error:', err.message);
    });

    socket.on('disconnect', (reason) => {
      console.log('🔌 Mobile socket disconnected:', reason);
    });
  }
  return socket;
}

/**
 * Connects to the backend socket and joins the user's private room.
 * Call this after the customer logs in.
 */
export function connectSocket(userId: string): Socket {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  s.emit('join', userId);
  return s;
}

/**
 * Disconnects the socket. Call on logout.
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
