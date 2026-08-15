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
import { createDeliveryRequest } from '../controllers/deliveryRequest.controller.js';

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
    expect(riderQuery.mock.calls.some(([sql]) => sql.includes('INSERT INTO "DeliveryJob"'))).toBe(false);
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
