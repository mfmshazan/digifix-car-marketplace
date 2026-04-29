import { getRiderClient, riderQuery } from '../lib/riderDb.js';
import { dispatchAvailableJobs, resolveOffer } from '../services/riderRealtimeDispatch.js';
import { isFloatInRange, validationError } from '../utils/riderValidation.js';

const ACTIVE_JOB_STATUSES = ['assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff'];

export const getAvailableRiderJobs = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT id, order_number, customer_name, customer_phone,
              pickup_address, pickup_latitude, pickup_longitude,
              dropoff_address, dropoff_latitude, dropoff_longitude,
              distance_km, payment_amount, items_description, special_instructions,
              status, created_at
         FROM rider_delivery_jobs
        WHERE status = 'available'
          AND NOT EXISTS (
            SELECT 1
              FROM rider_delivery_request_offers dro
             WHERE dro.job_id = rider_delivery_jobs.id
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
      `SELECT id, order_number, customer_name, customer_phone,
              pickup_address, pickup_latitude, pickup_longitude,
              pickup_contact_name, pickup_contact_phone,
              dropoff_address, dropoff_latitude, dropoff_longitude,
              distance_km, payment_amount, items_description, special_instructions,
              status, assigned_at, picked_up_at, created_at
         FROM rider_delivery_jobs
        WHERE partner_id = $1 AND status IN ('assigned', 'accepted', 'arrived_at_pickup', 'picked_up', 'in_transit', 'arrived_at_dropoff')
        ORDER BY assigned_at DESC
        LIMIT 1`,
      [req.user.id]
    );

    return res.json({ success: true, data: result.rows[0] || null });
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
         FROM rider_delivery_jobs
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
              pod.photo_url, pod.signature_data, pod.recipient_name,
              pod.notes, pod.created_at AS proof_submitted_at
         FROM rider_delivery_jobs dj
         LEFT JOIN rider_proof_of_delivery pod ON pod.job_id = dj.id
        WHERE dj.partner_id = $1 AND dj.status IN ('delivered', 'cancelled')
        ORDER BY dj.delivered_at DESC NULLS LAST, pod.created_at DESC NULLS LAST
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

    return res.json({ success: true, message: 'Incoming request accepted successfully', data: result.data });
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
      `SELECT id FROM rider_delivery_request_offers
        WHERE job_id = $1 AND offer_status = 'pending' AND expires_at > NOW()
        LIMIT 1`,
      [jobId]
    );

    if (pendingOfferCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'This job is already being offered to another driver' });
    }

    const partnerStatusCheck = await client.query('SELECT status FROM rider_delivery_partners WHERE id = $1', [req.user.id]);

    if (partnerStatusCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Partner not found' });
    }

    if (partnerStatusCheck.rows[0].status !== 'online') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You must be online to accept a job' });
    }

    const activeJobCheck = await client.query(
      `SELECT id FROM rider_delivery_jobs
        WHERE partner_id = $1 AND status = ANY($2::text[])`,
      [req.user.id, ACTIVE_JOB_STATUSES]
    );

    if (activeJobCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You already have an active delivery' });
    }

    const result = await client.query(
      `UPDATE rider_delivery_jobs
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

    await client.query("UPDATE rider_delivery_partners SET status = 'busy' WHERE id = $1", [req.user.id]);
    await client.query('COMMIT');

    return res.json({ success: true, message: 'Job accepted successfully', data: result.rows[0] });
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
    const rejectionCheck = await client.query('SELECT id, status, partner_id FROM rider_delivery_jobs WHERE id = $1', [jobId]);

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
      `UPDATE rider_delivery_jobs
          SET partner_id = NULL, status = 'available', assigned_at = NULL, accepted_at = NULL
        WHERE id = $1
        RETURNING id, order_number, status`,
      [jobId]
    );

    await client.query("UPDATE rider_delivery_partners SET status = 'online' WHERE id = $1 AND status = 'busy'", [req.user.id]);
    await client.query('COMMIT');
    await dispatchAvailableJobs();

    return res.json({ success: true, message: 'Assigned delivery rejected successfully', data: result.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    return next(error);
  } finally {
    client.release();
  }
};

const syncMarketplaceOrderStatus = async (client, jobId, riderStatus) => {
  const statusMap = {
    accepted: 'ACCEPTED',
    arrived_at_pickup: 'ARRIVED_AT_PICKUP',
    picked_up: 'PICKED_UP',
    in_transit: 'IN_TRANSIT',
    arrived_at_dropoff: 'ARRIVED_AT_DROPOFF',
    delivered: 'DELIVERED',
    failed: 'FAILED',
  };

  const marketplaceStatus = statusMap[riderStatus];
  if (!marketplaceStatus) return;

  const jobResult = await client.query(
    'SELECT marketplace_order_id FROM rider_delivery_jobs WHERE id = $1 AND marketplace_order_id IS NOT NULL',
    [jobId]
  );

  const marketplaceOrderId = jobResult.rows[0]?.marketplace_order_id;
  if (!marketplaceOrderId) return;

  await client.query('UPDATE "Order" SET status = $1, "updatedAt" = NOW() WHERE id = $2', [marketplaceStatus, marketplaceOrderId]);
  await client.query(
    'INSERT INTO "OrderTracking" (id, status, description, "orderId", "createdAt") VALUES (gen_random_uuid()::text, $1, $2, $3, NOW())',
    [marketplaceStatus, `Delivery status updated to ${riderStatus}`, marketplaceOrderId]
  );
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

    const currentJobRes = await client.query('SELECT status, partner_id FROM rider_delivery_jobs WHERE id = $1', [jobId]);

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
      `UPDATE rider_delivery_jobs
          SET status = $1 ${timestampSQL}
        WHERE id = $2
        RETURNING id, order_number, status`,
      [status, jobId]
    );

    await client.query(
      `INSERT INTO rider_job_status_logs (job_id, partner_id, status, reason, latitude, longitude)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [jobId, req.user.id, status, reason || null, latitude || null, longitude || null]
    );

    if (isFloatInRange(latitude, -90, 90) && isFloatInRange(longitude, -180, 180)) {
      await client.query(
        `UPDATE rider_delivery_partners
            SET current_latitude = $1,
                current_longitude = $2
          WHERE id = $3`,
        [latitude, longitude, req.user.id]
      );

      await client.query(
        `INSERT INTO rider_job_tracking (job_id, partner_id, latitude, longitude)
         VALUES ($1, $2, $3, $4)`,
        [jobId, req.user.id, latitude, longitude]
      );
    }

    if (status === 'delivered' || status === 'failed') {
      await client.query(
        "UPDATE rider_delivery_partners SET status = 'online', total_deliveries = total_deliveries + (CASE WHEN $2 = 'delivered' THEN 1 ELSE 0 END) WHERE id = $1",
        [req.user.id, status]
      );
    }

    await syncMarketplaceOrderStatus(client, jobId, status);
    await client.query('COMMIT');

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

    const jobCheck = await riderQuery('SELECT id FROM rider_delivery_jobs WHERE id = $1 AND partner_id = $2', [jobId, req.user.id]);

    if (jobCheck.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found or not assigned to you' });
    }

    await riderQuery(
      `INSERT INTO rider_job_tracking (job_id, partner_id, latitude, longitude, accuracy, speed, heading)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [jobId, req.user.id, latitude, longitude, accuracy || null, speed || null, heading || null]
    );

    await riderQuery(
      `UPDATE rider_delivery_partners
          SET current_latitude = $1,
              current_longitude = $2
        WHERE id = $3`,
      [latitude, longitude, req.user.id]
    );

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

    if (!photoUrl) {
      return res.status(400).json({ success: false, message: 'Delivery photo proof is required' });
    }

    await client.query('BEGIN');

    const jobCheck = await client.query(
      'SELECT id, order_number, status, delivered_at FROM rider_delivery_jobs WHERE id = $1 AND partner_id = $2',
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
      `INSERT INTO rider_proof_of_delivery
        (job_id, partner_id, photo_url, signature_data, recipient_name, notes, delivery_latitude, delivery_longitude)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (job_id)
       DO UPDATE SET
        photo_url = COALESCE(EXCLUDED.photo_url, rider_proof_of_delivery.photo_url),
        signature_data = COALESCE(EXCLUDED.signature_data, rider_proof_of_delivery.signature_data),
        recipient_name = COALESCE(EXCLUDED.recipient_name, rider_proof_of_delivery.recipient_name),
        notes = COALESCE(EXCLUDED.notes, rider_proof_of_delivery.notes),
        delivery_latitude = COALESCE(EXCLUDED.delivery_latitude, rider_proof_of_delivery.delivery_latitude),
        delivery_longitude = COALESCE(EXCLUDED.delivery_longitude, rider_proof_of_delivery.delivery_longitude)
       RETURNING id, photo_url, signature_data, recipient_name, notes, created_at`,
      [jobId, req.user.id, photoUrl, signatureData, recipientName, proofNotes, latitude || null, longitude || null]
    );

    let deliveredAt = job.delivered_at;

    if (job.status !== 'delivered') {
      const deliveryResult = await client.query(
        "UPDATE rider_delivery_jobs SET status = 'delivered', delivered_at = NOW() WHERE id = $1 RETURNING delivered_at",
        [jobId]
      );
      deliveredAt = deliveryResult.rows[0]?.delivered_at ?? null;

      await client.query(
        `INSERT INTO rider_job_status_logs (job_id, partner_id, status, reason, latitude, longitude)
         VALUES ($1, $2, 'delivered', $3, $4, $5)`,
        [jobId, req.user.id, 'Proof of delivery submitted and archived', latitude || null, longitude || null]
      );

      await client.query(
        "UPDATE rider_delivery_partners SET status = 'online', total_deliveries = total_deliveries + 1 WHERE id = $1",
        [req.user.id]
      );

      await syncMarketplaceOrderStatus(client, jobId, 'delivered');
    }

    await client.query('COMMIT');
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
