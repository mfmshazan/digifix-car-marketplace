import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/riderDb.js', () => ({ riderQuery: vi.fn() }));

import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { createRiderJobFromMarketplaceOrder } from '../services/riderDeliveryJobFactory.js';

beforeEach(() => {
  vi.clearAllMocks();
  process.env.RIDER_DEFAULT_PICKUP_LATITUDE = '6.9271';
  process.env.RIDER_DEFAULT_PICKUP_LONGITUDE = '79.8612';
  process.env.RIDER_DEFAULT_DROPOFF_LATITUDE = '6.9000';
  process.env.RIDER_DEFAULT_DROPOFF_LONGITUDE = '79.9000';
});

describe('createRiderJobFromMarketplaceOrder', () => {
  it('creates a quiet job that waits for salesman dispatch', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      orderNumber: 'ORD-1',
      deliveryFee: 250,
      serviceCharge: 0,
      notes: null,
      customer: { name: 'Customer', email: 'customer@example.com', phone: '0770000000' },
      salesman: {
        name: 'Salesman A',
        phone: '0710000000',
        store: { name: 'Shop A', address: 'Colombo', phone: '0110000000' },
      },
      address: { street: 'Main Road', city: 'Colombo', country: 'Sri Lanka' },
      items: [{ quantity: 1, itemName: 'Brake Pad', itemType: 'PRODUCT' }],
    });
    riderQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 73, status: 'awaiting_dispatch' }] });

    const result = await createRiderJobFromMarketplaceOrder('order-1');

    expect(result).toEqual({ id: 73, status: 'awaiting_dispatch' });
    expect(riderQuery.mock.calls[1][0]).toContain("'awaiting_dispatch'");
  });
});
