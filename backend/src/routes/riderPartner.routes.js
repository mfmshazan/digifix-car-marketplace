import { Router } from 'express';
import { authenticateRider } from '../middleware/riderAuth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  deleteRiderPhoto,
  deleteRiderProfile,
  getRiderProfile,
  updateRiderLocation,
  updateRiderProfile,
  updateRiderPushToken,
  updateRiderStatus,
  uploadRiderPhoto,
} from '../controllers/riderPartner.controller.js';

const router = Router();

router.use(authenticateRider);

router.get('/profile', getRiderProfile);
router.put('/profile', updateRiderProfile);
router.post('/profile/photo', upload.single('photo'), uploadRiderPhoto);
router.delete('/profile/photo', deleteRiderPhoto);
router.put('/push-token', updateRiderPushToken);
router.delete('/profile', deleteRiderProfile);
router.put('/status', updateRiderStatus);
router.put('/location', updateRiderLocation);

export default router;

