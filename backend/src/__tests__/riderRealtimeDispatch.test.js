import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  connectionHandler: null,
  riderQuery: vi.fn(),
  client: { query: vi.fn(), release: vi.fn() },
}));

vi.mock('ws', () => ({
  WebSocketServer: class {
    on(event, handler) {
      if (event === 'connection') state.connectionHandler = handler;
    }
  },
}));
vi.mock('../lib/riderDb.js', () => ({
  riderQuery: state.riderQuery,
  getRiderClient: vi.fn(async () => state.client),
}));
vi.mock('../lib/riderTokens.js', () => ({
  verifyRiderAccessToken: vi.fn((token) => ({ id: Number(token.replace('rider-', '')) })),
}));
vi.mock('../services/riderAvailability.js', () => ({
  recordRiderAvailability: vi.fn(async () => undefined),
}));
vi.mock('../lib/onesignal.js', () => ({
  sendNewJobOfferToRider: vi.fn(async () => undefined),
  sendJobAssignedToRider: vi.fn(async () => undefined),
}));

import {
  dispatchJobToNextEligibleDriver,
  initializeRiderRealtimeDispatch,
  listEligibleDeliveryPartners,
  resolveOffer,
} from '../services/riderRealtimeDispatch.js';

const makeSocket = () => ({
  OPEN: 1,
  readyState: 1,
  send: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
});

const offerPayload = (offerId, partnerId) => ({
  request_id: offerId,
  job_id: 44,
  partner_id: partnerId,
  distance_to_pickup_km: '0.5',
  seconds_remaining: 30,
  order_number: 'ORD-44',
  customer_name: 'Customer',
  pickup_address: 'Shop',
  pickup_latitude: '7.25',
  pickup_longitude: '80.34',
  dropoff_address: 'Customer address',
  dropoff_latitude: '7.26',
  dropoff_longitude: '80.35',
  payment_amount: '300',
  vehicle_type: 'motorcycle',
});

beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  state.riderQuery.mockResolvedValue({ rows: [] });
  await initializeRiderRealtimeDispatch({});
  await state.connectionHandler(makeSocket(), { url: '/ws?token=rider-8' });
  await state.connectionHandler(makeSocket(), { url: '/ws?token=rider-9' });
  state.riderQuery.mockClear();
});

describe('eligible rider discovery and competing offers', () => {
  it('queries only online idle riders and filters connected riders outside the match radius', async () => {
    state.riderQuery.mockResolvedValueOnce({ rows: [
      {
        id: 8,
        full_name: 'Near Rider',
        current_latitude: 7.251,
        current_longitude: 80.341,
        total_deliveries: 2,
      },
      {
        id: 9,
        full_name: 'Far Rider',
        current_latitude: 6.9,
        current_longitude: 79.8,
        total_deliveries: 1,
      },
    ] });

    const partners = await listEligibleDeliveryPartners({ pickupLatitude: 7.25, pickupLongitude: 80.34 });
    const sql = state.riderQuery.mock.calls[0][0];

    expect(sql).toContain("dp.status = 'online'");
    expect(sql).toContain('active_job.status = ANY');
    expect(partners.map((partner) => partner.id)).toEqual([8]);
  });

  it('sends the delivery offer to multiple nearby online riders', async () => {
    let insertedOffer = 0;
    state.client.query.mockImplementation(async (sql) => {
      if (sql.includes('SELECT id, order_number, pickup_latitude')) {
        return { rows: [{ id: 44, order_number: 'ORD-44', pickup_latitude: 7.25, pickup_longitude: 80.34, status: 'pending', partner_id: null }] };
      }
      if (sql.includes('SELECT dp.id')) {
        return { rows: [
          { id: 8, current_latitude: 7.251, current_longitude: 80.341 },
          { id: 9, current_latitude: 7.252, current_longitude: 80.342 },
        ] };
      }
      if (sql.includes('FROM "DeliveryOffer"') && sql.includes('expires_at > NOW()')) {
        return { rows: [] };
      }
      if (sql.includes('INSERT INTO "DeliveryOffer"')) {
        insertedOffer += 1;
        return { rows: [{ id: 100 + insertedOffer, remaining_ms: 30000 }] };
      }
      return { rows: [] };
    });
    state.riderQuery.mockImplementation(async (_sql, params) => ({
      rows: [offerPayload(params[0], params[0] === 101 ? 8 : 9)],
    }));

    const offer = await dispatchJobToNextEligibleDriver(44);

    expect(offer.id).toBe(101);
    expect(state.client.query.mock.calls.filter(([sql]) => sql.includes('INSERT INTO "DeliveryOffer"'))).toHaveLength(2);
  });
});

describe('atomic offer acceptance', () => {
  it('assigns one rider under row locks and rejects the competing accepted-late offer', async () => {
    let offerLookupCount = 0;
    state.client.query.mockImplementation(async (sql) => {
      if (sql.includes('JOIN "DeliveryJob"') && sql.includes('FOR UPDATE')) {
        offerLookupCount += 1;
        return offerLookupCount === 1
          ? { rows: [{ id: 101, job_id: 44, partner_id: 8, offer_status: 'pending', is_expired: false, job_status: 'available', assigned_partner_id: null }] }
          : { rows: [{ id: 102, job_id: 44, partner_id: 9, offer_status: 'cancelled', is_expired: false, job_status: 'accepted', assigned_partner_id: 8 }] };
      }
      if (sql.includes('SELECT status') && sql.includes('FROM "Rider"')) return { rows: [{ status: 'online' }] };
      if (sql.includes('active delivery') || (sql.includes('FROM "DeliveryJob"') && sql.includes('id <>'))) return { rows: [] };
      if (sql.includes("response_reason = 'another_rider_accepted'")) return { rows: [{ id: 102, partner_id: 9 }] };
      if (sql.includes('SELECT id, order_number, customer_name')) return { rows: [{ id: 44, order_number: 'ORD-44', status: 'accepted' }] };
      return { rows: [] };
    });

    const winner = await resolveOffer({ offerId: 101, partnerId: 8, action: 'accepted' });
    const loser = await resolveOffer({ offerId: 102, partnerId: 9, action: 'accepted' });

    expect(winner.success).toBe(true);
    expect(loser).toMatchObject({ success: false, statusCode: 409 });
    expect(state.client.query.mock.calls.some(([sql]) => sql.includes('FOR UPDATE'))).toBe(true);
    expect(state.client.query.mock.calls.some(([sql]) => sql.includes("another_rider_accepted"))).toBe(true);
  });
});
