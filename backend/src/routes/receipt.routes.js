import express from 'express';
import receiptController from '../controllers/receipt.controller.js';
import { receiptUpload } from '../middleware/receiptUpload.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/', authenticate, receiptUpload, receiptController.submitReceipt);
router.get('/my', authenticate, receiptController.getMyReceipts);
router.get('/admin', authenticate, authorize('ADMIN'), receiptController.adminListReceipts);
router.get('/admin/debtors', authenticate, authorize('ADMIN'), receiptController.adminListDebtors);
router.post('/:id/review', authenticate, authorize('ADMIN'), receiptController.adminReviewReceipt);

export default router;