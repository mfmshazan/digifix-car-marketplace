import { getRiderClient, riderQuery } from '../lib/riderDb.js';
import { dispatchAvailableJobs, resolveOffer } from '../services/riderRealtimeDispatch.js';
import { isFloatInRange, validationError } from '../utils/riderValidation.js';
import { recordRiderAvailability } from '../services/riderAvailability.js';
import { getShopMemberIds } from '../lib/shopAccess.js';
import { creditDriverDeliveryFee } from '../services/driverEarnings.service.js';
import {
  sendJobAssignedToRider,
  sendRiderStatusToCustomer,
  sendRiderStatusToShop,
  sendRiderNearbyToCustomer,
} from '../lib/onesignal.js';

const ACTIVE_JOB_STATUSES = ['assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff'];

// "Rider is nearby" push tuning: how close (km) counts as nearby, and a guard so
// each job only fires the push once (in-memory; resets on restart, which is fine).
const RIDER_NEARBY_KM = Number(process.env.RIDER_NEARBY_KM || 0.5);
const nearbyNotifiedJobs = new Set();

const distanceKmBetween = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(Number(lat2) - Number(lat1));
  const dLon = toRad(Number(lon2) - Number(lon1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const formatRiderJob = (job, riderLocation = null) => {
  if (!job) return null;

  return {
    ...job,
    pickupLatitude: job.pickup_latitude !== null ? Number(job.pickup_latitude) : null,
    pickupLongitude: job.pickup_longitude !== null ? Number(job.pickup_longitude) : null,
    dropoffLatitude: job.dropoff_latitude !== null ? Number(job.dropoff_latitude) : null,
    dropoffLongitude: job.dropoff_longitude !== null ? Number(job.dropoff_longitude) : null,
    distanceKm: job.distance_km !== null ? Number(job.distance_km) : null,
    paymentAmount: job.payment_amount !== null ? Number(job.payment_amount) : null,
    riderLocation,
    route: {
      pickup: {
        latitude: job.pickup_latitude !== null ? Number(job.pickup_latitude) : null,
        longitude: job.pickup_longitude !== null ? Number(job.pickup_longitude) : null,
        address: job.pickup_address,
      },
      dropoff: {
        latitude: job.dropoff_latitude !== null ? Number(job.dropoff_latitude) : null,
        longitude: job.dropoff_longitude !== null ? Number(job.dropoff_longitude) : null,
        address: job.dropoff_address,
      },
    },
  };
};

export const getAvailableRiderJobs = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT id, order_number, customer_name, customer_phone,
              pickup_address, pickup_latitude, pickup_longitude,
              dropoff_address, dropoff_latitude, dropoff_longitude,
              distance_km, payment_amount, items_description, special_instructions,
              status, created_at
         FROM "DeliveryJob"
        WHERE status = 'available'
          AND NOT EXISTS (
            SELECT 1
              FROM "DeliveryOffer" dro
             WHERE dro.job_id = "DeliveryJob".id
               AND dro.offer_status = 'pending'
               AND dro.expires_at > NOW()
          )
        ORDER BY created_at DESC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

export const getActiveRiderJob = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT dj.id, dj.order_number, dj.customer_name, dj.customer_phone,
              dj.pickup_address, dj.pickup_latitude, dj.pickup_longitude,
              dj.pickup_contact_name, dj.pickup_contact_phone,
              dj.dropoff_address, dj.dropoff_latitude, dj.dropoff_longitude,
              dj.distance_km, dj.payment_amount, dj.items_description, dj.special_instructions,
              dj.status, dj.assigned_at, dj.accepted_at, dj.picked_up_at, dj.created_at,
              rider.current_latitude, rider.current_longitude
         FROM "DeliveryJob" dj
         LEFT JOIN "Rider" rider ON rider.id = dj.partner_id
        WHERE dj.partner_id = $1
          AND dj.status IN ('assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff')
        ORDER BY dj.assigned_at DESC

        LIMIT 1`,
      [req.user.id]
    );

    const job = result.rows[0] || null;
    if (!job) {
      return res.json({ success: true, data: null });
    }

    const trackingResult = await riderQuery(
      `SELECT latitude, longitude, accuracy, speed, heading, recorded_at
         FROM "DeliveryTracking"
        WHERE job_id = $1 AND partner_id = $2
        ORDER BY recorded_at DESC
        LIMIT 1`,
      [job.id, req.user.id]
    );

    const trackingPoint = trackingResult.rows[0];
    const riderLocation = trackingPoint
      ? {
        latitude: Number(trackingPoint.latitude),
        longitude: Number(trackingPoint.longitude),
        accuracy: trackingPoint.accuracy !== null ? Number(trackingPoint.accuracy) : null,
        speed: trackingPoint.speed !== null ? Number(trackingPoint.speed) : null,
        heading: trackingPoint.heading !== null ? Number(trackingPoint.heading) : null,
        recordedAt: trackingPoint.recorded_at,
      }
      : job.current_latitude !== null && job.current_longitude !== null
        ? {
          latitude: Number(job.current_latitude),
          longitude: Number(job.current_longitude),
          accuracy: null,
          speed: null,
          heading: null,
          recordedAt: null,
        }
        : null;

    return res.json({ success: true, data: formatRiderJob(job, riderLocation) });
  } catch (error) {
    return next(error);
  }
};

export const getAssignedRiderJobs = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT id, order_number, customer_name, customer_phone,
              pickup_address, pickup_latitude, pickup_longitude,
              pickup_contact_name, pickup_contact_phone,
              dropoff_address, dropoff_latitude, dropoff_longitude,
              distance_km, payment_amount, items_description, special_instructions,
              status, assigned_at, accepted_at, created_at
         FROM "DeliveryJob"
        WHERE partner_id = $1 AND status IN ('assigned', 'accepted')
        ORDER BY assigned_at DESC NULLS LAST, created_at DESC`,
      [req.user.id]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

export const getRiderJobHistory = async (req, res, next) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 20;
    const offset = Number.parseInt(req.query.offset, 10) || 0;

    const result = await riderQuery(
      `SELECT dj.id, dj.order_number, dj.customer_name,
              dj.pickup_address, dj.dropoff_address,
              dj.distance_km, dj.payment_amount,
              dj.status, dj.assigned_at, dj.picked_up_at, dj.delivered_at,
              dj.proof_photo_url AS photo_url, dj.proof_signature_data AS signature_data, 
              dj.proof_recipient_name AS recipient_name,
              dj.proof_notes AS notes, dj.proof_created_at AS proof_submitted_at
         FROM "DeliveryJob" dj
        WHERE dj.partner_id = $1 AND dj.status IN ('delivered', 'cancelled')
        ORDER BY dj.delivered_at DESC NULLS LAST, dj.proof_created_at DESC NULLS LAST
        LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

export const acceptRiderRequestOffer = async (req, res, next) => {
  try {
    const result = await resolveOffer({
      offerId: Number.parseInt(req.params.offerId, 10),
      partnerId: req.user.id,
      action: 'accepted',
      reason: 'driver_accepted_request',
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: 'Incoming request accepted successfully',
      data: formatRiderJob(result.data),
    });
  } catch (error) {
    return next(error);
  }
};

export const declineRiderRequestOffer = async (req, res, next) => {
  try {
    const result = await resolveOffer({
      offerId: Number.parseInt(req.params.offerId, 10),
      partnerId: req.user.id,
      action: 'declined',
      reason: req.body.reason || 'driver_declined_request',
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: 'Incoming request declined successfully', data: result.data });
  } catch (error) {
    return next(error);
  }
};

export const expireRiderRequestOffer = async (req, res, next) => {
  try {
    const result = await resolveOffer({
      offerId: Number.parseInt(req.params.offerId, 10),
      partnerId: req.user.id,
      action: 'expired',
      reason: 'driver_timer_elapsed',
    });

    if (!result.success) {
      return res.status(result.statusCode || 400).json({ success: false, message: result.message });
    }

    return res.json({ success: true, message: 'Incoming request expired successfully', data: result.data });
  } catch (error) {
    return next(error);
  }
};

export const acceptRiderJob = async (req, res, next) => {
  const client = await getRiderClient();

  try {
    await client.query('BEGIN');
    const jobId = Number.parseInt(req.params.id, 10);

    const pendingOfferCheck = await client.query(
      `SELECT id FROM "DeliveryOffer"
        WHERE job_id = $1 AND offer_status = 'pending' AND expires_at > NOW()
        LIMIT 1`,
      [jobId]
    );

    if (pendingOfferCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This job is already being offered to another driver' });
    }

    const partnerStatusCheck = await client.query('SELECT status FROM "Rider" WHERE id = $1', [req.user.id]);

    if (partnerStatusCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    if (partnerStatusCheck.rows[0].status !== 'online') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You must be online to accept a job' });
    }

    const activeJobCheck = await client.query(
      `SELECT id FROM "DeliveryJob"
        WHERE partner_id = $1 AND status = ANY($2::text[])`,
      [req.user.id, ACTIVE_JOB_STATUSES]
    );

    if (activeJobCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You already have an active delivery' });
    }

    const result = await client.query(
      `UPDATE "DeliveryJob"
          SET partner_id = $1, status = 'assigned', assigned_at = NOW()
        WHERE id = $2 AND status = 'available'
        RETURNING id, order_number, customer_name, customer_phone,
                  pickup_address, pickup_latitude, pickup_longitude,
                  pickup_contact_name, pickup_contact_phone,
                  dropoff_address, dropoff_latitude, dropoff_longitude,
                  distance_km, payment_amount, items_description, special_instructions,
                  status, assigned_at`,
      [req.user.id, jobId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'Job is no longer available' });
    }

    await client.query(`UPDATE "Rider" SET status = 'busy' WHERE id = $1`, [req.user.id]);
    await client.query('COMMIT');
    await recordRiderAvailability(
      { query: riderQuery },
      req.user.id,
      'busy',
      'delivery_accepted'
    );

    // 🔔 Confirm the assignment + pickup address to the rider. Fire-and-forget.
    sendJobAssignedToRider({
      riderId: req.user.id,
      jobId,
      orderNumber: result.rows[0]?.order_number,
      pickupAddress: result.rows[0]?.pickup_address,
    }).catch((error) => console.error('Rider assigned push failed:', error.message));

    return res.json({
      success: true,
      message: 'Job accepted successfully',
      data: formatRiderJob(result.rows[0]),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

export const rejectRiderAssignedJob = async (req, res, next) => {
  const client = await getRiderClient();

  try {
    await client.query('BEGIN');
    const jobId = Number.parseInt(req.params.id, 10);
    const rejectionCheck = await client.query('SELECT id, status, partner_id FROM "DeliveryJob" WHERE id = $1', [jobId]);

    if (rejectionCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const job = rejectionCheck.rows[0];

    if (Number(job.partner_id) !== Number(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!['assigned', 'accepted'].includes(job.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Only assigned deliveries can be rejected' });
    }

    const result = await client.query(
      `UPDATE "DeliveryJob"
          SET partner_id = NULL, status = 'available', assigned_at = NULL, accepted_at = NULL
        WHERE id = $1
        RETURNING id, order_number, status`,
      [jobId]
    );

    await client.query(`UPDATE "Rider" SET status = 'online' WHERE id = $1 AND status = 'busy'`, [req.user.id]);
    await client.query('COMMIT');
    await recordRiderAvailability(
      { query: riderQuery },
      req.user.id,
      'online',
      'delivery_rejected'
    );
    await dispatchAvailableJobs();

    return res.json({ success: true, message: 'Assigned delivery rejected successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

// ─── Sync Marketplace Order Status ──────────────────────────────────────────
// Maps rider's internal delivery steps to the simplified 5-step user-facing flow:
// PENDING → CONFIRMED → PROCESSING → SHIPPED → DELIVERED
//
// All rider delivery steps (arrived_at_pickup, picked_up, in_transit, etc.)
// appear as SHIPPED to the customer and salesman so the UI is clean and simple.
// The exact rider step is still stored in OrderTracking for full audit history.
const syncMarketplaceOrderStatus = async (client, jobId, riderStatus) => {
  // Rider step → user-facing order status mapping.
  //
  // IMPORTANT: pickup and the steps after it (picked_up, in_transit,
  // arrived_at_dropoff) deliberately do NOT auto-advance the order. After the
  // rider collects the package the order stays PROCESSING and the seller/manager
  // manually marks it SHIPPED (gated on pickup in updateOrderStatus). Only the
  // terminal steps move the order on their own.
  const userFacingStatusMap = {
    accepted: 'PROCESSING', // Rider accepted & heading to shop → still being prepared
    arrived_at_pickup: 'PROCESSING', // Rider at shop collecting → PROCESSING
    delivered: 'DELIVERED',  // Final step
    failed: 'FAILED',
  };

  // Friendly description for the order timeline
  const riderStatusDescriptions = {
    accepted: 'Rider has accepted your delivery',
    arrived_at_pickup: 'Rider arrived at the shop',
    picked_up: 'Package collected by rider',
    in_transit: 'Package is on its way to you',
    arrived_at_dropoff: 'Rider has arrived at your location',
    delivered: 'Package delivered successfully',
    failed: 'Delivery attempt failed',
  };

  const jobResult = await client.query(
    'SELECT marketplace_order_id FROM "DeliveryJob" WHERE id = $1 AND marketplace_order_id IS NOT NULL',
    [jobId]
  );

  const marketplaceOrderId = jobResult.rows[0]?.marketplace_order_id;
  if (!marketplaceOrderId) return;

  // Fetch customer + salesman IDs and the current status so we can target socket
  // rooms and avoid downgrading a status the seller already advanced.
  const orderResult = await client.query(
    'SELECT "customerId", "salesmanId", "orderNumber", status FROM "Order" WHERE id = $1',
    [marketplaceOrderId]
  );
  const orderRow = orderResult.rows[0];
  if (!orderRow) return;

  const mappedStatus = userFacingStatusMap[riderStatus];
  let effectiveStatus = orderRow.status;

  // Move the order only when there is a mapped status, and never downgrade a
  // manual SHIPPED back to PROCESSING (the seller already shipped it).
  if (mappedStatus && mappedStatus !== orderRow.status) {
    const isDowngrade = mappedStatus === 'PROCESSING' && orderRow.status === 'SHIPPED';
    if (!isDowngrade) {
      await client.query(
        'UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2',
        [mappedStatus, marketplaceOrderId]
      );
      effectiveStatus = mappedStatus;
    }
  }

  // Always log the detailed rider step in the tracking timeline.
  const description = riderStatusDescriptions[riderStatus] || `Delivery update: ${riderStatus}`;
  await client.query(
    'INSERT INTO "OrderTracking" (id, status, description, "orderId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())',
    [effectiveStatus, description, marketplaceOrderId]
  );

  // 🔌 Emit real-time socket update so the customer + the whole shop (manager &
  // salesmen) update instantly. `readyToShip` tells the seller/manager dashboard
  // that the rider has the package and the order can now be marked SHIPPED.
  if (global.io) {
    const payload = {
      orderId: marketplaceOrderId,
      status: effectiveStatus,
      riderStep: riderStatus,            // Detailed rider step (for tracking + ship gating)
      readyToShip: riderStatus === 'picked_up',
      description,
      updatedAt: new Date().toISOString(),
    };
    global.io.to(`user:${orderRow.customerId}`).emit('orderStatusUpdated', payload);

    const shopMemberIds = await getShopMemberIds(orderRow.salesmanId);
    for (const memberId of shopMemberIds) {
      global.io.to(`user:${memberId}`).emit('orderStatusUpdated', payload);
    }

    // 🔔 Push the rider's progress: the full journey to the customer, and the
    // pickup-relevant steps to the shop. Non-blocking — never delays the txn.
    sendRiderStatusToCustomer({
      customerId: orderRow.customerId,
      orderId: marketplaceOrderId,
      orderNumber: orderRow.orderNumber,
      riderStep: riderStatus,
    }).catch((error) => console.error('Rider status customer push failed:', error.message));

    sendRiderStatusToShop({
      shopMemberIds,
      orderId: marketplaceOrderId,
      orderNumber: orderRow.orderNumber,
      riderStep: riderStatus,
    }).catch((error) => console.error('Rider status shop push failed:', error.message));
  }
};

export const updateRiderJobStatus = async (req, res, next) => {
  const client = await getRiderClient();

  try {
    const allowedStatuses = ['accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff', 'delivered', 'failed'];
    const { status, reason, latitude, longitude } = req.body;

    if (!allowedStatuses.includes(status)) {
      return validationError(res, 'Invalid status update');
    }

    const jobId = Number.parseInt(req.params.id, 10);
    await client.query('BEGIN');

    const currentJobRes = await client.query('SELECT status, partner_id FROM "DeliveryJob" WHERE id = $1', [jobId]);

    if (currentJobRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    const currentStatus = currentJobRes.rows[0].status;
    const jobPartnerId = currentJobRes.rows[0].partner_id;

    if (Number(jobPartnerId) !== Number(req.user.id)) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const transitions = {
      assigned: ['accepted', 'failed'],
      accepted: ['arrived_at_pickup', 'failed'],
      arrived_at_pickup: ['picked_up', 'failed'],
      picked_up: ['in_transit', 'failed'],
      in_transit: ['arrived_at_dropoff', 'failed'],
      arrived_at_dropoff: ['delivered', 'failed'],
    };

    if (status !== 'failed' && (!transitions[currentStatus] || !transitions[currentStatus].includes(status))) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Invalid transition from ${currentStatus} to ${status}` });
    }

    const timestampMap = {
      accepted: 'accepted_at',
      arrived_at_pickup: 'arrived_at_pickup_at',
      picked_up: 'picked_up_at',
      arrived_at_dropoff: 'arrived_at_dropoff_at',
      delivered: 'delivered_at',
      failed: 'failed_at',
    };
    const timestampField = timestampMap[status];
    const timestampSQL = timestampField ? `, ${timestampField} = NOW()` : '';

    const updateResult = await client.query(
      `UPDATE "DeliveryJob"
          SET status = $1 ${timestampSQL}
        WHERE id = $2
        RETURNING id, order_number, status`,
      [status, jobId]
    );

    if (isFloatInRange(latitude, -90, 90) && isFloatInRange(longitude, -180, 180)) {
      await client.query(
        `UPDATE "Rider"
            SET current_latitude = $1,
                current_longitude = $2
          WHERE id = $3`,
        [latitude, longitude, req.user.id]
      );

      await client.query(
        `INSERT INTO "DeliveryTracking" (job_id, partner_id, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [jobId, req.user.id, latitude, longitude]
      );
    }

    if (status === 'delivered' || status === 'failed') {
      await client.query(
        `UPDATE "Rider" SET status = 'online', total_deliveries = total_deliveries + (CASE WHEN $2 = 'delivered' THEN 1 ELSE 0 END) WHERE id = $1`,
        [req.user.id, status]
      );
    }

    await syncMarketplaceOrderStatus(client, jobId, status);
    if (status === 'delivered') {
      await creditDriverDeliveryFee(client, jobId);
    }
    await client.query('COMMIT');
    if (status === 'delivered' || status === 'failed') {
      await recordRiderAvailability(
        { query: riderQuery },
        req.user.id,
        'online',
        status === 'delivered' ? 'delivery_completed' : 'delivery_failed'
      );
    }

    if (status === 'failed') await dispatchAvailableJobs();

    return res.json({ success: true, message: `Job status updated to ${status}`, data: updateResult.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

export const addRiderJobLocation = async (req, res, next) => {
  try {
    const jobId = Number.parseInt(req.params.id, 10);
    const { latitude, longitude, accuracy, speed, heading } = req.body;

    if (!isFloatInRange(latitude, -90, 90) || !isFloatInRange(longitude, -180, 180)) {
      return validationError(res, 'Invalid location data');
    }

    const jobCheck = await riderQuery(
      `SELECT id, marketplace_order_id, status, order_number,
              dropoff_latitude, dropoff_longitude
         FROM "DeliveryJob"
        WHERE id = $1
          AND partner_id = $2`,
      [jobId, req.user.id]
    );

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or not assigned to you' });
    }

    await riderQuery(
      `INSERT INTO "DeliveryTracking" (job_id, partner_id, latitude, longitude, accuracy, speed, heading)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [jobId, req.user.id, latitude, longitude, accuracy || null, speed || null, heading || null]
    );

    await riderQuery(
      `UPDATE "Rider"
          SET current_latitude = $1,
              current_longitude = $2
        WHERE id = $3`,
      [latitude, longitude, req.user.id]
    );

    const marketplaceOrderId = jobCheck.rows[0].marketplace_order_id;

    if (marketplaceOrderId && global.io) {
      const orderResult = await riderQuery(
        `SELECT "customerId"
           FROM "Order"
          WHERE id = $1`,
        [marketplaceOrderId]
      );
      const customerId = orderResult.rows[0]?.customerId;

      if (customerId) {
        global.io.to(`user:${customerId}`).emit('riderLocationUpdated', {
          orderId: marketplaceOrderId,
          deliveryId: jobId,
          status: jobCheck.rows[0].status,
          riderId: req.user.id,
          location: {
            latitude: Number(latitude),
            longitude: Number(longitude),
            accuracy: accuracy === undefined || accuracy === null ? null : Number(accuracy),
            speed: speed === undefined || speed === null ? null : Number(speed),
            heading: heading === undefined || heading === null ? null : Number(heading),
            recordedAt: new Date().toISOString(),
          },
        });

        // 🔔 One-time "your rider is nearby" push once the rider comes within
        // RIDER_NEARBY_KM of the drop-off. Guarded so it only fires once per job.
        const { dropoff_latitude: dLat, dropoff_longitude: dLng } = jobCheck.rows[0];
        if (dLat != null && dLng != null && !nearbyNotifiedJobs.has(jobId)) {
          const km = distanceKmBetween(latitude, longitude, dLat, dLng);
          if (km <= RIDER_NEARBY_KM) {
            nearbyNotifiedJobs.add(jobId);
            sendRiderNearbyToCustomer({
              customerId,
              orderId: marketplaceOrderId,
              orderNumber: jobCheck.rows[0].order_number,
            }).catch((error) => console.error('Rider nearby push failed:', error.message));
          }
        }
      }
    }

    return res.json({ success: true, message: 'Location tracked successfully' });
  } catch (error) {
    return next(error);
  }
};

