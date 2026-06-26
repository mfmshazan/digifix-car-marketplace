import { Router } from 'express';
import { authenticateRider } from '../middleware/riderAuth.middleware.js';
import {
  flagRiderReview,
  getRiderPerformance,
} from '../controllers/riderPerformance.controller.js';

const router = Router();

router.get('/partner/performance', authenticateRider, getRiderPerformance);
router.post('/ratings/:id/flag', authenticateRider, flagRiderReview);

export default router;
