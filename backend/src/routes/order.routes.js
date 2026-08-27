import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  getSalesmanPendingCount,
  updateOrderStatus,
  getCustomerOrders,
  createOrder,
  estimateDelivery,
  requestCancellation,
  approveCancellation,
  rejectCancellation,
  acceptComplaint,
  rejectComplaint
} from '../controllers/order.controller.js';

const router = Router();

// Every order operation requires a logged-in user
router.use(authenticate);

// Customer routes — any authenticated user can place/view their own orders
router.post('/', createOrder);
// Delivery fee estimate for the cart (distance x vehicle), so the customer sees it before paying
router.post('/delivery-estimate', estimateDelivery);
router.get('/', getCustomerOrders);
// Customer cancellation — goes to admin for review, not instant
router.post('/:id/cancel', requestCancellation);

// Admin routes — only admins can approve/reject cancellations
router.post('/:id/approve-cancel', authorize('ADMIN'), approveCancellation);
router.post('/:id/reject-cancel', authorize('ADMIN'), rejectCancellation);

// Salesman routes — scoped to their own orders only
router.get('/salesman/summary', authorize('SALESMAN'), getSalesmanSalesSummary);
router.get('/salesman/pending-count', authorize('SALESMAN'), getSalesmanPendingCount);
router.get('/salesman/orders', authorize('SALESMAN'), getSalesmanOrders);
router.put('/:id/status', authorize('SALESMAN'), updateOrderStatus);

// Shop routes — manager or salesman review a post-delivery complaint (scoped
// to their own shop's orders inside the controller via resolveShopOwnerId).
router.post('/:id/accept-complaint', authorize('SALESMAN', 'SHOP_MANAGER'), acceptComplaint);
router.post('/:id/reject-complaint', authorize('SALESMAN', 'SHOP_MANAGER'), rejectComplaint);

export default router;
