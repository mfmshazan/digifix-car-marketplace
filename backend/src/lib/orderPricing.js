/**
 * Shared order pricing / planning.
 *
 * `createOrder` (COD + wallet) and `verifyPaymentAndSaveOrder` (Stripe) both need
 * to turn a raw cart into per-seller order groups with identical totals:
 *   subtotal  +  10% service charge  +  distance-based delivery fee (per shop).
 *
 * This module is the single source of truth for that maths so the Stripe
 * "remaining balance" always matches what the COD path would have charged.
 */

export const SERVICE_CHARGE_RATE = 0.10;

// Per-km delivery rate by the vehicle the order needs. An order uses the largest
// vehicle any of its items requires (LORRY > CAR > MOTORBIKE).
export const VEHICLE_RATE_PER_KM = { MOTORBIKE: 50, CAR: 70, LORRY: 30 };
export const VEHICLE_RANK = { MOTORBIKE: 1, CAR: 2, LORRY: 3 };

export const hasValidCoordinates = (latitude, longitude) => {
  if (
    latitude === null || latitude === undefined || String(latitude).trim() === '' ||
    longitude === null || longitude === undefined || String(longitude).trim() === ''
  ) {
    return false;
  }
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
    Number.isFinite(lng) && lng >= -180 && lng <= 180;
};

export const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (Number(v) * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const SELLER_STORE_SELECT = {
  id: true,
  name: true,
  role: true,
  managerId: true,
  store: { select: { name: true, pickupLatitude: true, pickupLongitude: true } },
};

/**
 * Resolve every cart line to a Product or CarPart row and build the unified item list.
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ productId: string, quantity: number }[]} items
 */
export const resolveOrderItems = async (prisma, items) => {
  const itemIds = items.map((i) => i.productId);

  const [products, carParts] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: itemIds } },
      include: { salesman: { select: SELLER_STORE_SELECT } },
    }),
    prisma.carPart.findMany({
      where: { id: { in: itemIds } },
      include: { seller: { select: SELLER_STORE_SELECT } },
    }),
  ]);

  const allItems = [];
  for (const product of products) {
    allItems.push({
      id: product.id,
      type: 'PRODUCT',
      name: product.name,
      price: product.price,
      discountPrice: product.discountPrice,
      images: product.images,
      stock: product.stock,
      sellerId: product.salesman?.managerId || product.salesmanId,
      sellerName: product.salesman?.name || 'Unknown Seller',
      storeName: product.salesman?.store?.name,
      deliveryVehicleType: product.deliveryVehicleType || null,
      pickupLat: product.salesman?.store?.pickupLatitude ?? null,
      pickupLng: product.salesman?.store?.pickupLongitude ?? null,
    });
  }
  for (const part of carParts) {
    allItems.push({
      id: part.id,
      type: 'CAR_PART',
      name: part.name,
      price: part.price,
      discountPrice: part.discountPrice,
      images: part.images,
      stock: part.stock,
      sellerId: part.seller?.managerId || part.sellerId,
      sellerName: part.seller?.name || 'Unknown Seller',
      storeName: part.seller?.store?.name,
      deliveryVehicleType: part.deliveryVehicleType || null,
      pickupLat: part.seller?.store?.pickupLatitude ?? null,
      pickupLng: part.seller?.store?.pickupLongitude ?? null,
    });
  }

  return { products, carParts, allItems };
};

/**
 * Throws { status, message } when any ordered line exceeds available stock.
 */
export const assertStock = (items, products, carParts) => {
  for (const orderItem of items) {
    const prod = products.find((p) => p.id === orderItem.productId);
    const cp = carParts.find((c) => c.id === orderItem.productId);
    const available = prod ? prod.stock : (cp ? cp.stock : 0);
    const itemName = prod?.name || cp?.name || orderItem.productId;
    if (available < orderItem.quantity) {
      throw { status: 400, message: `Not enough stock for ${itemName}. Only ${available} left.` };
    }
  }
};

/**
 * Build the full pricing plan for a cart delivered to `address`.
 *
 * @returns {{
 *   products: any[], carParts: any[], allItems: any[],
 *   groupedBySeller: Record<string, { sellerId, sellerName, storeName, items: any[], subtotal, serviceCharge }>,
 *   feeByShop: Map<string, number>, deliveryFee: number, grandTotal: number
 * }}
 * @throws { status, message } for missing items or bad address coordinates.
 */
