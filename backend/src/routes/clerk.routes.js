import { Router } from 'express';
import { verifyClerkToken } from '../middleware/clerk.middleware.js';
import { clerkGoogleCallback, getClerkUserInfo } from '../controllers/clerk.controller.js';

const router = Router();

// Clerk Google OAuth callback
router.post('/clerk/google/callback', verifyClerkToken, clerkGoogleCallback);

// Get authenticated user info from Clerk
router.get('/clerk/user', verifyClerkToken, getClerkUserInfo);

export default router;
