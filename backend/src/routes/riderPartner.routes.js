import { Router } from 'express';
import { authenticateRider } from '../middleware/riderAuth.middleware.js';
import {
  deleteRiderProfile,
  getRiderProfile,
  updateRiderLocation,
  updateRiderProfile,
  updateRiderPushToken,
  updateRiderStatus,
} from '../controllers/riderPartner.controller.js';

const router = Router();

router.use(authenticateRider);

router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);
router.put('/push-token', updateRiderPushToken);
router.delete('/profile', deleteRiderProfile);
router.put('/status', updateRiderStatus);
router.put('/location', updateRiderLocation);

export default router;