export const submitRiderProof = async (req, res, next) => {
  const client = await getRiderClient();

  try {
    const jobId = Number.parseInt(req.params.id, 10);
    if (!Number.isInteger(jobId)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery job id' });
    }

    const body = req.body || {};
    const files = Array.isArray(req.files) ? req.files : [];
    const findUploadedFileUrl = (fieldNames) => {
      const match = files.find((file) => fieldNames.includes(file.fieldname));
      const file = match || files[0];
      return file?.filename ? `/uploads/${file.filename}` : null;
    };

    const photoUrl =
      body.photoUrl ||
      body.photo_url ||
      body.photo ||
      body.deliveryPhoto ||
      body.delivery_photo ||
      body.proofImage ||
      body.proof_image ||
      body.image ||
      findUploadedFileUrl([
        'photo',
        'photoUrl',
        'photo_url',
        'deliveryPhoto',
        'delivery_photo',
        'proof',
        'proofImage',
        'proof_image',
        'image',
      ]) ||
      null;
    const signatureData =
      body.signatureData ||
      body.signature_data ||
      body.signature ||
      findUploadedFileUrl(['signature', 'signatureData', 'signature_data']) ||
      null;
    const recipientName = body.recipientName || body.recipient_name || body.receiverName || body.receiver_name || null;
    const notes = body.notes || body.note || null;
    const latitude = body.latitude ?? body.deliveryLatitude ?? body.delivery_latitude ?? null;
    const longitude = body.longitude ?? body.deliveryLongitude ?? body.delivery_longitude ?? null;
    const proofNotes = notes || null;

    if (!photoUrl && !signatureData) {
      return res.status(400).json({
        success: false,
        message: 'A delivery photo or customer signature is required',
      });
    }

    await client.query('BEGIN');

    const jobCheck = await client.query(
      'SELECT id, order_number, status, delivered_at FROM "DeliveryJob" WHERE id = $1 AND partner_id = $2',
      [jobId, req.user.id]
    );

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Job not found or not assigned to you' });
    }

    const job = jobCheck.rows[0];
    if (!['assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff', 'delivered'].includes(job.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Proof can only be submitted when the delivery is ready to complete' });
    }

    const proofResult = await client.query(
      `UPDATE "DeliveryJob"
          SET proof_photo_url = COALESCE($1, proof_photo_url),
              proof_signature_data = COALESCE($2, proof_signature_data),
              proof_recipient_name = COALESCE($3, proof_recipient_name),
              proof_notes = COALESCE($4, proof_notes),
              proof_delivery_latitude = COALESCE($5, proof_delivery_latitude),
              proof_delivery_longitude = COALESCE($6, proof_delivery_longitude),
              proof_created_at = NOW()
        WHERE id = $7 AND partner_id = $8
        RETURNING id, proof_photo_url AS photo_url, proof_signature_data AS signature_data, 
                  proof_recipient_name AS recipient_name, proof_notes AS notes, proof_created_at AS created_at`,
      [photoUrl, signatureData, recipientName, proofNotes, latitude || null, longitude || null, jobId, req.user.id]
    );

    let deliveredAt = job.delivered_at;

    if (job.status !== 'delivered') {
      const deliveryResult = await client.query(
        `UPDATE "DeliveryJob" SET status = 'delivered', delivered_at = NOW() WHERE id = $1 RETURNING delivered_at`,
        [jobId]
      );
      deliveredAt = deliveryResult.rows[0]?.delivered_at ?? null;

      await client.query(
        `UPDATE "Rider" SET status = 'online', total_deliveries = total_deliveries + 1 WHERE id = $1`,
        [req.user.id]
      );

      await syncMarketplaceOrderStatus(client, jobId, 'delivered');
      await creditDriverDeliveryFee(client, jobId);
    }

    await client.query('COMMIT');
    if (job.status !== 'delivered') {
      await recordRiderAvailability(
        { query: riderQuery },
        req.user.id,
        'online',
        'delivery_completed'
      );
    }
    dispatchAvailableJobs().catch((error) => {
      console.error('Failed to dispatch available jobs after proof submission:', error);
    });

    return res.json({
      success: true,
      message: 'Delivery completed and proof archived successfully',
      data: {
        id: jobId,
        orderNumber: job.order_number,
        status: 'delivered',
        deliveredAt,
        proof: proofResult.rows[0],
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};
