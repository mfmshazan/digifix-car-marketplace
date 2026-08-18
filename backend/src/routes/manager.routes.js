import { Router } from 'express';
import {
  getJoinCode,
  listSalesmen,
  approveSalesman,
  rejectSalesman,
} from '../controllers/manager.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// All manager endpoints require an authenticated SHOP_MANAGER.
router.use(authenticate, authorize('SHOP_MANAGER'));

router.get('/join-code', getJoinCode);
router.get('/salesmen', listSalesmen);
router.post('/salesmen/:id/approve', approveSalesman);
router.post('/salesmen/:id/reject', rejectSalesman);

export default router;
