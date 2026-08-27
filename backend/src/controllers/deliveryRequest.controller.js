import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { getShopMemberIds, resolveShopOwnerId } from '../lib/shopAccess.js';
import {
  dispatchJobToNextEligibleDriver,
  dispatchJobToSelectedDriver,
  listEligibleDeliveryPartners,
  retryJobDispatch,
} from '../services/riderRealtimeDispatch.js';

const isCoordinateInRange = (value, min, max) => {
  if (value === null || value === undefined || String(value).trim() === '') return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
};
const formatAddress = (address) => [
  address?.street,
  address?.city,
  address?.state,
  address?.postalCode,
  address?.country,
].filter(Boolean).join(', ');
const normalizePaymentType = (value) => {
  const normalized = String(value || '').trim().toUpperCase().replace(/\s+/g, '_');
  if (['CASH_ON_DELIVERY', 'COD'].includes(normalized)) return 'COD';
  if (normalized === 'PREPAID') return 'PREPAID';
  return null;
};

const buildOrderNumber = (order) =>
  order?.orderNumber || `DLV-${Date.now().toString(36).toUpperCase()}`;

const findRequestShop = async (requestUser) => {
  const ownerId = await resolveShopOwnerId(requestUser);
  const store = await prisma.store.findUnique({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      address: true,
      phone: true,
      pickupAddress: true,
      pickupLatitude: true,
      pickupLongitude: true,
    },
  });
  return { ownerId, store };
};

const serializeShopLocation = (store) => ({
  configured: Boolean(
    store &&
    isCoordinateInRange(store.pickupLatitude, -90, 90) &&
    isCoordinateInRange(store.pickupLongitude, -180, 180)
  ),
  storeName: store?.name || null,
  address: store?.pickupAddress || store?.address || null,
  latitude: store?.pickupLatitude ?? null,
  longitude: store?.pickupLongitude ?? null,
});

export const getShopPickupLocation = async (req, res) => {
  try {
    const { store } = await findRequestShop(req.user);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Shop not found for this account' });
    }
    return res.json({ success: true, data: serializeShopLocation(store) });
  } catch (error) {
    console.error('Get shop pickup location error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load shop location',
      error: error.message,
    });
  }
};

export const updateShopPickupLocation = async (req, res) => {
  try {
    const latitude = req.body.latitude ?? req.body.pickupLatitude;
    const longitude = req.body.longitude ?? req.body.pickupLongitude;
    const address = String(req.body.address ?? req.body.pickupAddress ?? '').trim();

    if (
      !isCoordinateInRange(latitude, -90, 90) ||
      !isCoordinateInRange(longitude, -180, 180)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid shop latitude and longitude are required',
      });
    }

    const { ownerId, store } = await findRequestShop(req.user);
    if (!store) {
      return res.status(404).json({ success: false, message: 'Shop not found for this account' });
    }

    const updatedStore = await prisma.store.update({
      where: { ownerId },
      data: {
        pickupLatitude: Number(latitude),
        pickupLongitude: Number(longitude),
        pickupAddress: address || null,
      },
      select: {
        name: true,
        address: true,
        pickupAddress: true,
        pickupLatitude: true,
        pickupLongitude: true,
      },
    });

    return res.json({
      success: true,
      message: 'Shop location saved. It will be used for every delivery.',
      data: serializeShopLocation(updatedStore),
    });
  } catch (error) {
    console.error('Update shop pickup location error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to save shop location',
      error: error.message,
    });
  }
};

