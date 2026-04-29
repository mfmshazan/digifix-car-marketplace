import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createDeliveryRequest,
  getAvailableDeliveryPartners,
  getDeliveryRequest,
} from '../controllers/deliveryRequest.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('SALESMAN', 'ADMIN'), createDeliveryRequest);
router.get('/available-riders', authorize('SALESMAN', 'ADMIN'), getAvailableDeliveryPartners);
router.get('/:id', authorize('SALESMAN', 'ADMIN'), getDeliveryRequest);

export default router;
