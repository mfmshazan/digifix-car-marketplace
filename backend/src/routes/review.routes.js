import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import {
  createReviews,
  editReview,
  replyToReview,
  flagReview,
  changeReviewStatus,
  getDriverSummary,
  getTargetReviews,
  getAdminReviews
} from '../controllers/review.controller.js';

const router = Router();

// Publicly readable reviews for a target
router.get('/target/:targetId', getTargetReviews);

// All other endpoints require authentication
router.use(authenticate);

// Customer endpoints
router.post('/', createReviews);
router.put('/:id', editReview);

// Seller/Customer flagging endpoints
router.post('/:id/reply', authorize('SALESMAN'), replyToReview);
router.post('/:id/flag', flagReview);

// Driver endpoints
router.get('/driver/summary', authorize('DELIVERY_PARTNER', 'DELIVERY_PERSON', 'RIDER'), getDriverSummary);

// Admin endpoints
router.get('/admin/all', authorize('ADMIN'), getAdminReviews);
router.patch('/admin/:id/status', authorize('ADMIN'), changeReviewStatus);

export default router;
