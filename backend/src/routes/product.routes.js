import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSalesmanProducts,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Salesman / Shop Manager routes
router.post('/', authenticate, authorize('SALESMAN', 'SHOP_MANAGER'), createProduct);
router.put('/:id', authenticate, authorize('SALESMAN', 'SHOP_MANAGER'), updateProduct);
router.delete('/:id', authenticate, authorize('SALESMAN', 'SHOP_MANAGER'), deleteProduct);
router.get('/salesman/my-products', authenticate, authorize('SALESMAN', 'SHOP_MANAGER'), getSalesmanProducts);

export default router;
