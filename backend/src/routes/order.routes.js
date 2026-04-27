import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSalesmanSalesSummary,
  getSalesmanOrders,
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

// Salesman routes — scoped to their own orders only
router.get('/salesman/summary', authorize('SALESMAN'), getSalesmanSalesSummary);
router.get('/salesman/orders', authorize('SALESMAN'), getSalesmanOrders);
router.put('/:id/status', authorize('SALESMAN'), updateOrderStatus);

export default router;
