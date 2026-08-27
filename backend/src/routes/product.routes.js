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

// Salesman only routes
router.post('/', authenticate, authorize('SALESMAN'), createProduct);
router.put('/:id', authenticate, authorize('SALESMAN'), updateProduct);
router.delete('/:id', authenticate, authorize('SALESMAN'), deleteProduct);
router.get('/salesman/my-products', authenticate, authorize('SALESMAN'), getSalesmanProducts);

export default router;
