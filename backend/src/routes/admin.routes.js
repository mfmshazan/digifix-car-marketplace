import { Router } from 'express';
import {
  getOverviewStats,
  Users,
  updateUserStatus,
  getFinances,
  getCatalog,
  updateCatalogItemStatus
} from "../controllers/admin.controller.js";
import { authenticate } from '../middleware/auth.middleware.js';


const router = Router();

// Middleware to check if user is an ADMIN
const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }
};

// Apply auth and admin middleware to all admin routes
router.use(authenticate);
router.use(requireAdmin);

// Dashboard Routes
router.get('/stats', getOverviewStats);
router.get('/users', Users);
router.patch('/users/:userId/status', updateUserStatus);
router.get('/finances', getFinances);
router.get('/catalog', getCatalog);
router.patch('/catalog/:id/status', updateCatalogItemStatus);

export default router;