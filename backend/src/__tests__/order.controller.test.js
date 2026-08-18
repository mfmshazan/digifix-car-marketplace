/**
 * Order Controller Unit Tests — createOrder
 *
 * Tests: input validation, wallet balance check, service charge calculation,
 *        multi-seller grouping, payment status, delivery fee, and response shape.
 *
 * All external dependencies are mocked — no DB, Stripe, or network calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock all external modules before importing the controller ─────────────────
vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/onesignal.js', () => ({
  sendNewOrderNotificationToSalesman: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/riderDeliveryJobFactory.js', () => ({
  createRiderJobsForMarketplaceOrders: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/adminWallet.js', () => ({
  getAdminWallet: vi.fn(),
  ensureWallet: vi.fn(),
}));

import prisma from '../lib/prisma.js';
import { createOrder, getSalesmanOrders } from '../controllers/order.controller.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
const makeRes = () => {
  const res = {
    _status: 200,
    _body: null,
    status(code) { this._status = code; return this; },
    json(body)   { this._body = body; return this; },
  };
  return res;
};

const makeReq = (overrides = {}) => ({
  user: { id: 'customer-1' },
  headers: {},
  params: {},
  app: { get: vi.fn().mockReturnValue(null) }, // no socket.io
  ...overrides,
  body: {
    items: [],
    paymentMethod: 'COD',
    addressId: 'address-1',
    ...(overrides.body || {}),
  },
});

// ── Reusable fixtures ─────────────────────────────────────────────────────────

/** A single Product returned from the DB */
const mockProduct = {
  id: 'p-1',
  name: 'Brake Pad',
  price: 1000,
  discountPrice: null,
  images: ['img.jpg'],
  salesmanId: 'seller-1',
  salesman: { id: 'seller-1', name: 'Ali', store: { name: "Ali's Store" } },
};

/** A CarPart returned from the DB */
const mockCarPart = {
  id: 'cp-1',
  name: 'Oil Filter',
  price: 500,
  discountPrice: 450,
  images: [],
  sellerId: 'seller-2',
  seller: { id: 'seller-2', name: 'Bob', store: { name: "Bob's Parts" } },
};

/** A created order object returned from the transaction */
const mockCreatedOrder = {
  id: 'ord-1',
  orderNumber: 'ORD-ABC-XY12-1',
  salesmanId: 'seller-1',
  customerId: 'customer-1',
  total: 1100,
  status: 'PENDING',
  createdAt: new Date(),
  updatedAt: new Date(),
  salesman: { id: 'seller-1', name: 'Ali', store: { name: "Ali's Store" } },
  items: [
    {
      id: 'oi-1', itemType: 'PRODUCT', itemName: 'Brake Pad',
      quantity: 1, price: 1000, total: 1000,
      product: { id: 'p-1', name: 'Brake Pad', images: ['img.jpg'] },
      carPart: null,
    },
  ],
};

