import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getRiderLiveLocation,
  getOrderDeliveryStatus,
} from '../controllers/customerTracking.controller.js';

const router = Router();

// Customer / salesman / admin can poll rider's live GPS for a given order
router.get('/order/:orderId/rider-location', authenticate, getRiderLiveLocation);

// Customer / salesman / admin can get full delivery job status for a given order
router.get('/order/:orderId/delivery-status', authenticate, getOrderDeliveryStatus);

export default router;
