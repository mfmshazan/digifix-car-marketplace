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

// Catalog writes — MANAGER owns the catalog and is the only role that can add/edit products
router.post('/', authenticate, authorize('SHOP_MANAGER'), createProduct);
router.put('/:id', authenticate, authorize('SHOP_MANAGER'), updateProduct);
router.delete('/:id', authenticate, authorize('SHOP_MANAGER'), deleteProduct);
// Catalog reads — manager (owner) and salesman (operates under the manager) can both view
router.get('/salesman/my-products', authenticate, authorize('SHOP_MANAGER', 'SALESMAN'), getSalesmanProducts);

export default router;
