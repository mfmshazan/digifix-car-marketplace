// src/routes/internalPayout.routes.js
import express from 'express';
import internalPayoutController from '../controllers/internalPayout.controller.js';
import { internalAuth } from '../middleware/internalAuth.middleware.js';

const router = express.Router();

// All routes here are machine-to-machine only (n8n), not user-facing.
router.use(internalAuth);

router.post('/payouts/drivers/run', internalPayoutController.runDriverPayouts);
router.post('/payouts/salesmen/run', internalPayoutController.runSalesmenPayouts);

export default router;