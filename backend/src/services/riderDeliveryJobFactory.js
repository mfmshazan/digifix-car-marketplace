import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatAddress = (address) => {
  if (!address) return null;
  return [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
};

export const createRiderJobFromMarketplaceOrder = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      salesman: {
        select: {
          name: true,
          phone: true,
          store: {
            select: {
              name: true,
              address: true,
              phone: true,
              pickupAddress: true,
              pickupLatitude: true,
              pickupLongitude: true,
            },
          },
        },
      },
      address: true,
      items: true,
    },
  });

  if (!order) return null;

  const existingJob = await riderQuery(
    'SELECT id FROM "DeliveryJob" WHERE marketplace_order_id = $1 LIMIT 1',
    [order.id]
  );

  if (existingJob.rows.length) return existingJob.rows[0];

  const pickupLatitude = toNumberOrNull(order.salesman?.store?.pickupLatitude);
  const pickupLongitude = toNumberOrNull(order.salesman?.store?.pickupLongitude);
  const dropoffLatitude = toNumberOrNull(
    order.deliveryLatitude ?? order.address?.latitude
  );
  const dropoffLongitude = toNumberOrNull(
    order.deliveryLongitude ?? order.address?.longitude
  );

  if (pickupLatitude === null || pickupLongitude === null) {
    console.warn(
      `Skipped Rider job creation for order ${order.orderNumber}: the shop pickup location is not configured.`
    );
    return null;
  }

  if (dropoffLatitude === null || dropoffLongitude === null) {
    console.warn(
      `Skipped Rider job creation for order ${order.orderNumber}: the customer delivery address has no pinned coordinates.`
    );
    return null;
  }

  const pickupAddress = order.salesman?.store?.pickupAddress
    || order.salesman?.store?.address
    || order.salesman?.store?.name
    || 'Pickup location';
  const dropoffAddress = order.deliveryAddress
    || formatAddress(order.address)
    || 'Customer delivery address';
  const itemsDescription = order.items
    .map((item) => `${item.quantity} x ${item.itemName || item.itemType}`)
    .join(', ');

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
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, NULL, NULL, NULL, 'PREPAID', $14, $15, 'awaiting_dispatch')
     RETURNING id, order_number, status, created_at`,
    [
      order.id,
      order.orderNumber,
      order.customer?.name || order.customer?.email || 'Customer',
      order.customer?.phone || '',
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      order.salesman?.store?.name || order.salesman?.name || null,
      order.salesman?.store?.phone || order.salesman?.phone || null,
      dropoffAddress,
      dropoffLatitude,
      dropoffLongitude,
      order.deliveryFee || order.serviceCharge || 0,
      itemsDescription || null,
      order.notes || null,
    ]
  );

  return result.rows[0];
};

export const createRiderJobsForMarketplaceOrders = async (orders = []) => {
  const jobs = [];

  for (const order of orders) {
    try {
      const job = await createRiderJobFromMarketplaceOrder(order.id);
      if (job) jobs.push(job);
    } catch (error) {
      console.error(`Failed to create Rider delivery job for order ${order.id}:`, error.message);
    }
  }

  return jobs;
};
