import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../lib/riderDb.js', () => ({ riderQuery: vi.fn() }));
vi.mock('../lib/shopAccess.js', () => ({
  resolveShopOwnerId: vi.fn().mockResolvedValue('manager-1'),
  getShopMemberIds: vi.fn().mockResolvedValue(['manager-1', 'salesman-1']),
}));
vi.mock('../services/riderRealtimeDispatch.js', () => ({
  dispatchJobToNextEligibleDriver: vi.fn(),
  dispatchJobToSelectedDriver: vi.fn(),
  listEligibleDeliveryPartners: vi.fn(),
  retryJobDispatch: vi.fn(),
}));

import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { dispatchJobToSelectedDriver } from '../services/riderRealtimeDispatch.js';
import {
  createDeliveryRequest,
  getShopPickupLocation,
  updateShopPickupLocation,
} from '../controllers/deliveryRequest.controller.js';

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
});

const order = {
  id: 'order-1',
  orderNumber: 'ORD-1',
  salesmanId: 'salesman-1',
  deliveryFee: 250,
  serviceCharge: 0,
  notes: null,
  deliveryAddress: 'Customer saved address',
  deliveryLatitude: 6.912345,
  deliveryLongitude: 79.923456,
  address: {
    street: '10 Main Road',
    city: 'Colombo',
    country: 'Sri Lanka',
    latitude: 6.9,
    longitude: 79.9,
  },
  customer: { name: 'Customer', phone: '0770000000', email: 'customer@example.com' },
  salesman: {
    id: 'salesman-1',
    name: 'Salesman A',
    phone: '0710000000',
    store: { name: 'Shop A', address: 'Colombo', phone: '0110000000' },
  },
  items: [{ quantity: 1, itemName: 'Brake Pad', itemType: 'PRODUCT' }],
};

const makeReq = () => ({
  user: { id: 'salesman-1', role: 'SALESMAN' },
  body: {
    orderId: 'order-1',
    pickupLatitude: 6.9271,
    pickupLongitude: 79.8612,
    pickupAddress: 'Shop A',
    deliveryLatitude: 6.9,
    deliveryLongitude: 79.9,
    deliveryAddress: 'Customer address',
    paymentType: 'COD',
    partnerId: 8,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  prisma.order.findUnique.mockResolvedValue(order);
  prisma.store.findUnique.mockResolvedValue({
    id: 'store-1',
    name: 'Shop A',
    address: 'Old shop address',
    phone: '0110000000',
    pickupAddress: 'Fixed Shop, Colombo',
    pickupLatitude: 6.874321,
    pickupLongitude: 79.912345,
  });
});

describe('createDeliveryRequest', () => {
  it('reuses an unassigned checkout-created job and dispatches the selected rider', async () => {
    riderQuery
      .mockResolvedValueOnce({ rows: [{ id: 73, status: 'awaiting_dispatch', partner_id: null }] })
      .mockResolvedValueOnce({
        rows: [{
          id: 73,
          order_number: 'ORD-1',
          status: 'awaiting_dispatch',
          partner_id: null,
          marketplace_order_id: 'order-1',
        }],
      });
    dispatchJobToSelectedDriver.mockResolvedValueOnce({
      success: true,
      data: { id: 120, remaining_ms: 30000 },
    });

    const res = makeRes();
    await createDeliveryRequest(makeReq(), res);

    expect(res._status).toBe(200);
    expect(res._body.success).toBe(true);
    expect(dispatchJobToSelectedDriver).toHaveBeenCalledWith(73, 8);
    expect(riderQuery.mock.calls[1][0]).toContain('UPDATE "DeliveryJob"');
    expect(riderQuery.mock.calls[1][1][4]).toBe('Fixed Shop, Colombo');
    expect(riderQuery.mock.calls[1][1][5]).toBe(6.874321);
    expect(riderQuery.mock.calls[1][1][6]).toBe(79.912345);
    expect(riderQuery.mock.calls[1][1][9]).toBe('Customer saved address');
    expect(riderQuery.mock.calls[1][1][10]).toBe(6.912345);
    expect(riderQuery.mock.calls[1][1][11]).toBe(79.923456);
    expect(riderQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO "DeliveryJob"'))).toBe(false);
  });

  it('requires a fixed shop location before dispatching', async () => {
    prisma.store.findUnique.mockResolvedValueOnce({
      id: 'store-1',
      name: 'Shop A',
      address: 'Colombo',
      phone: '0110000000',
      pickupAddress: null,
      pickupLatitude: null,
      pickupLongitude: null,
    });

    const res = makeRes();
    await createDeliveryRequest(makeReq(), res);

    expect(res._status).toBe(409);
    expect(res._body.code).toBe('SHOP_LOCATION_REQUIRED');
    expect(riderQuery).not.toHaveBeenCalled();
  });

  it('does not overwrite a delivery that already has a rider', async () => {
    riderQuery.mockResolvedValueOnce({
      rows: [{ id: 73, status: 'accepted', partner_id: 8 }],
    });

    const res = makeRes();
    await createDeliveryRequest(makeReq(), res);

    expect(res._status).toBe(409);
    expect(res._body.message).toMatch(/no longer available/i);
    expect(dispatchJobToSelectedDriver).not.toHaveBeenCalled();
  });
});

describe('shop pickup location', () => {
  it('returns the fixed location shared by the shop', async () => {
    const res = makeRes();
    await getShopPickupLocation({ user: { id: 'salesman-1', role: 'SALESMAN' } }, res);

    expect(res._body.success).toBe(true);
    expect(res._body.data).toMatchObject({
      configured: true,
      address: 'Fixed Shop, Colombo',
      latitude: 6.874321,
      longitude: 79.912345,
    });
  });

  it('updates the shop owner location for a salesman', async () => {
    prisma.store.update.mockResolvedValueOnce({
      name: 'Shop A',
      address: 'Old shop address',
      pickupAddress: 'New fixed shop',
      pickupLatitude: 6.91,
      pickupLongitude: 79.87,
    });
    const req = {
      user: { id: 'salesman-1', role: 'SALESMAN' },
      body: { latitude: 6.91, longitude: 79.87, address: 'New fixed shop' },
    };
    const res = makeRes();

    await updateShopPickupLocation(req, res);

    expect(res._body.success).toBe(true);
    expect(prisma.store.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: 'manager-1' },
      data: {
        pickupLatitude: 6.91,
        pickupLongitude: 79.87,
        pickupAddress: 'New fixed shop',
      },
    }));
  });
});
