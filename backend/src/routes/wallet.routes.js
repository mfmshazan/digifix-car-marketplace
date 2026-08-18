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
router.post('/cod/collect', authorize('DELIVERY_PERSON'), walletController.substractCODPayment);
router.post('/cod/settle', authorize('DELIVERY_PERSON'), walletController.settleCODPayment);
router.post('/earnings/salesman', authorize('ADMIN'), walletController.addPurchaseAmountToSalesman);
router.post('/refund/salesman-settlement', authorize('ADMIN'), walletController.addRefundSatlmentsToSalesman);
router.post('/cod/collect', authorize('DELIVERY_PERSON'), walletController.substractCODPayment);
router.post('/cod/settle', authorize('DELIVERY_PERSON'), walletController.settleCODPayment);
router.post('/earnings/salesman', authorize('ADMIN'), walletController.addPurchaseAmountToSalesman);

// Users trigger their own payout
router.post('/payout', walletController.triggerPayout);

// Store owner triggers their own payout (manager owns the wallet; salesman kept for legacy accounts)
router.post('/payout/salesman', authorize('SHOP_MANAGER', 'SALESMAN'), walletController.triggerPayout);

export default router;