import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getSalesmanProducts,
  uploadProductImages,
} from '../controllers/product.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';

const router = Router();

// Public routes
router.get('/', getProducts);
router.get('/:id', getProductById);

// Salesman only routes
router.post('/upload-images', authenticate, authorize('SALESMAN'), upload.array('images', 5), uploadProductImages);
router.post('/', authenticate, authorize('SALESMAN'), createProduct);
router.put('/:id', authenticate, authorize('SALESMAN'), updateProduct);
router.delete('/:id', authenticate, authorize('SALESMAN'), deleteProduct);
router.get('/salesman/my-products', authenticate, authorize('SALESMAN'), getSalesmanProducts);

export default router;
