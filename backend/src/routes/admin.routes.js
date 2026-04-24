import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { getDashboardStats, getRevenueStats } from '../controllers/admin.controller.js';

const router = Router();

// Only ADMIN role users can access these routes
router.get('/stats', authenticate, authorize('ADMIN'), getDashboardStats);
router.get('/revenue', authenticate, authorize('ADMIN'), getRevenueStats);

export default router;
