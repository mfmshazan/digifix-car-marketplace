import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/onesignal.js', () => ({
  sendNewOrderNotificationToSalesman: vi.fn().mockResolvedValue(undefined),
  sendOrderStatusToCustomer: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/riderDeliveryJobFactory.js', () => ({
  createRiderJobsForMarketplaceOrders: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../lib/adminWallet.js', () => ({
  getAdminWallet: vi.fn(),
  ensureWallet: vi.fn(),
}));
vi.mock('../lib/riderDb.js', () => ({ riderQuery: vi.fn() }));

import prisma from '../lib/prisma.js';
import { createOrder, getSalesmanOrders } from '../controllers/order.controller.js';

const mockAddress = {
  id: 'address-1',
  street: '10 Main Road',
  city: 'Colombo',
  state: 'Western',
  postalCode: '00100',
  country: 'Sri Lanka',
  latitude: 6.9271,
  longitude: 79.8612,
};

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.user.findUnique.mockResolvedValue(undefined);
  prisma.user.findMany.mockResolvedValue([]);
});

describe('shop order ownership compatibility', () => {
  it('shows a salesman manager-owned and legacy salesman-owned orders', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ managerId: 'manager-1' })
      .mockResolvedValueOnce({ role: 'SHOP_MANAGER', managerId: null });
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'salesman-1' }]);
    prisma.order.findMany.mockResolvedValueOnce([{
      id: 'order-1',
      orderNumber: 'ORD-1',
      status: 'PENDING',
      items: [],
      tracking: [],
    }]);
    prisma.order.count.mockResolvedValueOnce(1);

    const req = {
      user: { id: 'salesman-1', role: 'SALESMAN' },
      query: { page: '1', limit: '20' },
    };
    const res = makeRes();

    await getSalesmanOrders(req, res);

    expect(res._status).toBe(200);
    expect(res._body.data.orders).toHaveLength(1);
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { salesmanId: { in: ['manager-1', 'salesman-1'] } },
    }));
  });

  it('creates a manager-owned order from a legacy salesman-owned product', async () => {
    const product = {
      id: 'product-1',
      name: 'Brake Pad',
      price: 1000,
      discountPrice: null,
      images: [],
      salesmanId: 'salesman-1',
      salesman: {
        id: 'salesman-1',
        name: 'Salesman A',
        role: 'SALESMAN',
        managerId: 'manager-1',
        store: null,
      },
    };
    prisma.address.findFirst.mockResolvedValueOnce(mockAddress);
    prisma.product.findMany.mockResolvedValueOnce([product]);
    prisma.carPart.findMany.mockResolvedValueOnce([]);

    let createdData;
    prisma.$transaction.mockImplementationOnce(async (callback) => callback({
      wallet: { findUnique: vi.fn(), update: vi.fn() },
      walletTransaction: { create: vi.fn() },
      order: {
        create: vi.fn().mockImplementation(async ({ data }) => {
          createdData = data;
          return {
            id: 'order-1',
            ...data,
            createdAt: new Date(),
            salesman: { id: 'manager-1', name: 'Shop A Manager', store: { name: 'Shop A' } },
            items: [{
              id: 'item-1',
              itemType: 'PRODUCT',
              itemName: 'Brake Pad',
              quantity: 1,
              price: 1000,
              total: 1000,
              product: { id: 'product-1', name: 'Brake Pad', images: [] },
              carPart: null,
            }],
          };
        }),
      },
      orderTracking: { create: vi.fn() },
    }));
    prisma.user.findUnique.mockResolvedValueOnce({ role: 'SHOP_MANAGER', managerId: null });
    prisma.user.findMany.mockResolvedValueOnce([{ id: 'salesman-1' }]);

    const req = {
      user: { id: 'customer-1', role: 'CUSTOMER' },
      body: {
        items: [{ productId: 'product-1', quantity: 1 }],
        addressId: 'address-1',
        paymentMethod: 'COD',
      },
      app: { get: vi.fn().mockReturnValue(null) },
    };
    const res = makeRes();

    await createOrder(req, res);

    expect(res._status).toBe(201);
    expect(createdData.salesmanId).toBe('manager-1');
    expect(res._body.data.orders[0].sellerId).toBe('manager-1');
  });
});
