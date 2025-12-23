import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Customer routes
router.get('/', (req, res) => {
  // TODO: Implement - Get user's orders
  res.json({ orders: [] });
});

router.post('/', (req, res) => {
  // TODO: Implement - Create order
  res.json({ message: 'Order created' });
});

router.get('/:id', (req, res) => {
  // TODO: Implement - Get order by ID
  res.json({ order: null });
});

// Salesman routes
router.get('/salesman/orders', authorize('SALESMAN'), (req, res) => {
  // TODO: Implement - Get salesman's orders
  res.json({ orders: [] });
});

router.put('/:id/status', authorize('SALESMAN'), (req, res) => {
  // TODO: Implement - Update order status
  res.json({ message: 'Order status updated' });
});

export default router;
