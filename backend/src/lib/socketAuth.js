import jwt from 'jsonwebtoken';

export const authenticateMarketplaceSocket = (socket, next) => {
  try {
    const authToken = socket.handshake.auth?.token;
    const authorization = socket.handshake.headers.authorization;
    const bearerToken = authorization?.startsWith('Bearer ')
      ? authorization.slice(7)
      : null;
    const secret = process.env.JWT_SECRET || 'your-secret-key';
    const decoded = jwt.verify(authToken || bearerToken, secret);
    const userId = decoded.userId || decoded.id || decoded.sub;

    if (!userId) return next(new Error('Invalid access token'));

    socket.data.user = { id: String(userId), role: decoded.role || null };
    return next();
  } catch {
    return next(new Error('Invalid or expired access token'));
  }
};
