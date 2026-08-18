import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createDeliveryRequest,
  getAvailableDeliveryPartners,
  getDeliveryRequest,
  getShopPickupLocation,
  retryDeliveryRequest,
  updateShopPickupLocation,
} from '../controllers/deliveryRequest.controller.js';

const router = Router();

router.use(authenticate);

router.get('/shop-location', authorize('SALESMAN', 'SHOP_MANAGER'), getShopPickupLocation);
router.put('/shop-location', authorize('SALESMAN', 'SHOP_MANAGER'), updateShopPickupLocation);
router.post('/', authorize('SALESMAN', 'SHOP_MANAGER', 'ADMIN'), createDeliveryRequest);
router.get('/available-riders', authorize('SALESMAN', 'SHOP_MANAGER', 'ADMIN'), getAvailableDeliveryPartners);
router.post('/:id/retry', authorize('SALESMAN', 'SHOP_MANAGER', 'ADMIN'), retryDeliveryRequest);
router.get('/:id', authorize('SALESMAN', 'SHOP_MANAGER', 'ADMIN'), getDeliveryRequest);

export default router;
