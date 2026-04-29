import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';

// GET /api/tracking/order/:orderId/rider-location
// Returns the rider's latest GPS location for a given order (customer live tracking)
export const getRiderLiveLocation = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, salesmanId: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isAuthorized =
      order.customerId === userId ||
      order.salesmanId === userId ||
      req.user.role === 'ADMIN';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const jobResult = await riderQuery(
      `SELECT rdj.id, rdj.status, rdj.partner_id,
              rdp.current_latitude, rdp.current_longitude, rdp.full_name AS rider_name
       FROM rider_delivery_jobs rdj
       LEFT JOIN rider_delivery_partners rdp ON rdj.partner_id = rdp.id
       WHERE rdj.marketplace_order_id = $1
       ORDER BY rdj.created_at DESC
       LIMIT 1`,
      [orderId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No delivery found for this order' });
    }

    const job = jobResult.rows[0];

    if (!job.partner_id) {
      return res.status(200).json({
        success: true,
        data: { status: job.status, hasRider: false, riderLocation: null },
      });
    }

    // Prefer the most recent tracking point; fall back to partner's stored location
    const trackingResult = await riderQuery(
      `SELECT latitude, longitude, accuracy, speed, heading, recorded_at
       FROM rider_job_tracking
       WHERE job_id = $1
       ORDER BY recorded_at DESC
       LIMIT 1`,
      [job.id]
    );

    const pt = trackingResult.rows[0];

    const riderLocation = pt
      ? {
          latitude: parseFloat(pt.latitude),
          longitude: parseFloat(pt.longitude),
          accuracy: pt.accuracy,
          speed: pt.speed,
          heading: pt.heading,
          recordedAt: pt.recorded_at,
        }
      : job.current_latitude
      ? {
          latitude: parseFloat(job.current_latitude),
          longitude: parseFloat(job.current_longitude),
          recordedAt: new Date().toISOString(),
        }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        status: job.status,
        hasRider: true,
        riderName: job.rider_name,
        riderLocation,
      },
    });
  } catch (err) {
    console.error('getRiderLiveLocation error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

// GET /api/tracking/order/:orderId/delivery-status
// Returns full delivery job info for an order (customer + salesman + admin)
export const getOrderDeliveryStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.id;

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, customerId: true, salesmanId: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const isAuthorized =
      order.customerId === userId ||
      order.salesmanId === userId ||
      req.user.role === 'ADMIN';

    if (!isAuthorized) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const jobResult = await riderQuery(
      `SELECT rdj.id, rdj.status, rdj.order_number, rdj.customer_name, rdj.customer_phone,
              rdj.pickup_address, rdj.pickup_latitude, rdj.pickup_longitude,
              rdj.dropoff_address, rdj.dropoff_latitude, rdj.dropoff_longitude,
              rdj.distance_km,
              rdj.assigned_at, rdj.picked_up_at, rdj.delivered_at,
              rdp.full_name AS rider_name, rdp.phone AS rider_phone,
              rdp.vehicle_type, rdp.vehicle_number, rdp.rating AS rider_rating,
              rdp.current_latitude, rdp.current_longitude
       FROM rider_delivery_jobs rdj
       LEFT JOIN rider_delivery_partners rdp ON rdj.partner_id = rdp.id
       WHERE rdj.marketplace_order_id = $1
       ORDER BY rdj.created_at DESC
       LIMIT 1`,
      [orderId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        data: { hasDelivery: false },
      });
    }

    const job = jobResult.rows[0];

    return res.status(200).json({
      success: true,
      data: {
        hasDelivery: true,
        deliveryStatus: job.status,
        orderNumber: job.order_number,
        rider: job.rider_name
          ? {
              name: job.rider_name,
              phone: job.rider_phone,
              vehicleType: job.vehicle_type,
              vehicleNumber: job.vehicle_number,
              rating: job.rider_rating,
            }
          : null,
        riderLocation:
          job.current_latitude && job.current_longitude
            ? {
                latitude: parseFloat(job.current_latitude),
                longitude: parseFloat(job.current_longitude),
              }
            : null,
        timeline: {
          assignedAt: job.assigned_at,
          pickedUpAt: job.picked_up_at,
          deliveredAt: job.delivered_at,
        },
        addresses: {
          pickup: job.pickup_address,
          dropoff: job.dropoff_address,
          distanceKm: job.distance_km,
        },
        route: {
          pickup: {
            latitude: parseFloat(job.pickup_latitude),
            longitude: parseFloat(job.pickup_longitude),
            address: job.pickup_address,
          },
          dropoff: {
            latitude: parseFloat(job.dropoff_latitude),
            longitude: parseFloat(job.dropoff_longitude),
            address: job.dropoff_address,
          },
        },
      },
    });
  } catch (err) {
    console.error('getOrderDeliveryStatus error:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
