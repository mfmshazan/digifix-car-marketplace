import express from 'express';
import stripeController from '../controllers/stripe.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/test', stripeController.stripeTest);
router.post('/create_connected_account', stripeController.createConnectedAccount);
router.post('/create-checkout-session', stripeController.createCheckoutSession);
router.get('/verify-session/:sessionId', authenticate, stripeController.verifyPaymentAndSaveOrder);
router.post('/onboard', authenticate, stripeController.getOnboardingLink);
router.get('/account-status', authenticate, stripeController.checkAccountStatus);

export default router;