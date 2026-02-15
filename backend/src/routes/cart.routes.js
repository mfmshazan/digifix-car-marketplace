import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Get user's cart
// GET /api/cart
router.get('/', getCart);

// Add item to cart
// POST /api/cart
router.post('/', addToCart);

// Update cart item quantity
// PUT /api/cart/:id
router.put('/:id', updateCartItem);

// Remove item from cart
// DELETE /api/cart/:id
router.delete('/:id', removeFromCart);

// Clear entire cart
// DELETE /api/cart
router.delete('/', clearCart);

export default router;
