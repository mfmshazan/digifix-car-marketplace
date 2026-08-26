import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

let socket: Socket | null = null;
let listenersAttached = false;

const attachSocketListeners = (): void => {
  if (!socket || listenersAttached) return;
  listenersAttached = true;

  // 'connect' fires on every successful connection AND every reconnection in socket.io-client v4
  socket.on('connect', () => {
    // The backend derives and rejoins rooms from the verified JWT.
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
export function connectSocket(_userId?: string, _role?: string): Socket {
  const s = getSocket();
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('digifix_token')
    : null;

  if (!token) {
    console.warn('Socket connection skipped: authentication token is unavailable');
    return s;
  }

  s.auth = { token };

  if (!s.connected) {
    s.connect();
  }
  // An existing authenticated socket is reused until logout disconnects it.
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket.removeAllListeners();
    socket = null;
    listenersAttached = false;
  }
}