export const buildOrderPlan = async ({ prisma, items, address }) => {
  if (!hasValidCoordinates(address?.latitude, address?.longitude)) {
    throw {
      status: 400,
      message: 'The selected address needs a delivery pin. Edit the address and choose its location on the map.',
    };
  }

  const { products, carParts, allItems } = await resolveOrderItems(prisma, items);

  if (allItems.length !== items.length) {
    const foundIds = allItems.map((i) => i.id);
    const missingIds = items.map((i) => i.productId).filter((id) => !foundIds.includes(id));
    throw { status: 400, message: `One or more items not found: ${missingIds.join(', ')}` };
  }

  assertStock(items, products, carParts);

  // Group ordered lines by seller (shop owner).
  const groupedBySeller = {};
  for (const orderItem of items) {
    const item = allItems.find((i) => i.id === orderItem.productId);
    const sellerId = item.sellerId;
    if (!groupedBySeller[sellerId]) {
      groupedBySeller[sellerId] = {
        sellerId,
        sellerName: item.sellerName,
        storeName: item.storeName,
        items: [],
      };
    }
    const price = item.discountPrice || item.price;
    groupedBySeller[sellerId].items.push({
      productId: orderItem.productId,
      itemType: item.type,
      name: item.name,
      quantity: orderItem.quantity,
      price,
      total: price * orderItem.quantity,
    });
  }

  // Distance-based delivery fee, charged per shop pickup point and summed.
  const orderedItems = items
    .map((oi) => allItems.find((i) => i.id === oi.productId))
    .filter(Boolean);
  const pickupShops = new Map(); // sellerId -> { lat, lng, vehicle }
  for (const it of orderedItems) {
    if (it.sellerId == null || it.pickupLat == null || it.pickupLng == null) continue;
    const group = pickupShops.get(it.sellerId) ||
      { lat: Number(it.pickupLat), lng: Number(it.pickupLng), vehicle: 'MOTORBIKE' };
    if (it.deliveryVehicleType && VEHICLE_RANK[it.deliveryVehicleType] > VEHICLE_RANK[group.vehicle]) {
      group.vehicle = it.deliveryVehicleType;
    }
    pickupShops.set(it.sellerId, group);
  }

  const destLat = Number(address.latitude);
  const destLng = Number(address.longitude);
  const feeByShop = new Map(); // sellerId -> fee
  let deliveryFee = 0;
  for (const [sellerId, shop] of pickupShops) {
    if (!hasValidCoordinates(shop.lat, shop.lng)) continue;
    const distanceKm = haversineKm(shop.lat, shop.lng, destLat, destLng);
    const fee = Math.round(distanceKm * VEHICLE_RATE_PER_KM[shop.vehicle]);
    feeByShop.set(sellerId, fee);
    deliveryFee += fee;
  }

  let grandTotal = 0;
  for (const sellerGroup of Object.values(groupedBySeller)) {
    sellerGroup.subtotal = sellerGroup.items.reduce((sum, item) => sum + item.total, 0);
    // The 10% platform margin is baked into each product's price by the manager,
    // so it is NOT added on top of what the customer pays. It's recorded per
    // seller only so settlement can route the platform's share to the super admin.
    sellerGroup.serviceCharge = parseFloat((sellerGroup.subtotal * SERVICE_CHARGE_RATE).toFixed(2));
    grandTotal += sellerGroup.subtotal;
  }
  grandTotal += deliveryFee;

  return { products, carParts, allItems, groupedBySeller, feeByShop, deliveryFee, grandTotal };
};

/**
 * Split a cart-level wallet amount across the per-seller orders in proportion to
 * each order's total, so the parts sum back exactly to `walletAmount`.
 *
 * @param {number} walletAmount
 * @param {number[]} orderTotals - total of each order, in creation order
 * @returns {number[]} wallet amount for each order (same order/length)
 */
export const splitWalletAmount = (walletAmount, orderTotals) => {
  const grand = orderTotals.reduce((s, t) => s + t, 0);
  if (walletAmount <= 0 || grand <= 0) return orderTotals.map(() => 0);

  const parts = orderTotals.map((t) => Math.round((walletAmount * t) / grand));
  // Push any rounding drift onto the last order.
  const drift = walletAmount - parts.reduce((s, p) => s + p, 0);
  parts[parts.length - 1] += drift;
  return parts;
};
