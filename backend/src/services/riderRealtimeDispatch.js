import { URL } from 'url';
import { WebSocketServer } from 'ws';
import { getRiderClient, riderQuery } from '../lib/riderDb.js';
import { verifyRiderAccessToken } from '../lib/riderTokens.js';

export const REQUEST_WINDOW_SECONDS = Number(process.env.DISPATCH_REQUEST_WINDOW_SECONDS || 30);

const ACTIVE_JOB_STATUSES = [
  'assigned',
  'accepted',
  'arrived_at_pickup',
  'picked_up',
  'in_transit',
  'arrived_at_dropoff',
];

const partnerSockets = new Map();
const offerTimers = new Map();

const JOB_DETAIL_SELECT = `SELECT id, order_number, customer_name, customer_phone,
  pickup_address, pickup_latitude, pickup_longitude,
  pickup_contact_name, pickup_contact_phone,
  dropoff_address, dropoff_latitude, dropoff_longitude,
  distance_km, payment_amount, items_description, special_instructions,
  status, assigned_at, accepted_at, created_at
  FROM rider_delivery_jobs
  WHERE id = $1`;

const sendSocketMessage = (socket, message) => {
  try {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
  } catch (error) {
    console.error('Failed to send rider realtime dispatch message:', error);
  }

  return false;
};

const getPartnerSocketSet = (partnerId) => {
  const key = String(partnerId);
  if (!partnerSockets.has(key)) partnerSockets.set(key, new Set());
  return partnerSockets.get(key);
};

const removePartnerSocket = (partnerId, socket) => {
  const sockets = partnerSockets.get(String(partnerId));
  if (!sockets) return;
  sockets.delete(socket);
  if (!sockets.size) partnerSockets.delete(String(partnerId));
};

const emitToPartner = (partnerId, type, data) => {
  const sockets = partnerSockets.get(String(partnerId));
  if (!sockets?.size) return 0;

  let sentCount = 0;
  sockets.forEach((socket) => {
    if (sendSocketMessage(socket, { type, data })) {
      sentCount += 1;
      return;
    }
    removePartnerSocket(partnerId, socket);
  });

  return sentCount;
};

const computeDistanceKm = (fromLatitude, fromLongitude, toLatitude, toLongitude) => {
  const toRadians = (value) => (Number(value) * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(toLatitude) - Number(fromLatitude));
  const dLon = toRadians(Number(toLongitude) - Number(fromLongitude));
  const lat1 = toRadians(fromLatitude);
  const lat2 = toRadians(toLatitude);
  const haversine =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return earthRadiusKm * arc;
};

const clearOfferTimer = (offerId) => {
  const key = String(offerId);
  const timeoutId = offerTimers.get(key);
  if (timeoutId) clearTimeout(timeoutId);
  offerTimers.delete(key);
};

const scheduleOfferTimer = (offerId, expiresAt) => {
  clearOfferTimer(offerId);
  const delay = Math.max(0, new Date(expiresAt).getTime() - Date.now());
  const timeoutId = setTimeout(() => {
    void resolveOffer({ offerId, action: 'expired', reason: 'response_window_elapsed' });
  }, delay);
  offerTimers.set(String(offerId), timeoutId);
};

const formatOfferPayload = (row) => ({
  requestId: row.request_id,
  jobId: row.job_id,
  orderNumber: row.order_number,
  customerName: row.customer_name,
  pickupAddress: row.pickup_address,
  pickupLatitude: Number(row.pickup_latitude),
  pickupLongitude: Number(row.pickup_longitude),
  dropoffAddress: row.dropoff_address,
  dropoffLatitude: Number(row.dropoff_latitude),
  dropoffLongitude: Number(row.dropoff_longitude),
  paymentAmount: Number(row.payment_amount),
  distanceKm: row.distance_km !== null ? Number(row.distance_km) : null,
  distanceToPickupKm: row.distance_to_pickup_km !== null ? Number(row.distance_to_pickup_km) : null,
  vehicleType: row.vehicle_type || '',
  offeredAt: row.offered_at,
  expiresAt: row.expires_at,
  secondsToRespond: Math.max(0, Math.ceil((new Date(row.expires_at).getTime() - Date.now()) / 1000)),
});

