import bcrypt from 'bcryptjs';
import { riderQuery } from '../lib/riderDb.js';
import {
  generateRiderAccessToken,
  generateRiderRefreshToken,
  getRiderTokenExpiryDate,
  riderAuthConfig,
  verifyRiderRefreshToken,
} from '../lib/riderTokens.js';
import { hasValue, isEmail, validationError } from '../utils/riderValidation.js';

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const createTokens = async (partner) => {
  const tokenPayload = { id: partner.id, email: partner.email };
  const accessToken = generateRiderAccessToken(tokenPayload);
  const refreshToken = generateRiderRefreshToken(tokenPayload);
  const expiresAt = getRiderTokenExpiryDate(riderAuthConfig.refreshTokenExpiry);

  await riderQuery(
    'INSERT INTO rider_refresh_tokens (partner_id, token, expires_at) VALUES ($1, $2, $3)',
    [partner.id, refreshToken, expiresAt]
  );

  return { accessToken, refreshToken };
};

export const isRiderRegisterPayload = (body = {}) =>
  body.fullName !== undefined || body.vehicleType !== undefined || body.vehicleNumber !== undefined;

export const registerRider = async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, fullName, phone, vehicleType, vehicleNumber } = req.body;

    if (!isEmail(email) || !hasValue(password) || String(password).length < 6 || !hasValue(fullName) || !hasValue(phone)) {
      return validationError(res, 'Validation failed');
    }

    const existingUser = await riderQuery('SELECT id FROM rider_delivery_partners WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await riderQuery(
      `INSERT INTO rider_delivery_partners
        (email, password_hash, full_name, phone, vehicle_type, vehicle_number)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, full_name, phone, vehicle_type, vehicle_number, status, created_at`,
      [email, passwordHash, String(fullName).trim(), String(phone).trim(), vehicleType || null, vehicleNumber || null]
    );

    const partner = result.rows[0];
    const { accessToken, refreshToken } = await createTokens(partner);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        partner,
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const loginRiderByEmail = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);
  const result = await riderQuery(
    `SELECT id, email, password_hash, full_name, phone, vehicle_type,
            vehicle_number, status, rating, total_deliveries
       FROM rider_delivery_partners
      WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const partner = result.rows[0];
  const isValidPassword = await bcrypt.compare(password, partner.password_hash);

  if (!isValidPassword) {
    return false;
  }

  delete partner.password_hash;
  const { accessToken, refreshToken } = await createTokens(partner);

  return {
    success: true,
    message: 'Login successful',
    data: {
      partner,
      accessToken,
      refreshToken,
    },
  };
};

export const loginRider = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!isEmail(email) || !hasValue(password)) {
      return validationError(res, 'Validation failed');
    }

    const loginResult = await loginRiderByEmail({ email, password });

    if (!loginResult) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (loginResult === false) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    return res.json(loginResult);
  } catch (error) {
    return next(error);
  }
};

export const refreshRiderToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required',
      });
    }

    let decoded;
    try {
      decoded = verifyRiderRefreshToken(refreshToken);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
    }

    const tokenResult = await riderQuery(
      'SELECT id FROM rider_refresh_tokens WHERE token = $1 AND expires_at > NOW()',
      [refreshToken]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Refresh token not found or expired',
      });
    }

    const accessToken = generateRiderAccessToken({ id: decoded.id, email: decoded.email });

    return res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutRider = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await riderQuery('DELETE FROM rider_refresh_tokens WHERE token = $1', [refreshToken]);
    }

    return res.json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    return next(error);
  }
};

