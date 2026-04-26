import express from 'express';
import stripeController from '../controllers/stripe.controller.js';

const router = express.Router();

router.get('/test', stripeController.stripeTest);
router.post('/create_connected_account', stripeController.createConnectedAccount);
router.post('/create-checkout-session', stripeController.createCheckoutSession);

export default router;