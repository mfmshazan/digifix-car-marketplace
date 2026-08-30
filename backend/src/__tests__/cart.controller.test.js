/**
 * Cart Controller Unit Tests
 *
 * Tests: addToCart, updateCartItem, getCart
 * All Prisma calls are mocked — no DB connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Prisma before importing the controller ──────────────────────────────
vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
import prisma from '../lib/prisma.js';

// ── Import controller functions ───────────────────────────────────────────────
import {
  addToCart,
  updateCartItem,
  getCart,
  removeFromCart,
  clearCart,
} from '../controllers/cart.controller.js';

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
  user: { id: 'user-1' },
  body: {},
  params: {},
  query: {},
  ...overrides,
});

// ── addToCart tests ───────────────────────────────────────────────────────────
describe('addToCart', () => {
  it('returns 400 when productId is missing', async () => {
    const req = makeReq({ body: {} });
    const res = makeRes();
    await addToCart(req, res);
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/product id is required/i);
  });

  it('returns 404 when the product does not exist in DB', async () => {
    prisma.product.findUnique.mockResolvedValueOnce(null);
    const req = makeReq({ body: { productId: 'p-999', itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);
    expect(res._status).toBe(404);
    expect(res._body.success).toBe(false);
  });

  it('returns 400 when the product is inactive', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      id: 'p-1', name: 'Brake Pad', price: 1500, discountPrice: null,
      stock: 10, images: [], isActive: false,
    });
    const req = makeReq({ body: { productId: 'p-1', itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/no longer available/i);
  });

  it('returns 400 when stock is insufficient for requested quantity', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      id: 'p-1', name: 'Brake Pad', price: 1500, discountPrice: null,
      stock: 2, images: [], isActive: true,
    });
    const req = makeReq({ body: { productId: 'p-1', quantity: 5, itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/insufficient stock/i);
    expect(res._body.availableStock).toBe(2);
  });

  it('creates a new cart item and returns 201 on success', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      id: 'p-1', name: 'Brake Pad', price: 1500, discountPrice: 1200,
      stock: 10, images: ['img.jpg'], isActive: true,
    });
    prisma.cartItem.findFirst.mockResolvedValueOnce(null); // not in cart yet
    prisma.cartItem.create.mockResolvedValueOnce({ id: 'ci-1', quantity: 1 });

    const req = makeReq({ body: { productId: 'p-1', quantity: 1, itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);

    expect(res._status).toBe(201);
    expect(res._body.success).toBe(true);
    expect(res._body.data.productId).toBe('p-1');
    expect(res._body.data.price).toBe(1200); // discountPrice wins
    expect(res._body.data.quantity).toBe(1);
  });

  it('increments quantity when item already exists in cart', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      id: 'p-1', name: 'Brake Pad', price: 1500, discountPrice: null,
      stock: 10, images: [], isActive: true,
    });
    prisma.cartItem.findFirst.mockResolvedValueOnce({ id: 'ci-1', quantity: 2 });
    prisma.cartItem.update.mockResolvedValueOnce({ id: 'ci-1', quantity: 3 });

    const req = makeReq({ body: { productId: 'p-1', quantity: 1, itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);

    expect(res._status).toBe(201);
    expect(res._body.data.quantity).toBe(3);
    expect(prisma.cartItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { quantity: 3 } })
    );
  });

  it('returns 400 when adding to existing cart would exceed stock', async () => {
    prisma.product.findUnique.mockResolvedValueOnce({
      id: 'p-1', name: 'Brake Pad', price: 1500, discountPrice: null,
      stock: 3, images: [], isActive: true,
    });
    prisma.cartItem.findFirst.mockResolvedValueOnce({ id: 'ci-1', quantity: 3 });

    const req = makeReq({ body: { productId: 'p-1', quantity: 1, itemType: 'PRODUCT' } });
    const res = makeRes();
    await addToCart(req, res);

    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/stock limit reached/i);
    expect(res._body.currentInCart).toBe(3);
  });
});

// ── updateCartItem tests ──────────────────────────────────────────────────────
describe('updateCartItem', () => {
  it('returns 400 when quantity is less than 1', async () => {
    const req = makeReq({ params: { id: 'ci-1' }, body: { quantity: 0 } });
    const res = makeRes();
    await updateCartItem(req, res);
    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/at least 1/i);
  });

  it('returns 404 when the cart item does not belong to user', async () => {
    prisma.cartItem.findFirst.mockResolvedValueOnce(null);
    const req = makeReq({ params: { id: 'ci-999' }, body: { quantity: 2 } });
    const res = makeRes();
    await updateCartItem(req, res);
    expect(res._status).toBe(404);
  });

  it('returns 400 when new quantity exceeds stock', async () => {
    prisma.cartItem.findFirst.mockResolvedValueOnce({
      id: 'ci-1', itemType: 'PRODUCT', productId: 'p-1', carPartId: null,
    });
    prisma.product.findUnique.mockResolvedValueOnce({ stock: 2 });

    const req = makeReq({ params: { id: 'ci-1' }, body: { quantity: 5 } });
    const res = makeRes();
    await updateCartItem(req, res);

    expect(res._status).toBe(400);
    expect(res._body.availableStock).toBe(2);
  });

  it('returns 200 with updated quantity on success', async () => {
    prisma.cartItem.findFirst.mockResolvedValueOnce({
      id: 'ci-1', itemType: 'PRODUCT', productId: 'p-1', carPartId: null,
    });
    prisma.product.findUnique.mockResolvedValueOnce({ stock: 10 });
    prisma.cartItem.update.mockResolvedValueOnce({ id: 'ci-1', quantity: 4 });

    const req = makeReq({ params: { id: 'ci-1' }, body: { quantity: 4 } });
    const res = makeRes();
    await updateCartItem(req, res);

    expect(res._status).toBe(200);
    expect(res._body.data.quantity).toBe(4);
  });
});

// ── getCart tests ─────────────────────────────────────────────────────────────
describe('getCart', () => {
  it('returns an empty cart with zero totals', async () => {
    prisma.cartItem.findMany.mockResolvedValueOnce([]);
    const req = makeReq();
    const res = makeRes();
    await getCart(req, res);

    expect(res._body.success).toBe(true);
    expect(res._body.data.items).toHaveLength(0);
    expect(res._body.data.subtotal).toBe(0);
    expect(res._body.data.serviceCharge).toBe(0);
    expect(res._body.data.total).toBe(0);
  });

  it('calculates 10% service charge correctly', async () => {
    prisma.cartItem.findMany.mockResolvedValueOnce([
      {
        id: 'ci-1', itemType: 'PRODUCT', productId: 'p-1', carPartId: null,
        quantity: 2, createdAt: new Date(),
        product: {
          id: 'p-1', name: 'Oil Filter', price: 500, discountPrice: null,
          stock: 10, images: ['img.jpg'],
          category: { name: 'Filters' },
          salesman: { id: 's-1', name: 'Ali' },
        },
        carPart: null,
      },
    ]);

    const req = makeReq();
    const res = makeRes();
    await getCart(req, res);

    const data = res._body.data;
    expect(data.subtotal).toBe(1000);              // 500 × 2
    expect(data.serviceCharge).toBe(90.91);         // price − price/1.1 markup, reported only
    expect(data.total).toBe(1000);                  // margin baked into price, not added
    expect(data.itemCount).toBe(2);
  });

  it('normalizes carPart items correctly', async () => {
    prisma.cartItem.findMany.mockResolvedValueOnce([
      {
        id: 'ci-2', itemType: 'CAR_PART', productId: null, carPartId: 'cp-1',
        quantity: 1, createdAt: new Date(),
        product: null,
        carPart: {
          id: 'cp-1', name: 'Timing Belt', price: 2000, discountPrice: 1800,
          stock: 5, images: [],
          category: { name: 'Engine Parts' },
          car: { make: 'Toyota', model: 'Aqua', year: 2015 },
          seller: { id: 's-2', name: 'Reza' },
        },
      },
    ]);

    const req = makeReq();
    const res = makeRes();
    await getCart(req, res);

    const item = res._body.data.items[0];
    expect(item.itemType).toBe('CAR_PART');
    expect(item.price).toBe(2000);
    expect(item.discountPrice).toBe(1800);
    expect(item.carInfo).toMatch(/Toyota Aqua \(2015\)/);
    expect(item.sellerName).toBe('Reza');
    // Total uses discountPrice
    expect(res._body.data.subtotal).toBe(1800);
  });
});