export const createDeliveryRequest = async (req, res) => {
  try {
    const {
      orderId,
      partnerId,
      riderId,
      selectedRiderId,
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
        address: true,
        items: true,
      },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Shop staff (salesman/manager) may only dispatch their own shop's orders.
    // Orders are recorded against the manager, so compare to the shop owner id.
    let effectivePickupLatitude = pickupLatitude;
    let effectivePickupLongitude = pickupLongitude;
    let effectivePickupAddress = pickupAddress;
    let dispatchStore = order.salesman?.store || null;

    if (req.user.role === 'SALESMAN' || req.user.role === 'SHOP_MANAGER') {
      const { ownerId: shopOwnerId, store } = await findRequestShop(req.user);
      const shopMemberIds = await getShopMemberIds(shopOwnerId);
      if (!shopMemberIds.includes(order.salesmanId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only create delivery requests for your own orders',
        });
      }
      if (!store) {
        return res.status(404).json({ success: false, message: 'Shop not found for this account' });
      }
      const savedLocation = serializeShopLocation(store);
      if (!savedLocation.configured) {
        return res.status(409).json({
          success: false,
          code: 'SHOP_LOCATION_REQUIRED',
          message: 'Set the fixed shop location before sending a delivery request',
        });
      }
      dispatchStore = store;
      effectivePickupLatitude = savedLocation.latitude;
      effectivePickupLongitude = savedLocation.longitude;
      effectivePickupAddress = savedLocation.address || store.name;
    } else if (
      !isCoordinateInRange(pickupLatitude, -90, 90) ||
      !isCoordinateInRange(pickupLongitude, -180, 180)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid pickup latitude and longitude are required',
      });
    }

    const savedDeliveryLatitude = order.deliveryLatitude ?? order.address?.latitude;
    const savedDeliveryLongitude = order.deliveryLongitude ?? order.address?.longitude;
    const savedDeliveryAddress = order.deliveryAddress || formatAddress(order.address);
    const hasSavedDeliveryLocation =
      isCoordinateInRange(savedDeliveryLatitude, -90, 90) &&
      isCoordinateInRange(savedDeliveryLongitude, -180, 180) &&
      Boolean(savedDeliveryAddress);
    const hasLegacyDeliveryLocation =
      isCoordinateInRange(deliveryLatitude, -90, 90) &&
      isCoordinateInRange(deliveryLongitude, -180, 180) &&
      Boolean(deliveryAddress);

    if (!hasSavedDeliveryLocation && !hasLegacyDeliveryLocation) {
      return res.status(409).json({
        success: false,
        code: 'CUSTOMER_LOCATION_REQUIRED',
        message: 'The customer delivery address has no pinned location. Ask the customer to update the address.',
      });
    }

    const effectiveDeliveryLatitude = hasSavedDeliveryLocation
      ? Number(savedDeliveryLatitude)
      : Number(deliveryLatitude);
    const effectiveDeliveryLongitude = hasSavedDeliveryLocation
      ? Number(savedDeliveryLongitude)
      : Number(deliveryLongitude);
    const effectiveDeliveryAddress = hasSavedDeliveryLocation
      ? savedDeliveryAddress
      : deliveryAddress;

    const itemSummary = order.items
      .map((item) => `${item.quantity} x ${item.itemName || item.itemType}`)
      .join(', ');

    const jobValues = [
      buildOrderNumber(order),
      customerName || order.customer?.name || order.customer?.email || 'Customer',
      customerPhone || order.customer?.phone || '',
      effectivePickupAddress || dispatchStore?.address || dispatchStore?.name || 'Pickup location',
      effectivePickupLatitude,
      effectivePickupLongitude,
      pickupContactName || dispatchStore?.name || order.salesman?.name || null,
      pickupContactPhone || dispatchStore?.phone || order.salesman?.phone || null,
      effectiveDeliveryAddress,
      effectiveDeliveryLatitude,
      effectiveDeliveryLongitude,
      estimatedEarnings ?? order.deliveryFee ?? order.serviceCharge ?? 0,
      packageWeight ?? null,
      packageType || null,
      packageNotes || null,
      normalizedPaymentType,
      itemSummary || packageType || null,
      packageNotes || order.notes || null,
    ];

    const existing = await riderQuery(
      `SELECT id, status, partner_id
         FROM "DeliveryJob"
        WHERE marketplace_order_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [orderId]
    );

    let job;
    let createdNewJob = false;

    if (existing.rows.length) {
      const existingJob = existing.rows[0];
      if (
        existingJob.partner_id ||
        !['awaiting_dispatch', 'pending', 'available', 'failed', 'cancelled'].includes(existingJob.status)
      ) {
        return res.status(409).json({
          success: false,
          message: 'This delivery request is no longer available for rider assignment',
          data: existingJob,
        });
      }

      const updated = await riderQuery(
        `UPDATE "DeliveryJob"
            SET order_number = $2,
                customer_name = $3,
                customer_phone = $4,
                pickup_address = $5,
                pickup_latitude = $6,
                pickup_longitude = $7,
                pickup_contact_name = $8,
                pickup_contact_phone = $9,
                dropoff_address = $10,
                dropoff_latitude = $11,
                dropoff_longitude = $12,
                payment_amount = $13,
                package_weight = $14,
                package_type = $15,
                package_notes = $16,
                payment_type = $17,
                items_description = $18,
                special_instructions = $19,
                status = 'pending',
                updated_at = NOW()
          WHERE id = $1
            AND partner_id IS NULL
            AND status IN ('pending', 'available', 'awaiting_dispatch', 'failed', 'cancelled')
          RETURNING id, order_number, status, partner_id, marketplace_order_id, created_at`,
        [existingJob.id, ...jobValues]
      );

      if (!updated.rows.length) {
        return res.status(409).json({
          success: false,
          message: 'This delivery request changed while assigning the rider. Reload the order and try again.',
        });
      }
      job = updated.rows[0];
    } else {
      const result = await riderQuery(
        `INSERT INTO "DeliveryJob" (
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
        [orderId, ...jobValues]
      );
      job = result.rows[0];
      createdNewJob = true;
    }

    const selectedPartnerId = partnerId || riderId || selectedRiderId;

    // Dispatch is best-effort — a failure must NOT roll back the already-committed job
    let offer = null;
    if (selectedPartnerId) {
      const selectedDispatch = await dispatchJobToSelectedDriver(job.id, Number(selectedPartnerId));
      if (!selectedDispatch.success) {
        if (createdNewJob) {
          await riderQuery(
            'DELETE FROM "DeliveryJob" WHERE id = $1 AND status = $2 AND partner_id IS NULL',
            [job.id, 'pending']
          );
        }
        return res.status(selectedDispatch.statusCode || 400).json({
          success: false,
          message: selectedDispatch.message,
          data: job,
        });
      }
      offer = selectedDispatch.data;
    } else {
      try {
        if (job.status === 'awaiting_dispatch') {
          await riderQuery(
            `UPDATE "DeliveryJob" SET status = 'pending', updated_at = NOW() WHERE id = $1`,
            [job.id]
          );
        }
        offer = await dispatchJobToNextEligibleDriver(job.id);
      } catch (dispatchError) {
        console.error('Dispatch failed (job still created, will retry):', dispatchError.message);
      }
    }

    return res.status(createdNewJob ? 201 : 200).json({
      success: true,
      message: offer
        ? selectedPartnerId
          ? 'Delivery request sent to selected rider'
          : 'Delivery request created and sent to nearby riders'
        : 'Delivery request created. Searching for available riders.',
      data: {
        ...job,
        offer,
      },
    });
  } catch (error) {
    console.error('Create delivery request error:', error);
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'A delivery request already exists for this order',
      });
    }
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create delivery request',
      error: error.message,
    });
  }
};

