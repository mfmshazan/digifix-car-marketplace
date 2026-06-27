import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  getSalesmanPendingCount,
  updateOrderStatus,
  getCustomerOrders,
  createOrder,
  requestCancellation,
  approveCancellation,
  rejectCancellation
} from '../controllers/order.controller.js';

const router = Router();

// Every order operation requires a logged-in user
router.use(authenticate);

// Customer routes — any authenticated user can place/view their own orders
router.post('/', createOrder);
router.get('/', getCustomerOrders);
// Customer cancellation — goes to admin for review, not instant
router.post('/:id/cancel', requestCancellation);

// Admin routes — only admins can approve/reject cancellations
router.post('/:id/approve-cancel', authorize('ADMIN'), approveCancellation);
router.post('/:id/reject-cancel', authorize('ADMIN'), rejectCancellation);

// Store routes — manager (store owner) and salesman (operates under the manager)
router.get('/salesman/summary', authorize('SHOP_MANAGER', 'SALESMAN'), getSalesmanSalesSummary);
router.get('/salesman/pending-count', authorize('SHOP_MANAGER', 'SALESMAN'), getSalesmanPendingCount);
router.get('/salesman/orders', authorize('SHOP_MANAGER', 'SALESMAN'), getSalesmanOrders);
router.put('/:id/status', authorize('SHOP_MANAGER', 'SALESMAN'), updateOrderStatus);

export default router;
