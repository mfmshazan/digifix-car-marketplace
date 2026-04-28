import { riderQuery } from '../lib/riderDb.js';
import { dispatchJobToNextEligibleDriver } from '../services/riderRealtimeDispatch.js';
import { hasValue, isFloatInRange, validationError } from '../utils/riderValidation.js';

export const createRiderAdminJob = async (req, res, next) => {
  try {
    const {
      orderNumber,
      customerName,
      customerPhone,
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupContactName,
      pickupContactPhone,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      distanceKm,
      paymentAmount,
      itemsDescription,
      specialInstructions,
    } = req.body;

    if (
      !hasValue(orderNumber) ||
      !hasValue(customerName) ||
      !hasValue(customerPhone) ||
      !hasValue(pickupAddress) ||
      !hasValue(dropoffAddress) ||
      !isFloatInRange(pickupLatitude, -90, 90) ||
      !isFloatInRange(pickupLongitude, -180, 180) ||
      !isFloatInRange(dropoffLatitude, -90, 90) ||
      !isFloatInRange(dropoffLongitude, -180, 180) ||
      Number(paymentAmount) < 0
    ) {
      return validationError(res, 'Validation failed');
    }

    const result = await riderQuery(
      `INSERT INTO rider_delivery_jobs (
          order_number, customer_name, customer_phone,
          pickup_address, pickup_latitude, pickup_longitude,
          pickup_contact_name, pickup_contact_phone,
          dropoff_address, dropoff_latitude, dropoff_longitude,
          distance_km, payment_amount, items_description, special_instructions
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING id, order_number, status, created_at`,
      [
        orderNumber,
        customerName,
        customerPhone,
        pickupAddress,
        pickupLatitude,
        pickupLongitude,
        pickupContactName || null,
        pickupContactPhone || null,
        dropoffAddress,
        dropoffLatitude,
        dropoffLongitude,
        distanceKm || null,
        paymentAmount,
        itemsDescription || null,
        specialInstructions || null,
      ]
    );

    await dispatchJobToNextEligibleDriver(result.rows[0].id);

    return res.status(201).json({
      success: true,
      message: 'Job created and dispatch started successfully',
      data: result.rows[0],
    });
  } catch (error) {
    return next(error);
  }
};

export const getRiderAdminJobs = async (req, res, next) => {
  try {
    const { status } = req.query;
    const params = [];
    let queryText = `
      SELECT j.*, p.full_name as partner_name, p.phone as partner_phone
        FROM rider_delivery_jobs j
        LEFT JOIN rider_delivery_partners p ON j.partner_id = p.id
    `;

    if (status) {
      queryText += ' WHERE j.status = $1';
      params.push(status);
    }

    queryText += ' ORDER BY j.created_at DESC';
    const result = await riderQuery(queryText, params);

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

export const getRiderAdminPartners = async (req, res, next) => {
  try {
    const result = await riderQuery(
      `SELECT id, email, full_name, phone, vehicle_type, vehicle_number,
              status, current_latitude, current_longitude, rating, total_deliveries,
              created_at
         FROM rider_delivery_partners
        ORDER BY created_at DESC`
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

export const getRiderAdminJobTracking = async (req, res, next) => {
  try {
    const jobId = Number.parseInt(req.params.id, 10);
    const result = await riderQuery(
      `SELECT latitude, longitude, accuracy, speed, heading, recorded_at
         FROM rider_job_tracking
        WHERE job_id = $1
        ORDER BY recorded_at ASC`,
      [jobId]
    );

    return res.json({ success: true, data: result.rows });
  } catch (error) {
    return next(error);
  }
};

