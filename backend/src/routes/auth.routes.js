import { Router } from 'express';
import {
  register,
  login,
  getProfile,
  updateProfile,
  googleCallback,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/google/callback', googleCallback);

// Protected routes
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

export default router;
