import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../utils/reviewWorker.js', () => ({ updateReviewAggregates: vi.fn() }));

import prisma from '../lib/prisma.js';
import { createReviews } from '../controllers/review.controller.js';

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
});

const deliveredOrder = {
  id: 'order-1',
  customerId: 'customer-1',
  salesmanId: 'manager-1',
  status: 'DELIVERED',
  items: [{ productId: 'product-1', carPartId: null }],
  riderDeliveryJobs: [{ partnerId: 8 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findUnique.mockResolvedValue(deliveredOrder);
  prisma.review.create.mockImplementation(async ({ data }) => ({ id: 'review-1', ...data }));
});

describe('review target authorization', () => {
  it('stores a rider rating only for the rider assigned to the customer order', async () => {
    const res = makeRes();
    await createReviews({
      user: { id: 'customer-1' },
      body: { orderId: 'order-1', reviews: [{ targetId: '8', targetType: 'DELIVERY_PARTNER', rating: 5 }] },
    }, res);

    expect(res._status).toBe(201);
    expect(prisma.review.create).toHaveBeenCalledTimes(1);
  });

  it('rejects a rating for a rider unrelated to the order', async () => {
    const res = makeRes();
    await createReviews({
      user: { id: 'customer-1' },
      body: { orderId: 'order-1', reviews: [{ targetId: '99', targetType: 'DELIVERY_PARTNER', rating: 1 }] },
    }, res);

    expect(res._status).toBe(403);
    expect(prisma.review.create).not.toHaveBeenCalled();
  });

  it('rejects a customer rating another customer order', async () => {
    const res = makeRes();
    await createReviews({
      user: { id: 'other-customer' },
      body: { orderId: 'order-1', reviews: [{ targetId: '8', targetType: 'DELIVERY_PARTNER', rating: 5 }] },
    }, res);

    expect(res._status).toBe(403);
    expect(prisma.review.create).not.toHaveBeenCalled();
  });
});
