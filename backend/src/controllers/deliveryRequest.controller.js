import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { dispatchJobToNextEligibleDriver } from '../services/riderRealtimeDispatch.js';

const isFiniteNumber = (value) => Number.isFinite(Number(value));
const normalizePaymentType = (value) => {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (['CASH_ON_DELIVERY', 'COD'].includes(normalized)) return 'COD';
  if (normalized === 'PREPAID') return 'PREPAID';
  return null;
};

const buildOrderNumber = (order) =>
  order?.orderNumber || `DLV-${Date.now().toString(36).toUpperCase()}`;

export const createDeliveryRequest = async (req, res) => {
  try {
    const {
      orderId,
      pickupLatitude,
      pickupLongitude,
      pickupAddress,
      pickupContactName,
      pickupContactPhone,
      deliveryLatitude,
      deliveryLongitude,
      deliveryAddress,
      packageWeight,
      packageType,
      packageNotes,
      paymentType,
      estimatedEarnings,
      customerName,
      customerPhone,
    } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    if (
      !isFiniteNumber(pickupLatitude) ||
      !isFiniteNumber(pickupLongitude) ||
      !isFiniteNumber(deliveryLatitude) ||
      !isFiniteNumber(deliveryLongitude) ||
      !deliveryAddress
    ) {
      return res.status(400).json({
        success: false,
        message: 'Pickup coordinates and delivery address coordinates/text are required',
      });
    }

    const normalizedPaymentType = normalizePaymentType(paymentType);
    if (!normalizedPaymentType) {
      return res.status(400).json({
        success: false,
        message: 'Payment type must be Cash on Delivery or Prepaid',
      });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { name: true, phone: true, email: true } },
        salesman: {
          select: {
            id: true,
            name: true,
            phone: true,
            store: { select: { name: true, address: true, phone: true } },
          },
        },
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'SALESMAN' && order.salesmanId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only create delivery requests for your own orders',
      });
    }

    const existing = await riderQuery(
      'SELECT id, status, partner_id FROM rider_delivery_jobs WHERE marketplace_order_id = $1 LIMIT 1',
      [orderId]
    );

    if (existing.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'Delivery request already exists for this order',
        data: existing.rows[0],
      });
    }

    const itemSummary = order.items
      .map((item) => `${item.quantity} x ${item.itemName || item.itemType}`)
      .join(', ');

    const result = await riderQuery(
      `INSERT INTO rider_delivery_jobs (
          marketplace_order_id,
          order_number,
          customer_name,
          customer_phone,
          pickup_address,
          pickup_latitude,
          pickup_longitude,
          pickup_contact_name,
          pickup_contact_phone,
          dropoff_address,
          dropoff_latitude,
          dropoff_longitude,
          distance_km,
          payment_amount,
          package_weight,
          package_type,
          package_notes,
          payment_type,
          items_description,
          special_instructions,
          status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, $14, $15, $16, $17, $18, $19, 'pending')
       RETURNING id, order_number, status, partner_id, marketplace_order_id, created_at`,
      [
        orderId,
        buildOrderNumber(order),
        customerName || order.customer?.name || order.customer?.email || 'Customer',
        customerPhone || order.customer?.phone || '',
        pickupAddress || order.salesman?.store?.address || order.salesman?.store?.name || 'Pickup location',
        pickupLatitude,
        pickupLongitude,
        pickupContactName || order.salesman?.store?.name || order.salesman?.name || null,
        pickupContactPhone || order.salesman?.store?.phone || order.salesman?.phone || null,
        deliveryAddress,
        deliveryLatitude,
        deliveryLongitude,
        estimatedEarnings || order.deliveryFee || order.serviceCharge || 0,
        packageWeight || null,
        packageType || null,
        packageNotes || null,
        normalizedPaymentType,
        itemSummary || packageType || null,
        packageNotes || order.notes || null,
      ]
    );

    const job = result.rows[0];
    const offer = await dispatchJobToNextEligibleDriver(job.id);

    return res.status(201).json({
      success: true,
      message: offer
        ? 'Delivery request created and sent to nearby riders'
        : 'Delivery request created. No nearby online riders found yet.',
      data: {
        ...job,
        offer,
      },
    });
  } catch (error) {
    console.error('Create delivery request error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create delivery request',
      error: error.message,
    });
  }
};

export const getDeliveryRequest = async (req, res) => {
  try {
    const result = await riderQuery(
      `SELECT id, marketplace_order_id, order_number, partner_id,
              pickup_address, pickup_latitude, pickup_longitude,
              dropoff_address, dropoff_latitude, dropoff_longitude,
              package_weight, package_type, package_notes, payment_type,
              payment_amount, status, created_at, assigned_at, picked_up_at, delivered_at
         FROM rider_delivery_jobs
        WHERE marketplace_order_id = $1 OR id::text = $1
        LIMIT 1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery request not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery request',
      error: error.message,
    });
  }
};

