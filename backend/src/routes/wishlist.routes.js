import express from 'express';
import { getWishlist, toggleWishlist, removeFromWishlist } from '../controllers/wishlist.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All wishlist routes require authentication
router.use(authenticate);

// Get user's wishlist
router.get('/', getWishlist);

// Toggle an item in the wishlist
router.post('/toggle', toggleWishlist);

// Remove an item directly by wishlist ID
router.delete('/:id', removeFromWishlist);

export default router;
