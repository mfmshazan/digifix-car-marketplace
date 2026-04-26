import express from 'express';
import walletController from '../controllers/wallet.controller.js';

const router = express.Router();

router.get('/', walletController.getAllWallets);

router.post('/user', walletController.getWallet);

router.post('/refund/customer', walletController.addCustomersRefund);

router.post('/earnings/delivery', walletController.addDeliveryPersonEarnings);

router.post('/cod/collect', walletController.substractCODPayment);

router.post('/cod/settle', walletController.settleCODPayment);

router.post('/payout/delivery', walletController.substractDeliveryPersonDayPayment);

router.post('/earnings/salesman', walletController.addPurchaseAmountToSalesman);

router.post('/payout/salesman', walletController.substractSaleRevenueFromSalesman);

router.post('/refund/salesman-settlement', walletController.addRefundSatlmentsToSalesman);

export default router;