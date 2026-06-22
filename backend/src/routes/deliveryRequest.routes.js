import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createDeliveryRequest,
  getAvailableDeliveryPartners,
  getDeliveryRequest,
  retryDeliveryRequest,
} from '../controllers/deliveryRequest.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('SALESMAN', 'ADMIN'), createDeliveryRequest);
router.get('/available-riders', authorize('SALESMAN', 'ADMIN'), getAvailableDeliveryPartners);
router.post('/:id/retry', authorize('SALESMAN', 'ADMIN'), retryDeliveryRequest);
router.get('/:id', authorize('SALESMAN', 'ADMIN'), getDeliveryRequest);

export default router;
