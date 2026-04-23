import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Returns a singleton Socket.io client connected to the backend.
 * Call `connectSocket(userId)` after the user logs in.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
    });
  }
  return socket;
}

/**
 * Connects to the backend socket server and joins the user's private room.
 * This ensures the client only receives events targeted at this user.
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
 * Disconnects the socket (call on logout).
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }
}
