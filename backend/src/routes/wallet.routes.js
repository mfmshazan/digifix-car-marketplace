import express from 'express';
import walletController from '../controllers/wallet.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

// Current user's wallet (any authenticated role)
router.get('/my', walletController.getMyWallet);

// Admin only
router.get('/', authorize('ADMIN'), walletController.getAllWallets);
router.post('/user', authorize('ADMIN'), walletController.getWallet);
router.post('/refund/customer', authorize('ADMIN'), walletController.addCustomersRefund);
router.post('/earnings/delivery', authorize('ADMIN'), walletController.addDeliveryPersonEarnings);
router.post('/cod/collect', authorize('DELIVERY_PERSON'), walletController.substractCODPayment);
router.post('/cod/settle', authorize('DELIVERY_PERSON'), walletController.settleCODPayment);
router.post('/payout/delivery', authorize('ADMIN'), walletController.substractDeliveryPersonDayPayment);
router.post('/earnings/salesman', authorize('ADMIN'), walletController.addPurchaseAmountToSalesman);
router.post('/refund/salesman-settlement', authorize('ADMIN'), walletController.addRefundSatlmentsToSalesman);

// Salesman triggers their own payout
router.post('/payout/salesman', authorize('SALESMAN'), walletController.substractSaleRevenueFromSalesman);

export default router;