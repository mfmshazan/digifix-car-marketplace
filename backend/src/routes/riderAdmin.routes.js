import { Router } from 'express';
import { authenticateRiderAdmin } from '../middleware/riderAuth.middleware.js';
import {
  createRiderAdminJob,
  getRiderAdminJobTracking,
  getRiderAdminJobs,
  getRiderAdminPartners,
} from '../controllers/riderAdmin.controller.js';

const router = Router();

router.post('/jobs', authenticateRiderAdmin, createRiderAdminJob);
router.get('/jobs', authenticateRiderAdmin, getRiderAdminJobs);
router.get('/partners', authenticateRiderAdmin, getRiderAdminPartners);
router.get('/jobs/:id/tracking', authenticateRiderAdmin, getRiderAdminJobTracking);

export default router;