const fetchOfferPayload = async (offerId) => {
  const result = await riderQuery(
    `SELECT dro.id AS request_id, dro.job_id, dro.partner_id, dro.distance_to_pickup_km,
            dro.offered_at, dro.expires_at,
            dj.order_number, dj.customer_name,
            dj.pickup_address, dj.pickup_latitude, dj.pickup_longitude,
            dj.dropoff_address, dj.dropoff_latitude, dj.dropoff_longitude,
            dj.distance_km, dj.payment_amount,
            dp.vehicle_type
       FROM rider_delivery_request_offers dro
       JOIN rider_delivery_jobs dj ON dj.id = dro.job_id
       JOIN rider_delivery_partners dp ON dp.id = dro.partner_id
      WHERE dro.id = $1`,
    [offerId]
  );

  return result.rows[0] || null;
};

const sendPendingOfferToPartner = async (offerId) => {
  const offerPayload = await fetchOfferPayload(offerId);
  if (!offerPayload) return;

  const sentCount = emitToPartner(
    offerPayload.partner_id,
    'incoming_order_request',
    formatOfferPayload(offerPayload)
  );

  if (sentCount === 0) {
    await resolveOffer({ offerId, action: 'expired', reason: 'driver_socket_unavailable' });
  }
};

const fetchJobDetails = async (jobId, client = null) => {
  const executor = client || { query: riderQuery };
  const result = await executor.query(JOB_DETAIL_SELECT, [jobId]);
  return result.rows[0] || null;
};

const pickNearestEligiblePartner = async (client, jobId, pickupLatitude, pickupLongitude) => {
  const result = await client.query(
    `SELECT dp.id, dp.vehicle_type, dp.current_latitude, dp.current_longitude
       FROM rider_delivery_partners dp
      WHERE dp.status = 'online'
        AND dp.current_latitude IS NOT NULL
        AND dp.current_longitude IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM rider_delivery_jobs active_job
           WHERE active_job.partner_id = dp.id
             AND active_job.status = ANY($4::text[])
        )
        AND NOT EXISTS (
          SELECT 1 FROM rider_delivery_request_offers pending_offer
           WHERE pending_offer.partner_id = dp.id
             AND pending_offer.offer_status = 'pending'
             AND pending_offer.expires_at > NOW()
        )
        AND NOT EXISTS (
          SELECT 1 FROM rider_delivery_request_offers prior_offer
           WHERE prior_offer.job_id = $3
             AND prior_offer.partner_id = dp.id
        )`,
    [pickupLatitude, pickupLongitude, jobId, ACTIVE_JOB_STATUSES]
  );

  return result.rows
    .map((candidate) => ({
      ...candidate,
      distanceToPickupKm: computeDistanceKm(
        pickupLatitude,
        pickupLongitude,
        Number(candidate.current_latitude),
        Number(candidate.current_longitude)
      ),
    }))
    .sort((left, right) =>
      left.distanceToPickupKm === right.distanceToPickupKm
        ? Number(left.id) - Number(right.id)
        : left.distanceToPickupKm - right.distanceToPickupKm
    )[0] || null;
};

