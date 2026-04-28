import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createDeliveryRequest,
  getDeliveryRequest,
} from '../controllers/deliveryRequest.controller.js';

const router = Router();

router.use(authenticate);

router.post('/', authorize('SALESMAN', 'ADMIN'), createDeliveryRequest);
router.get('/:id', authorize('SALESMAN', 'ADMIN'), getDeliveryRequest);

export default router;

