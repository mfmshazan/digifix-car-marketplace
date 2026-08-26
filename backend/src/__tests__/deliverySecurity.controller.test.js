import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';

const client = {
  query: vi.fn(),
  release: vi.fn(),
};

vi.mock('../lib/riderDb.js', () => ({
  getRiderClient: vi.fn(async () => client),
  riderQuery: vi.fn(),
}));
vi.mock('../lib/prisma.js', () => import('./__mocks__/prisma.js'));
vi.mock('../services/riderRealtimeDispatch.js', () => ({
  dispatchAvailableJobs: vi.fn(async () => undefined),
  resolveOffer: vi.fn(),
}));
vi.mock('../services/riderAvailability.js', () => ({
  recordRiderAvailability: vi.fn(async () => undefined),
}));
vi.mock('../lib/shopAccess.js', () => ({
  getShopMemberIds: vi.fn(async () => []),
  resolveShopOwnerId: vi.fn(async (user) => user.id),
}));
vi.mock('../services/roadRoute.js', () => ({
  buildDeliveryRoadRoute: vi.fn(async () => null),
}));
vi.mock('../lib/onesignal.js', () => ({
  sendJobAssignedToRider: vi.fn(async () => undefined),
  sendRiderStatusToCustomer: vi.fn(async () => undefined),
  sendRiderStatusToShop: vi.fn(async () => undefined),
  sendRiderNearbyToCustomer: vi.fn(async () => undefined),
}));

import { riderQuery } from '../lib/riderDb.js';
import prisma from '../lib/prisma.js';
import { recordRiderAvailability } from '../services/riderAvailability.js';
import {
  addRiderJobLocation,
  submitRiderProof,
  updateRiderJobStatus,
} from '../controllers/riderJobs.controller.js';
import { getRiderLiveLocation } from '../controllers/customerTracking.controller.js';
import { authenticateMarketplaceSocket } from '../lib/socketAuth.js';

const makeRes = () => ({
  _status: 200,
  _body: null,
  status(code) { this._status = code; return this; },
  json(body) { this._body = body; return this; },
});

const makeLocationReq = (overrides = {}) => ({
  params: { id: '44' },
  user: { id: 8 },
  body: {
    latitude: 7.2513,
    longitude: 80.3464,
    accuracy: 8,
    speed: 4,
    heading: 90,
    timestamp: Date.now(),
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  delete global.io;
});

describe('rider GPS authorization and lifecycle', () => {
  it('stores latest/history for the assigned rider on an active delivery', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, marketplace_order_id')) {
        return { rows: [{ id: 44, marketplace_order_id: null, status: 'in_transit' }] };
      }
      return { rows: [] };
    });
    const res = makeRes();

    await addRiderJobLocation(makeLocationReq(), res, vi.fn());

    expect(res._status).toBe(200);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "DeliveryTracking"'))).toBe(true);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('UPDATE "Rider"'))).toBe(true);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
  });

  it('rejects an unassigned rider updating another delivery', async () => {
    client.query.mockImplementation(async (sql) =>
      sql.includes('SELECT id, marketplace_order_id') ? { rows: [] } : { rows: [] }
    );
    const res = makeRes();

    await addRiderJobLocation(makeLocationReq(), res, vi.fn());

    expect(res._status).toBe(404);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "DeliveryTracking"'))).toBe(false);
  });

  it('rejects location updates after delivery completion', async () => {
    client.query.mockImplementation(async (sql) =>
      sql.includes('SELECT id, marketplace_order_id')
        ? { rows: [{ id: 44, marketplace_order_id: null, status: 'delivered' }] }
        : { rows: [] }
    );
    const res = makeRes();

    await addRiderJobLocation(makeLocationReq(), res, vi.fn());

    expect(res._status).toBe(409);
    expect(res._body.message).toMatch(/active delivery/i);
  });

  it('rejects malformed telemetry', async () => {
    const req = makeLocationReq();
    req.body.latitude = 200;
    const res = makeRes();

    await addRiderJobLocation(req, res, vi.fn());

    expect(res._status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('broadcasts an accepted GPS update only to the assigned customer room', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, marketplace_order_id')) {
        return { rows: [{ id: 44, marketplace_order_id: 'order-1', status: 'picked_up' }] };
      }
      return { rows: [] };
    });
    riderQuery.mockResolvedValueOnce({ rows: [{ customerId: 'customer-1' }] });
    const emit = vi.fn();
    global.io = { to: vi.fn(() => ({ emit })) };
    const res = makeRes();

    await addRiderJobLocation(makeLocationReq(), res, vi.fn());

    expect(global.io.to).toHaveBeenCalledWith('user:customer-1');
    expect(emit).toHaveBeenCalledWith('riderLocationUpdated', expect.objectContaining({
      orderId: 'order-1',
      deliveryId: 44,
    }));
  });
});

