import prisma from '../lib/prisma.js';
import { riderQuery } from '../lib/riderDb.js';
import { dispatchJobToNextEligibleDriver } from './riderRealtimeDispatch.js';

const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

const formatAddress = (address) => {
  if (!address) return null;
  return [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(', ');
};

const getConfiguredCoordinates = () => ({
  pickupLatitude: toNumberOrNull(process.env.RIDER_DEFAULT_PICKUP_LATITUDE),
  pickupLongitude: toNumberOrNull(process.env.RIDER_DEFAULT_PICKUP_LONGITUDE),
  dropoffLatitude: toNumberOrNull(process.env.RIDER_DEFAULT_DROPOFF_LATITUDE),
  dropoffLongitude: toNumberOrNull(process.env.RIDER_DEFAULT_DROPOFF_LONGITUDE),
});

export const createRiderJobFromMarketplaceOrder = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true, email: true, phone: true } },
      salesman: {
        select: {
          name: true,
          phone: true,
          store: { select: { name: true, address: true, phone: true } },
        },
      },
      address: true,
      items: true,
    },
  });

  if (!order) return null;

  const existingJob = await riderQuery(
    'SELECT id FROM rider_delivery_jobs WHERE marketplace_order_id = $1 LIMIT 1',
    [order.id]
  );

  if (existingJob.rows.length) return existingJob.rows[0];

  const coordinates = getConfiguredCoordinates();
  const hasCoordinates = Object.values(coordinates).every((value) => value !== null);

  if (!hasCoordinates) {
    console.warn(
      `Skipped Rider job creation for order ${order.orderNumber}: configure RIDER_DEFAULT_PICKUP_LATITUDE, RIDER_DEFAULT_PICKUP_LONGITUDE, RIDER_DEFAULT_DROPOFF_LATITUDE, and RIDER_DEFAULT_DROPOFF_LONGITUDE.`
    );
    return null;
  }

  const pickupAddress = order.salesman?.store?.address || order.salesman?.store?.name || 'Pickup location';
  const dropoffAddress = formatAddress(order.address) || 'Customer delivery address';
  const itemsDescription = order.items
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
        items_description,
        special_instructions
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NULL, $13, $14, $15)
     RETURNING id, order_number, status, created_at`,
    [
      order.id,
      order.orderNumber,
      order.customer?.name || order.customer?.email || 'Customer',
      order.customer?.phone || '',
      pickupAddress,
      coordinates.pickupLatitude,
      coordinates.pickupLongitude,
      order.salesman?.store?.name || order.salesman?.name || null,
      order.salesman?.store?.phone || order.salesman?.phone || null,
      dropoffAddress,
      coordinates.dropoffLatitude,
      coordinates.dropoffLongitude,
      order.deliveryFee || order.serviceCharge || 0,
      itemsDescription || null,
      order.notes || null,
    ]
  );

  await dispatchJobToNextEligibleDriver(result.rows[0].id);
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

