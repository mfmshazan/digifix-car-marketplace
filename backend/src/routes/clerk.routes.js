import { Router } from 'express';
import { googleSignIn } from '../controllers/clerk.controller.js';

const router = Router();

// Google Sign-In via Clerk
router.post('/google', googleSignIn);

export default router;
