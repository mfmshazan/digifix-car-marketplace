import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
} from '../controllers/auth.controller.js';
import {
  logoutRider,
  refreshRiderToken,
} from '../controllers/riderAuth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  requestOtp,
  verifyOtp,
  resetPassword,
} from '../controllers/forgotPassword.controller.js';
import rateLimit from 'express-rate-limit';

// Rate limiters for forgot password flow
const isDev = process.env.NODE_ENV !== 'production';
if (isDev) console.log('🛠️  Development mode: Auth rate limiters are bypassed.');

const requestOtpLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { success: false, message: 'Too many OTP requests from this IP, please try again later' }
});

const verifyOtpLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 10,
  message: { success: false, message: 'Too many verification attempts, please try again later' }
});

const resetPasswordLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many reset attempts, please try again later' }
});

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshRiderToken);
router.post('/logout', logoutRider);

// Forgot Password Flow
router.post('/forgot-password', requestOtpLimiter, requestOtp);
router.post('/verify-otp', verifyOtpLimiter, verifyOtp);
router.post('/reset-password', resetPasswordLimiter, resetPassword);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