export const dispatchJobToNextEligibleDriver = async (jobId) => {
  const client = await getRiderClient();

  try {
    await client.query('BEGIN');

    const jobResult = await client.query(
      `SELECT id, order_number, pickup_latitude, pickup_longitude, status, partner_id
         FROM rider_delivery_jobs
        WHERE id = $1
        FOR UPDATE`,
      [jobId]
    );

    if (!jobResult.rows.length) {
      await client.query('ROLLBACK');
      return null;
    }

    const job = jobResult.rows[0];
    if (job.status !== 'available' || job.partner_id) {
      await client.query('ROLLBACK');
      return null;
    }

    const activeOfferResult = await client.query(
      `SELECT id
         FROM rider_delivery_request_offers
        WHERE job_id = $1
          AND offer_status = 'pending'
          AND expires_at > NOW()
        LIMIT 1`,
      [jobId]
    );

    if (activeOfferResult.rows.length) {
      await client.query('ROLLBACK');
      return activeOfferResult.rows[0];
    }

    const nextPartner = await pickNearestEligiblePartner(
      client,
      jobId,
      Number(job.pickup_latitude),
      Number(job.pickup_longitude)
    );

    if (!nextPartner) {
      await client.query('COMMIT');
      return null;
    }

    const offerResult = await client.query(
      `INSERT INTO rider_delivery_request_offers (
          job_id, partner_id, offer_status, distance_to_pickup_km, expires_at
       ) VALUES ($1, $2, 'pending', $3, NOW() + ($4 || ' seconds')::interval)
       RETURNING id, expires_at`,
      [jobId, nextPartner.id, nextPartner.distanceToPickupKm.toFixed(3), REQUEST_WINDOW_SECONDS]
    );

    await client.query('COMMIT');

    const offer = offerResult.rows[0];
    scheduleOfferTimer(offer.id, offer.expires_at);
    await sendPendingOfferToPartner(offer.id);
    return offer;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const dispatchAvailableJobs = async () => {
  const result = await riderQuery(
    `SELECT dj.id
       FROM rider_delivery_jobs dj
      WHERE dj.status = 'available'
        AND dj.partner_id IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM rider_delivery_request_offers dro
           WHERE dro.job_id = dj.id
             AND dro.offer_status = 'pending'
             AND dro.expires_at > NOW()
        )
      ORDER BY dj.created_at ASC
      LIMIT 10`
  );

  for (const row of result.rows) {
    try {
      await dispatchJobToNextEligibleDriver(row.id);
    } catch (error) {
      console.error(`Failed to dispatch rider job ${row.id}:`, error);
    }
  }
};

export async function resolveOffer({ offerId, partnerId = null, action, reason = null }) {
  const client = await getRiderClient();

  try {
    await client.query('BEGIN');

    const offerResult = await client.query(
      `SELECT dro.id, dro.job_id, dro.partner_id, dro.offer_status, dro.expires_at,
              dj.status AS job_status, dj.partner_id AS assigned_partner_id
         FROM rider_delivery_request_offers dro
         JOIN rider_delivery_jobs dj ON dj.id = dro.job_id
        WHERE dro.id = $1
        FOR UPDATE`,
      [offerId]
    );

    if (!offerResult.rows.length) {
      await client.query('ROLLBACK');
      return { success: false, message: 'Request offer not found' };
    }

    const offer = offerResult.rows[0];

    if (partnerId !== null && Number(offer.partner_id) !== Number(partnerId)) {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 403, message: 'Unauthorized' };
    }

    if (offer.offer_status !== 'pending') {
      await client.query('ROLLBACK');
      return { success: false, statusCode: 409, message: `Request already ${offer.offer_status}` };
    }

    const isExpired = new Date(offer.expires_at).getTime() <= Date.now();

    if (action === 'accepted') {
      if (isExpired) {
        await client.query(
          `UPDATE rider_delivery_request_offers
              SET offer_status = 'expired',
                  responded_at = NOW(),
                  response_reason = COALESCE(response_reason, 'response_window_elapsed')
            WHERE id = $1`,
          [offerId]
        );
        await client.query('COMMIT');
        clearOfferTimer(offerId);
        emitToPartner(offer.partner_id, 'order_request_resolved', {
          requestId: offer.id,
          jobId: offer.job_id,
          resolution: 'expired',
        });
        await dispatchJobToNextEligibleDriver(offer.job_id);
        return { success: false, statusCode: 409, message: 'Request window expired' };
      }

      if (offer.job_status !== 'available' || offer.assigned_partner_id) {
        await client.query(
          `UPDATE rider_delivery_request_offers
              SET offer_status = 'cancelled',
                  responded_at = NOW(),
                  response_reason = 'job_no_longer_available'
            WHERE id = $1`,
          [offerId]
        );
        await client.query('COMMIT');
        clearOfferTimer(offerId);
        emitToPartner(offer.partner_id, 'order_request_resolved', {
          requestId: offer.id,
          jobId: offer.job_id,
          resolution: 'cancelled',
        });
        return { success: false, statusCode: 409, message: 'Job is no longer available' };
      }

      const activeJobCheck = await client.query(
        `SELECT id
           FROM rider_delivery_jobs
          WHERE partner_id = $1
            AND status = ANY($2::text[])
            AND id <> $3
          LIMIT 1`,
        [offer.partner_id, ACTIVE_JOB_STATUSES, offer.job_id]
      );

      if (activeJobCheck.rows.length) {
        await client.query('ROLLBACK');
        return { success: false, statusCode: 409, message: 'You already have an active delivery' };
      }

      await client.query(
        `UPDATE rider_delivery_request_offers
            SET offer_status = 'accepted',
                responded_at = NOW(),
                response_reason = $2
          WHERE id = $1`,
        [offerId, reason || 'driver_accepted']
      );

      await client.query(
        `UPDATE rider_delivery_jobs
            SET partner_id = $1,
                status = 'assigned',
                assigned_at = COALESCE(assigned_at, NOW())
          WHERE id = $2`,
        [offer.partner_id, offer.job_id]
      );

      await client.query("UPDATE rider_delivery_partners SET status = 'busy' WHERE id = $1", [offer.partner_id]);
      const job = await fetchJobDetails(offer.job_id, client);
      await client.query('COMMIT');

      clearOfferTimer(offerId);
      emitToPartner(offer.partner_id, 'order_request_resolved', {
        requestId: offer.id,
        jobId: offer.job_id,
        resolution: 'accepted',
      });

      return { success: true, data: job };
    }

    const normalizedAction = action === 'declined' ? 'declined' : action === 'cancelled' ? 'cancelled' : 'expired';
    await client.query(
      `UPDATE rider_delivery_request_offers
          SET offer_status = $2,
              responded_at = NOW(),
              response_reason = $3
        WHERE id = $1`,
      [offerId, normalizedAction, reason]
    );

    await client.query('COMMIT');
    clearOfferTimer(offerId);
    emitToPartner(offer.partner_id, 'order_request_resolved', {
      requestId: offer.id,
      jobId: offer.job_id,
      resolution: normalizedAction,
    });
    await dispatchJobToNextEligibleDriver(offer.job_id);

    return {
      success: true,
      data: {
        requestId: offer.id,
        jobId: offer.job_id,
        resolution: normalizedAction,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export const cancelPendingOffersForPartner = async (partnerId, reason = 'partner_unavailable') => {
  const result = await riderQuery(
    `UPDATE rider_delivery_request_offers
        SET offer_status = 'cancelled',
            responded_at = NOW(),
            response_reason = $2
      WHERE partner_id = $1
        AND offer_status = 'pending'
        AND expires_at > NOW()
      RETURNING id, job_id`,
    [partnerId, reason]
  );

  for (const offer of result.rows) {
    clearOfferTimer(offer.id);
    emitToPartner(partnerId, 'order_request_resolved', {
      requestId: offer.id,
      jobId: offer.job_id,
      resolution: 'cancelled',
    });
    await dispatchJobToNextEligibleDriver(offer.job_id);
  }
};

const sendPendingOffersForPartner = async (partnerId) => {
  const result = await riderQuery(
    `SELECT dro.id AS request_id, dro.job_id, dro.partner_id, dro.distance_to_pickup_km,
            dro.offered_at, dro.expires_at,
            dj.order_number, dj.customer_name,
            dj.pickup_address, dj.pickup_latitude, dj.pickup_longitude,
            dj.dropoff_address, dj.dropoff_latitude, dj.dropoff_longitude,
            dj.distance_km, dj.payment_amount,
            dp.vehicle_type
       FROM rider_delivery_request_offers dro
       JOIN rider_delivery_jobs dj ON dj.id = dro.job_id
       JOIN rider_delivery_partners dp ON dp.id = dro.partner_id
      WHERE dro.partner_id = $1
        AND dro.offer_status = 'pending'
        AND dro.expires_at > NOW()
      ORDER BY dro.expires_at DESC`,
    [partnerId]
  );

  result.rows.forEach((row) => {
    emitToPartner(partnerId, 'incoming_order_request', formatOfferPayload(row));
  });
};

const restorePendingOfferTimers = async () => {
  try {
    const result = await riderQuery(
      `SELECT id, expires_at
         FROM rider_delivery_request_offers
        WHERE offer_status = 'pending'`
    );

    for (const row of result.rows) {
      if (new Date(row.expires_at).getTime() <= Date.now()) {
        await resolveOffer({ offerId: row.id, action: 'expired', reason: 'server_recovery_expired_offer' });
        continue;
      }
      scheduleOfferTimer(row.id, row.expires_at);
    }
  } catch (error) {
    console.warn('Rider realtime timers were not restored. Has the Rider Supabase schema been applied?', error.message);
  }
};

export const initializeRiderRealtimeDispatch = async (server) => {
  await restorePendingOfferTimers();

  const webSocketServer = new WebSocketServer({ server, path: '/ws' });

  webSocketServer.on('connection', async (socket, req) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(1008, 'Missing access token');
        return;
      }

      const decoded = verifyRiderAccessToken(token);
      const partnerId = decoded.id;
      getPartnerSocketSet(partnerId).add(socket);

      sendSocketMessage(socket, {
        type: 'realtime_connected',
        data: {
          partnerId,
          requestWindowSeconds: REQUEST_WINDOW_SECONDS,
        },
      });

      await sendPendingOffersForPartner(partnerId);

      socket.on('close', () => removePartnerSocket(partnerId, socket));
    } catch (error) {
      console.error('Rejected rider realtime dispatch socket:', error.message);
      socket.close(1008, 'Unauthorized');
    }
  });
};

