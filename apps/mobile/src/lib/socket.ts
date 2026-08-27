import { io, Socket } from 'socket.io-client';
import { getApiUrl } from '../config/api.config';

let socket: Socket | null = null;
let listenersAttached = false;

const getBackendUrl = (): string => getApiUrl().replace(/\/api\/?$/, '');

const attachSocketListeners = (): void => {
  if (!socket || listenersAttached) return;
  listenersAttached = true;

  // 'connect' fires on every successful connection AND every reconnection in socket.io-client v4
  socket.on('connect', () => {
    // The backend derives and rejoins this user's room from the verified JWT.
  });

  socket.on('connect_error', (err) => {
    console.warn('Mobile socket connection error:', err.message);
  });
};

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ['polling', 'websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });
    attachSocketListeners();
  }
  return socket;
}

export function connectSocket(accessToken: string): Socket {
  const s = getSocket();
  s.auth = { token: accessToken };
  if (!s.connected) {
    s.connect();
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
}
