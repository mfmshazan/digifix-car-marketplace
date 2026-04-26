import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

let socket: Socket | null = null;
let joinedUserId: string | null = null;
let listenersAttached = false;

const joinUserRoom = (userId?: string | null): void => {
  if (!userId || !socket?.connected) {
    return;
  }

  socket.emit('join', userId);
};

const attachSocketListeners = (): void => {
  if (!socket || listenersAttached) {
    return;
  }

  listenersAttached = true;

  socket.on('connect', () => {
    joinUserRoom(joinedUserId);
  });

  socket.on('reconnect', () => {
    joinUserRoom(joinedUserId);
  });

  socket.on('connect_error', (error) => {
    console.warn('🔌 Socket connection error:', error.message);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });
};

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

    attachSocketListeners();
  }
  return socket;
}

/**
 * Connects to the backend socket server and joins the user's private room.
 * This ensures the client only receives events targeted at this user.
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
 * Disconnects the socket (call on logout).
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect();
  }

  joinedUserId = null;
}
