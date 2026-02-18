import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  getSalesmanSalesSummary,
  getSalesmanOrders,
  updateOrderStatus,
  getCustomerOrders,
  createOrder
} from '../controllers/order.controller.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.post('/', createOrder);        // Create order
router.get('/', getCustomerOrders);   // Get customer orders

// Salesman routes - They see only their orders
router.get('/salesman/summary', authorize('SALESMAN'), getSalesmanSalesSummary);
router.get('/salesman/orders', authorize('SALESMAN'), getSalesmanOrders);
router.put('/:id/status', authorize('SALESMAN'), updateOrderStatus);

export default router;
