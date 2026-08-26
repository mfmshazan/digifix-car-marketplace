/**
 * @typedef {'available' | 'assigned' | 'accepted' | 'arrived_at_pickup' | 'picked_up' | 'in_transit' | 'arrived_at_dropoff' | 'delivered' | 'failed' | 'cancelled'} DeliveryStatus
 */

/**
 * @typedef {Object} Delivery
 * @property {number|string} id
 * @property {string} orderNumber
 * @property {string} customerName
 * @property {string} customerPhone
 * @property {string} pickupAddress
 * @property {number|null} pickupLatitude
 * @property {number|null} pickupLongitude
 * @property {string} pickupContactName
 * @property {string} pickupContactPhone
 * @property {string} dropoffAddress
 * @property {number|null} dropoffLatitude
 * @property {number|null} dropoffLongitude
 * @property {number|null} distanceKm
 * @property {number|null} paymentAmount
 * @property {string} itemSummary
 * @property {string} specialInstructions
 * @property {DeliveryStatus} status
 * @property {string|null} assignedAt
 * @property {string|null} acceptedAt
 * @property {string|null} createdAt
 * @property {number|null} etaMinutes
 */

const toNumberOrNull = (value) => {
    if (value === null || value === undefined || String(value).trim() === '') {
        return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * @param {any} raw
 * @returns {Delivery}
 */
export const normalizeDelivery = (raw = {}) => ({
    id: raw.id ?? '',
    orderNumber: raw.order_number ?? '',
    customerName: raw.customer_name ?? '',
    customerPhone: raw.customer_phone ?? '',
    pickupAddress: raw.pickup_address ?? '',
    pickupLatitude: toNumberOrNull(raw.pickup_latitude),
    pickupLongitude: toNumberOrNull(raw.pickup_longitude),
    pickupContactName: raw.pickup_contact_name ?? '',
    pickupContactPhone: raw.pickup_contact_phone ?? '',
    dropoffAddress: raw.dropoff_address ?? '',
    dropoffLatitude: toNumberOrNull(raw.dropoff_latitude),
    dropoffLongitude: toNumberOrNull(raw.dropoff_longitude),
    distanceKm: toNumberOrNull(raw.distance_km),
    paymentAmount: toNumberOrNull(raw.payment_amount),
    itemSummary: raw.items_description ?? '',
    specialInstructions: raw.special_instructions ?? '',
    status: raw.status ?? 'assigned',
    assignedAt: raw.assigned_at ?? null,
    acceptedAt: raw.accepted_at ?? null,
    createdAt: raw.created_at ?? null,
    etaMinutes: toNumberOrNull(raw.pickup_eta_minutes),
    riderLocation: raw.riderLocation
        ? {
            latitude: toNumberOrNull(raw.riderLocation.latitude),
            longitude: toNumberOrNull(raw.riderLocation.longitude),
            accuracy: toNumberOrNull(raw.riderLocation.accuracy),
            speed: toNumberOrNull(raw.riderLocation.speed),
            heading: toNumberOrNull(raw.riderLocation.heading),
            recordedAt: raw.riderLocation.recordedAt ?? null,
        }
        : toNumberOrNull(raw.current_latitude) !== null &&
            toNumberOrNull(raw.current_longitude) !== null
            ? {
                latitude: toNumberOrNull(raw.current_latitude),
                longitude: toNumberOrNull(raw.current_longitude),
                accuracy: null,
                speed: null,
                heading: null,
                recordedAt: null,
            }
            : null,
});

/**
 * @param {any[]} rows
 * @returns {Delivery[]}
 */
export const normalizeDeliveries = (rows = []) => rows.map(normalizeDelivery);