// ── Test suite ────────────────────────────────────────────────────────────────
describe('createOrder', () => {

  // ── 1. Input validation ───────────────────────────────────────────────────
  describe('input validation', () => {
    it('returns 400 when items array is missing', async () => {
      const req = makeReq({ body: { paymentMethod: 'COD' } });
      const res = makeRes();
      await createOrder(req, res);
      expect(res._status).toBe(400);
      expect(res._body.message).toMatch(/at least one item/i);
    });

    it('returns 400 when items array is empty', async () => {
      const req = makeReq({ body: { items: [], paymentMethod: 'COD' } });
      const res = makeRes();
      await createOrder(req, res);
      expect(res._status).toBe(400);
      expect(res._body.success).toBe(false);
    });

    it('returns 400 when a delivery address is not selected', async () => {
      const req = makeReq({
        body: {
          items: [{ productId: 'p-1', quantity: 1 }],
          paymentMethod: 'COD',
          addressId: null,
        },
      });
      const res = makeRes();
      await createOrder(req, res);
      expect(res._status).toBe(400);
      expect(res._body.message).toMatch(/delivery address/i);
    });
  });

  // ── 2. Item lookup ────────────────────────────────────────────────────────
  describe('item lookup', () => {
    it('returns 400 when no matching product or carPart is found in DB', async () => {
      prisma.product.findMany.mockResolvedValueOnce([]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });

      const req = makeReq({
        body: { items: [{ productId: 'nonexistent', quantity: 1 }], paymentMethod: 'COD' },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(400);
      expect(res._body.message).toMatch(/not found/i);
    });

    it('returns 400 listing the specific missing item IDs', async () => {
      // Only one of two items found
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });

      const req = makeReq({
        body: {
          items: [
            { productId: 'p-1', quantity: 1 },
            { productId: 'ghost-id', quantity: 1 },
          ],
          paymentMethod: 'COD',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(400);
      expect(res._body.message).toContain('ghost-id');
    });
  });

  // ── 3. Wallet payment validation ──────────────────────────────────────────
  describe('wallet payment', () => {
    it('returns 400 when wallet balance is insufficient', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      // Wallet balance 500 < subtotal (1000) + 10% (100) = 1100
      prisma.wallet.findUnique.mockResolvedValueOnce({ id: 'w-1', balance: 500 });

      const req = makeReq({
        body: {
          items: [{ productId: 'p-1', quantity: 1 }],
          paymentMethod: 'WALLET',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(400);
      expect(res._body.message).toMatch(/insufficient wallet balance/i);
    });

    it('proceeds when wallet balance covers the total (transaction called)', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      // Balance 2000 > 1100 (subtotal + 10% service charge)
      prisma.wallet.findUnique.mockResolvedValueOnce({ id: 'w-1', balance: 2000 });
      // $transaction resolves to an array of created orders
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: {
          items: [{ productId: 'p-1', quantity: 1 }],
          paymentMethod: 'WALLET',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(res._status).toBe(201);
    });
  });

  // ── 4. Service charge & totals ────────────────────────────────────────────
  describe('service charge calculation', () => {
    it('applies 10% service charge on subtotal — single seller COD order', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.$transaction.mockImplementationOnce(async (fn) => {
        // Simulate the transaction: just return our mock created order
        const mockTx = {
          wallet: { findUnique: vi.fn(), update: vi.fn() },
          walletTransaction: { create: vi.fn() },
          order: { create: vi.fn().mockResolvedValue(mockCreatedOrder) },
          orderTracking: { create: vi.fn() },
        };
        return fn(mockTx);
      });

      const req = makeReq({
        body: {
          items: [{ productId: 'p-1', quantity: 1 }],
          paymentMethod: 'COD',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(201);
      const data = res._body.data;
      // grandTotal = subtotal (1000) + serviceCharge (100) + deliveryFee (0)
      expect(data.total).toBe(1100);
      expect(data.deliveryFee).toBe(0);
    });

    it('applies delivery fee as 0 when no distance provided', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: { items: [{ productId: 'p-1', quantity: 1 }], paymentMethod: 'COD' },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._body.data.deliveryFee).toBe(0);
    });
  });

  // ── 5. Payment status logic ───────────────────────────────────────────────
  describe('payment status', () => {
    it('sets paymentStatus to PAID for WALLET orders', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.wallet.findUnique.mockResolvedValueOnce({ id: 'w-1', balance: 9999 });
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: { items: [{ productId: 'p-1', quantity: 1 }], paymentMethod: 'WALLET' },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._body.data.paymentStatus).toBe('PAID');
    });

    it('sets paymentStatus to PENDING for COD orders', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: { items: [{ productId: 'p-1', quantity: 1 }], paymentMethod: 'COD' },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._body.data.paymentStatus).toBe('PENDING');
    });
  });

  // ── 6. Multi-seller grouping ──────────────────────────────────────────────
  describe('multi-seller order grouping', () => {
    it('creates one order per seller when items belong to different sellers', async () => {
      // Two products from two different sellers
      const product2 = {
        id: 'p-2', name: 'Wiper Blade', price: 800, discountPrice: null,
        images: [], salesmanId: 'seller-2',
        salesman: { id: 'seller-2', name: 'Bob', store: { name: "Bob's Shop" } },
      };
      prisma.product.findMany.mockResolvedValueOnce([mockProduct, product2]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });

      const order2 = { ...mockCreatedOrder, id: 'ord-2', orderNumber: 'ORD-ABC-XY12-2', salesmanId: 'seller-2' };
      // Transaction returns 2 orders
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder, order2]);

      const req = makeReq({
        body: {
          items: [
            { productId: 'p-1', quantity: 1 },
            { productId: 'p-2', quantity: 1 },
          ],
          paymentMethod: 'COD',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(201);
      expect(res._body.data.orders).toHaveLength(2);
    });
  });

  // ── 7. Mixed item types ───────────────────────────────────────────────────
  describe('mixed product + carPart items', () => {
    it('resolves items from both product and carPart tables', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([mockCarPart]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: {
          items: [
            { productId: 'p-1', quantity: 1 },
            { productId: 'cp-1', quantity: 2 },
          ],
          paymentMethod: 'COD',
        },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(201);
      // Both product + carPart calls were made
      expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.carPart.findMany).toHaveBeenCalledTimes(1);
    });
  });

  // ── 8. Successful response shape ──────────────────────────────────────────
  describe('success response shape', () => {
    it('returns a response with orderNumber, total, deliveryFee, status, and orders array', async () => {
      prisma.product.findMany.mockResolvedValueOnce([mockProduct]);
      prisma.carPart.findMany.mockResolvedValueOnce([]);
      prisma.address.findFirst.mockResolvedValueOnce({ id: 'address-1' });
      prisma.$transaction.mockResolvedValueOnce([mockCreatedOrder]);

      const req = makeReq({
        body: { items: [{ productId: 'p-1', quantity: 1 }], paymentMethod: 'COD' },
      });
      const res = makeRes();
      await createOrder(req, res);

      expect(res._status).toBe(201);
      const data = res._body.data;
      expect(data).toHaveProperty('orderNumber');
      expect(data).toHaveProperty('total');
      expect(data).toHaveProperty('deliveryFee');
      expect(data).toHaveProperty('status', 'PENDING');
      expect(Array.isArray(data.orders)).toBe(true);
    });
  });

  describe('salesman shop visibility', () => {
    it('includes orders for the manager and all salesmen in the shop when loading the sales dashboard', async () => {
      const req = {
        user: { id: 'salesman-1', role: 'SALESMAN' },
        query: { page: '1', limit: '20' },
      };
      const res = makeRes();

      prisma.user.findUnique.mockResolvedValueOnce({ managerId: 'manager-1' });
      prisma.user.findMany.mockResolvedValueOnce([{ id: 'salesman-2' }]);
      prisma.order.findMany.mockResolvedValueOnce([
        { id: 'ord-1', status: 'PENDING', createdAt: new Date(), items: [], customer: { id: 'c-1', name: 'Alice', email: 'a@test.com' }, address: { id: 'a-1' }, tracking: [], salesmanId: 'manager-1' },
        { id: 'ord-2', status: 'PROCESSING', createdAt: new Date(), items: [], customer: { id: 'c-2', name: 'Bob', email: 'b@test.com' }, address: { id: 'a-2' }, tracking: [], salesmanId: 'salesman-2' },
      ]);
      prisma.order.count.mockResolvedValueOnce(2);

      await getSalesmanOrders(req, res);

      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { salesmanId: 'manager-1' },
              { salesmanId: 'salesman-2' },
            ],
          },
        })
      );
      expect(res._status).toBe(200);
      expect(res._body.success).toBe(true);
      expect(res._body.data.orders).toHaveLength(2);
    });
  });
});