describe('customer tracking object authorization and initial load', () => {
  it('rejects an unrelated customer requesting another order location', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      customerId: 'customer-1',
      salesmanId: 'manager-1',
    });
    const res = makeRes();

    await getRiderLiveLocation({
      params: { orderId: 'order-1' },
      user: { id: 'customer-2', role: 'CUSTOMER' },
    }, res);

    expect(res._status).toBe(403);
    expect(riderQuery).not.toHaveBeenCalled();
  });

  it('loads the latest stored tracking point when the owning customer opens tracking', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'order-1',
      customerId: 'customer-1',
      salesmanId: 'manager-1',
    });
    riderQuery
      .mockResolvedValueOnce({ rows: [{
        id: 44,
        status: 'in_transit',
        partner_id: 8,
        pickup_address: 'Shop',
        pickup_latitude: '7.2',
        pickup_longitude: '80.3',
        dropoff_address: 'Customer',
        dropoff_latitude: '7.3',
        dropoff_longitude: '80.4',
        rider_name: 'Rider',
      }] })
      .mockResolvedValueOnce({ rows: [{
        latitude: '7.2513',
        longitude: '80.3464',
        accuracy: 8,
        recorded_at: new Date('2026-08-26T10:00:00Z'),
      }] });
    const res = makeRes();

    await getRiderLiveLocation({
      params: { orderId: 'order-1' },
      user: { id: 'customer-1', role: 'CUSTOMER' },
    }, res);

    expect(res._status).toBe(200);
    expect(res._body.data.riderLocation).toMatchObject({ latitude: 7.2513, longitude: 80.3464 });
    expect(res._body.data.riderLocation.recordedAt).toEqual(new Date('2026-08-26T10:00:00Z'));
  });
});

describe('proof-gated idempotent completion', () => {
  it('accepts the valid picked_up to in_transit workflow transition', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT status, partner_id')) {
        return { rows: [{ status: 'picked_up', partner_id: 8 }] };
      }
      if (sql.includes('RETURNING id, order_number, status')) {
        return { rows: [{ id: 44, order_number: 'ORD-44', status: 'in_transit' }] };
      }
      if (sql.includes('SELECT marketplace_order_id')) return { rows: [] };
      return { rows: [] };
    });
    const res = makeRes();

    await updateRiderJobStatus({
      params: { id: '44' },
      user: { id: 8 },
      body: { status: 'in_transit', latitude: 7.2, longitude: 80.3 },
    }, res, vi.fn());

    expect(res._status).toBe(200);
    expect(res._body.data.status).toBe('in_transit');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO "DeliveryTracking"'))).toBe(true);
  });

  it('does not allow the generic status endpoint to bypass proof', async () => {
    const res = makeRes();
    await updateRiderJobStatus({
      params: { id: '44' },
      user: { id: 8 },
      body: { status: 'delivered' },
    }, res, vi.fn());

    expect(res._status).toBe(400);
    expect(client.query).not.toHaveBeenCalled();
  });

  it('completes from arrived_at_dropoff and updates rider exactly once', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('proof_photo_url AS photo_url')) {
        return { rows: [{ id: 44, order_number: 'ORD-44', status: 'arrived_at_dropoff', delivered_at: null }] };
      }
      if (sql.includes('RETURNING id, proof_photo_url')) {
        return { rows: [{ id: 44, photo_url: '/uploads/proof.jpg' }] };
      }
      if (sql.includes("SET status = 'delivered'")) {
        return { rows: [{ delivered_at: new Date('2026-08-26T10:00:00Z') }] };
      }
      if (sql.includes('SELECT marketplace_order_id')) return { rows: [{ marketplace_order_id: 'order-1' }] };
      if (sql.includes('SELECT "customerId"')) {
        return { rows: [{ customerId: 'customer-1', salesmanId: 'manager-1', orderNumber: 'ORD-44', status: 'SHIPPED' }] };
      }
      return { rows: [] };
    });
    const emit = vi.fn();
    global.io = { to: vi.fn(() => ({ emit })) };
    const res = makeRes();

    await submitRiderProof({
      params: { id: '44' },
      user: { id: 8 },
      body: { latitude: 7.2, longitude: 80.3 },
      files: [{ fieldname: 'photo', filename: 'proof.jpg' }],
    }, res, vi.fn());

    expect(res._body.data.status).toBe('delivered');
    expect(client.query.mock.calls.filter(([sql]) => sql.includes('total_deliveries = total_deliveries + 1'))).toHaveLength(1);
    expect(recordRiderAvailability).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('orderStatusUpdated', expect.objectContaining({
      orderId: 'order-1',
      status: 'DELIVERED',
    }));
  });

  it('returns an idempotent success for a repeated completion without incrementing stats', async () => {
    client.query.mockImplementation(async (sql) => {
      if (sql.includes('proof_photo_url AS photo_url')) {
        return { rows: [{
          id: 44,
          order_number: 'ORD-44',
          status: 'delivered',
          delivered_at: new Date('2026-08-26T10:00:00Z'),
          photo_url: '/uploads/proof.jpg',
        }] };
      }
      return { rows: [] };
    });
    const res = makeRes();

    await submitRiderProof({
      params: { id: '44' },
      user: { id: 8 },
      body: { latitude: 7.2, longitude: 80.3 },
      files: [{ fieldname: 'photo', filename: 'proof.jpg' }],
    }, res, vi.fn());

    expect(res._status).toBe(200);
    expect(res._body.message).toMatch(/already completed/i);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('total_deliveries'))).toBe(false);
    expect(recordRiderAvailability).not.toHaveBeenCalled();
  });
});

describe('marketplace Socket.IO authentication', () => {
  it('derives room identity from the signed token rather than a client supplied user id', () => {
    process.env.JWT_SECRET = 'socket-test-secret';
    const token = jwt.sign({ userId: 'customer-1', role: 'CUSTOMER' }, process.env.JWT_SECRET);
    const socket = { handshake: { auth: { token }, headers: {} }, data: {} };
    const next = vi.fn();

    authenticateMarketplaceSocket(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.user).toEqual({ id: 'customer-1', role: 'CUSTOMER' });
  });

  it('rejects an unauthenticated subscription connection', () => {
    const socket = { handshake: { auth: {}, headers: {} }, data: {} };
    const next = vi.fn();

    authenticateMarketplaceSocket(socket, next);

    expect(next.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(socket.data.user).toBeUndefined();
  });
});
