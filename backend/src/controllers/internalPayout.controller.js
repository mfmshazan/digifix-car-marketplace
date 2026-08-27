// src/controllers/internalPayout.controller.js
import { runBatchPayout } from '../services/payoutBatch.service.js';

class InternalPayoutController {
    runDriverPayouts = async (req, res) => {
        try {
            const result = await runBatchPayout({
                roles: ['DELIVERY_PARTNER', 'DELIVERY_PERSON', 'RIDER'],
                description: 'Daily driver payout',
            });
            const hasFailures = result.summary.failedCount > 0;
            return res.status(hasFailures ? 207 : 200).json({ success: !hasFailures, ...result });
        } catch (error) {
            console.error('runDriverPayouts error:', error);
            return res.status(500).json({ success: false, message: 'Driver payout batch failed', error: error.message });
        }
    };

    runSalesmenPayouts = async (req, res) => {
        try {
            const result = await runBatchPayout({
                roles: ['SHOP_MANAGER'],
                description: 'Weekly sales rep payout',
            });
            const hasFailures = result.summary.failedCount > 0;
            return res.status(hasFailures ? 207 : 200).json({ success: !hasFailures, ...result });
        } catch (error) {
            console.error('runSalesmenPayouts error:', error);
            return res.status(500).json({ success: false, message: 'Salesman payout batch failed', error: error.message });
        }
    };
}

export default new InternalPayoutController();