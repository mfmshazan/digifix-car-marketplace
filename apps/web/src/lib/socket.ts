import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

let socket: Socket | null = null;
let joinedUserId: string | null = null;
let joinedRole: string | null = null;
let listenersAttached = false;

const joinUserRoom = (userId?: string | null): void => {
  if (!userId || !socket?.connected) return;
  socket.emit('join', userId);
};

// Admins need a shared room so cancellation events reach all admin sessions, not just one tab
const joinRoleRoom = (role?: string | null): void => {
  if (!role || !socket?.connected) return;
  socket.emit('joinRole', role);
};

const attachSocketListeners = (): void => {
  if (!socket || listenersAttached) return;
  listenersAttached = true;

  // 'connect' fires on every successful connection AND every reconnection in socket.io-client v4
  socket.on('connect', () => {
    // Rejoin rooms after reconnect so no events are missed during a brief disconnect
    joinUserRoom(joinedUserId);
    joinRoleRoom(joinedRole);
  });

  socket.on('connect_error', (error) => {
    console.warn('Socket connection error:', error.message);
  });
};

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
    attachSocketListeners();
  }
  return socket;
}

// Accepts an optional role so admins can also join role:ADMIN alongside their personal room
export function connectSocket(userId: string, role?: string): Socket {
  const s = getSocket();
  joinedUserId = userId;
  if (role) joinedRole = role;

  if (!s.connected) {
    s.connect();
  } else {
    // Already connected — join rooms immediately
    joinUserRoom(userId);
    if (role) joinRoleRoom(role);
  }

  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    listenersAttached = false;
  }
  joinedUserId = null;
  joinedRole = null;
}