export const getAvailableDeliveryPartners = async (req, res) => {
  try {
    let pickupLatitude = req.query.pickupLatitude;
    let pickupLongitude = req.query.pickupLongitude;

    if (req.user.role === 'SALESMAN' || req.user.role === 'SHOP_MANAGER') {
      const { store } = await findRequestShop(req.user);
      if (!store) {
        return res.status(404).json({ success: false, message: 'Shop not found for this account' });
      }
      const savedLocation = serializeShopLocation(store);
      if (!savedLocation.configured) {
        return res.status(409).json({
          success: false,
          code: 'SHOP_LOCATION_REQUIRED',
          message: 'Set the fixed shop location before loading available riders',
        });
      }
      pickupLatitude = savedLocation.latitude;
      pickupLongitude = savedLocation.longitude;
    }

    if (
      !isCoordinateInRange(pickupLatitude, -90, 90) ||
      !isCoordinateInRange(pickupLongitude, -180, 180)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Pickup latitude and longitude are required',
      });
    }

    const partners = await listEligibleDeliveryPartners({
      pickupLatitude: Number(pickupLatitude),
      pickupLongitude: Number(pickupLongitude),
    });

    return res.json({ success: true, data: partners });
  } catch (error) {
    console.error('Get available riders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch available riders',
      error: error.message,
    });
  }
};

export const retryDeliveryRequest = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, salesmanId: true },
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (req.user.role === 'SALESMAN' || req.user.role === 'SHOP_MANAGER') {
      const shopOwnerId = await resolveShopOwnerId(req.user);
      const shopMemberIds = await getShopMemberIds(shopOwnerId);
      if (!shopMemberIds.includes(order.salesmanId)) {
        return res.status(403).json({
          success: false,
          message: 'You can only retry delivery requests for your own orders',
        });
      }
    }

    const jobResult = await riderQuery(
      `SELECT id
         FROM "DeliveryJob"
        WHERE marketplace_order_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [orderId]
    );

    if (!jobResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery request not found' });
    }

    const result = await retryJobDispatch(jobResult.rows[0].id);
    if (!result.success) {
      return res.status(result.statusCode || 400).json({
        success: false,
        message: result.message,
      });
    }

    return res.json({
      success: true,
      message: 'Searching for another available rider',
      data: result.data,
    });
  } catch (error) {
    console.error('Retry delivery request error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to retry delivery request',
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
         FROM "DeliveryJob"
        WHERE marketplace_order_id = $1 OR id::text = $1
        LIMIT 1`,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Delivery request not found' });
    }

    const delivery = result.rows[0];
    if (req.user.role !== 'ADMIN') {
      if (!delivery.marketplace_order_id) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }

      const order = await prisma.order.findUnique({
        where: { id: delivery.marketplace_order_id },
        select: { salesmanId: true },
      });
      const shopOwnerId = await resolveShopOwnerId(req.user);
      const shopMemberIds = await getShopMemberIds(shopOwnerId);

      if (!order || !shopMemberIds.includes(order.salesmanId)) {
        return res.status(403).json({ success: false, message: 'Access denied' });
      }
    }

    return res.json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch delivery request',
      error: error.message,
    });
  }
};
