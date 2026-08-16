import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/riderDb.js', () => ({ riderQuery: vi.fn() }));

import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { createRiderJobFromMarketplaceOrder } from '../services/riderDeliveryJobFactory.js';

beforeEach(() => {
  vi.clearAllMocks();
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
        store: {
          name: 'Shop A',
          address: 'Colombo',
          phone: '0110000000',
          pickupAddress: 'Fixed Shop, Colombo',
          pickupLatitude: 6.874321,
          pickupLongitude: 79.912345,
        },
      },
      deliveryAddress: '10 Main Road, Colombo',
      deliveryLatitude: 6.901234,
      deliveryLongitude: 79.934567,
      address: {
        street: 'Main Road',
        city: 'Colombo',
        country: 'Sri Lanka',
        latitude: 6.9,
        longitude: 79.9,
      },
      items: [{ quantity: 1, itemName: 'Brake Pad', itemType: 'PRODUCT' }],
    });
    riderQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 73, status: 'awaiting_dispatch' }] });

    const result = await createRiderJobFromMarketplaceOrder('order-1');

    expect(result).toEqual({ id: 73, status: 'awaiting_dispatch' });
    expect(riderQuery.mock.calls[1][0]).toContain("'awaiting_dispatch'");
    expect(riderQuery.mock.calls[1][1][4]).toBe('Fixed Shop, Colombo');
    expect(riderQuery.mock.calls[1][1][5]).toBe(6.874321);
    expect(riderQuery.mock.calls[1][1][6]).toBe(79.912345);
    expect(riderQuery.mock.calls[1][1][9]).toBe('10 Main Road, Colombo');
    expect(riderQuery.mock.calls[1][1][10]).toBe(6.901234);
    expect(riderQuery.mock.calls[1][1][11]).toBe(79.934567);
  });

  it('does not create a job at zero coordinates when the customer pin is missing', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'order-2',
      orderNumber: 'ORD-2',
      customer: { name: 'Customer', phone: '0770000000' },
      salesman: {
        name: 'Salesman A',
        store: {
          name: 'Shop A',
          pickupLatitude: 6.874321,
          pickupLongitude: 79.912345,
        },
      },
      deliveryLatitude: null,
      deliveryLongitude: null,
      address: { latitude: null, longitude: null },
      items: [],
    });
    riderQuery.mockResolvedValueOnce({ rows: [] });

    const result = await createRiderJobFromMarketplaceOrder('order-2');

    expect(result).toBeNull();
    expect(riderQuery).toHaveBeenCalledTimes(1);
  });
});
