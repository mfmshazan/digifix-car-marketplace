import jwt from 'jsonwebtoken';

export const riderAuthConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET || 'your_jwt_access_secret',
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret',
  accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
};

export const generateRiderAccessToken = (payload) =>
  jwt.sign({ ...payload, type: 'rider' }, riderAuthConfig.accessTokenSecret, {
    expiresIn: riderAuthConfig.accessTokenExpiry,
  });

export const generateRiderRefreshToken = (payload) =>
  jwt.sign({ ...payload, type: 'rider' }, riderAuthConfig.refreshTokenSecret, {
    expiresIn: riderAuthConfig.refreshTokenExpiry,
  });

const verifyWithFallbackSecrets = (token, primarySecret, fallbackSecrets = []) => {
  const secrets = [...new Set([primarySecret, ...fallbackSecrets].filter(Boolean))];
  let lastError;

  for (const secret of secrets) {
    try {
      return jwt.verify(token, secret);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const verifyRiderAccessToken = (token) =>
  verifyWithFallbackSecrets(token, riderAuthConfig.accessTokenSecret, [
    process.env.JWT_SECRET,
    'your_jwt_access_secret',
  ]);

export const verifyRiderRefreshToken = (token) =>
  verifyWithFallbackSecrets(token, riderAuthConfig.refreshTokenSecret, [
    process.env.JWT_SECRET,
    'your_jwt_refresh_secret',
  ]);

export const getRiderTokenExpiryDate = (expiryString) => {
  const now = new Date();
  const match = String(expiryString).match(/^(\d+)([smhd])$/);

  if (!match) {
    throw new Error('Invalid expiry format');
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  return new Date(now.getTime() + value * multipliers[unit]);
};
