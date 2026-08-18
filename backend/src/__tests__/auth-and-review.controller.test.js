import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// ── Mock Dependencies ────────────────────────────────────────────────────────
vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  }
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  }
}));

// Mock Prisma and Review Worker
vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
import prisma from '../lib/prisma.js';

vi.mock('../utils/reviewWorker.js', () => ({
  updateReviewAggregates: vi.fn()
}));
import { updateReviewAggregates } from '../utils/reviewWorker.js';

// ── Import Controllers ───────────────────────────────────────────────────────
import { login } from '../controllers/auth.controller.js';
import { createReviews } from '../controllers/review.controller.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
const makeRes = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res;
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('Auth & Reviews Management System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Ensure prisma.review is mocked since it's not in the shared mock
    prisma.review = {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    };
  });

  describe('Auth Controller - login', () => {
    it('should return 400 if email or password are not provided', async () => {
      const req = { body: { email: 'test@example.com' } };
      const res = makeRes();
      
      await login(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Email and password are required' })
      );
    });

    it('should login successfully for valid customer credentials', async () => {
      const req = { 
        body: { email: 'test@example.com', password: 'Password1!' }, 
        headers: { origin: '' } 
      };
      const res = makeRes();
      
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'user-1', email: 'test@example.com', password: 'hashedpassword', role: 'CUSTOMER'
      });
      bcrypt.compare.mockResolvedValueOnce(true);
      jwt.sign.mockReturnValue('mocked-token');
      
      await login(req, res);
      
      expect(bcrypt.compare).toHaveBeenCalledWith('Password1!', 'hashedpassword');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ 
          success: true, 
          message: 'Login successful',
          data: expect.objectContaining({ token: 'mocked-token' })
        })
      );
    });

    it('should return 401 for invalid credentials', async () => {
      const req = { 
        body: { email: 'wrong@example.com', password: 'WrongPassword' }, 
        headers: { origin: '' } 
      };
      const res = makeRes();
      
      prisma.user.findUnique.mockResolvedValueOnce(null);
      
      await login(req, res);
      
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid email or password' })
      );
    });
  });

  describe('Review Controller - createReviews', () => {
    it('should return 400 if payload is invalid', async () => {
      const req = { body: {}, user: { id: 'user-1' } };
      const res = makeRes();
      
      await createReviews(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Invalid payload' })
      );
    });

    it('should return 403 if user tries to review an order they do not own', async () => {
      const req = { 
        body: { 
          orderId: 'order-1', 
          reviews: [{ targetId: 'product-1', targetType: 'PRODUCT', rating: 5 }] 
        },
        user: { id: 'user-1' } 
      };
      const res = makeRes();
      
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-1', customerId: 'different-user', status: 'DELIVERED'
      });
      
      await createReviews(req, res);
      
      expect(prisma.order.findUnique).toHaveBeenCalledWith({ where: { id: 'order-1' } });
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'You can only review your own orders' })
      );
    });

    it('should create a review successfully and trigger aggregates update', async () => {
       const req = { 
        body: { 
          orderId: 'order-1', 
          reviews: [{ 
            targetId: 'product-1', 
            targetType: 'PRODUCT', 
            rating: 5, 
            comment: 'Great product!' 
          }] 
        },
        user: { id: 'user-1' } 
      };
      const res = makeRes();
      
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-1', customerId: 'user-1', status: 'DELIVERED'
      });

      prisma.review.create.mockResolvedValueOnce({ id: 'review-1' });

      await createReviews(req, res);
      
      expect(prisma.review.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          rating: 5,
          status: 'PUBLISHED',
          comment: 'Great product!'
        })
      }));
      expect(updateReviewAggregates).toHaveBeenCalledWith('product-1', 'PRODUCT');
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should flag a review automatically if it contains profanity', async () => {
       const req = { 
        body: { 
          orderId: 'order-1', 
          reviews: [{ 
            targetId: 'product-1', 
            targetType: 'PRODUCT', 
            rating: 1, 
            comment: 'This product is shit!' 
          }] 
        },
        user: { id: 'user-1' } 
      };
      const res = makeRes();
      
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-1', customerId: 'user-1', status: 'DELIVERED'
      });

      prisma.review.create.mockResolvedValueOnce({ id: 'review-1' });

      await createReviews(req, res);
      
      expect(prisma.review.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          status: 'FLAGGED'
        })
      }));
    });
  });
});
