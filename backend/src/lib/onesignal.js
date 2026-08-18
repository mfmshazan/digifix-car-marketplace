/**
 * OneSignal Web Push helper
 * Uses the OneSignal REST API v1 to send targeted notifications to salesmen.
 * Docs: https://documentation.onesignal.com/reference/create-notification
 */

const ONESIGNAL_API_URL = 'https://onesignal.com/api/v1/notifications';

function isConfigured() {
  return Boolean(process.env.ONESIGNAL_APP_ID && process.env.ONESIGNAL_REST_API_KEY);
}

/**
 * Send a web push notification to a specific salesman.
 * @param {{ salesmanId: string, orderNumber: string, orderId: string, total: number }} params
 */
export async function sendNewOrderNotificationToSalesman({ salesmanId, orderNumber, orderId, total }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping push notification');
    return { success: false, reason: 'not_configured' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    // Target the salesman by their user ID (set via OneSignal login() on the frontend)
    include_aliases: { external_id: [salesmanId] },
    target_channel: 'push',
    headings: { en: 'New Order Received!' },
    contents: {
      en: `Order ${orderNumber} was just placed. Total: Rs. ${Number(total).toLocaleString()}`,
    },
    url: process.env.WEB_URL || 'http://localhost:3001/dashboard/salesman',
    web_icon: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/favicon.ico`,
    data: { orderId, orderNumber },
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    const json = await response.json();

    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }

    console.log(`🔔 OneSignal push sent → salesman ${salesmanId} | order ${orderNumber}`, json.id);
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Notify specific admin users about a new cancellation request.
 * We target by external_id (the user's DB id) rather than a named segment
 * because segments require manual setup in the OneSignal dashboard.
 */
export async function sendCancellationRequestToAdmin({ orderNumber, customerName, adminIds }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping cancellation push to admin');
    return { success: false, reason: 'not_configured' };
  }

  if (!adminIds || adminIds.length === 0) {
    console.warn('⚠️  No admin IDs provided for push notification');
    return { success: false, reason: 'no_admin_ids' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    // Targeting admins by their user ID, registered via OneSignal login() on the web dashboard
    include_aliases: { external_id: adminIds },
    target_channel: 'push',
    headings: { en: 'Cancellation Request' },
    contents: {
      en: `${customerName} requested to cancel Order ${orderNumber}. Please review.`,
    },
    url: `${process.env.WEB_URL || 'http://localhost:3001'}/dashboard/admin`,
    data: { orderNumber, type: 'cancellation_request' },
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }
    console.log(`🔔 OneSignal cancellation push sent to admins | order ${orderNumber}`, json.id);
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Notify a salesman that a refund was approved for their order.
 * They need to stop any in-progress fulfillment and update their records.
 */
export async function sendComplaintToShop({ salesmanId, orderNumber, customerName }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping complaint push');
    return { success: false, reason: 'not_configured' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: { external_id: [salesmanId] },
    target_channel: 'push',
    headings: { en: 'New Product Complaint' },
    contents: {
      en: `${customerName || 'A customer'} raised a complaint on Order ${orderNumber}. Review and accept or reject the refund request.`,
    },
    url: `${process.env.WEB_URL || 'http://localhost:3001'}/dashboard/manager`,
    data: { orderNumber, type: 'complaint_raised' },
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }
    console.log(`🔔 OneSignal complaint push sent → shop member ${salesmanId} | order ${orderNumber}`, json.id);
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Notify a customer when the shop moves their order to a new status.
 * Covers: accepted (CONFIRMED), rejected (CANCELLED), PROCESSING, SHIPPED, DELIVERED.
 * Targets the customer's device(s) by external_id (= DB user id), which the mobile
 * app registers via OneSignal.login(userId). Delivers to web + native push channels.
 *
 * @param {{ customerId: string, orderNumber: string, orderId: string, status: string }} params
 */
export async function sendOrderStatusToCustomer({ customerId, orderNumber, orderId, status }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping order status push');
    return { success: false, reason: 'not_configured' };
  }
  if (!customerId) {
    return { success: false, reason: 'no_customer_id' };
  }

  // Map each customer-facing status to a heading + message.
  // Statuses not in this map (e.g. PENDING) intentionally send no push.
  const STATUS_MESSAGES = {
    CONFIRMED: {
      heading: 'Order Accepted',
      message: `Good news! Your order ${orderNumber} has been accepted and is being prepared.`,
    },
    PROCESSING: {
      heading: 'Order Processing',
      message: `Your order ${orderNumber} is now being processed.`,
    },
    SHIPPED: {
      heading: 'Order Shipped',
      message: `Your order ${orderNumber} is on the way!`,
    },
    DELIVERED: {
      heading: 'Order Delivered',
      message: `Your order ${orderNumber} has been delivered. Enjoy!`,
    },
    CANCELLED: {
      heading: 'Order Cancelled',
      message: `Your order ${orderNumber} has been cancelled by the seller.`,
    },
  };

  const entry = STATUS_MESSAGES[status];
  if (!entry) {
    // No push for this status — the socket event still updates the app in-place.
    return { success: false, reason: 'status_not_notifiable' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: { external_id: [customerId] },
    target_channel: 'push',
    headings: { en: entry.heading },
    contents: { en: entry.message },
    data: { orderId, orderNumber, status, type: 'order_status' },
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }
    console.log(`🔔 OneSignal status push sent → customer ${customerId} | order ${orderNumber} | ${status}`, json.id);
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendRefundApprovedToSalesman({ salesmanId, orderNumber }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping refund approved push');
    return { success: false, reason: 'not_configured' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: { external_id: [salesmanId] },
    target_channel: 'push',
    headings: { en: 'Refund Approved' },
    contents: {
      en: `Refund approved for Order ${orderNumber}. Please refund the customer and stop any pending fulfillment.`,
    },
    url: `${process.env.WEB_URL || 'http://localhost:3001'}/dashboard/salesman`,
    data: { orderNumber, type: 'refund_approved' },
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }
    console.log(`🔔 OneSignal refund approved push sent → salesman ${salesmanId} | order ${orderNumber}`, json.id);
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

export async function sendReceiptDecisionToUser({ userId, status, amount, rejectionReason }) {
  if (!userId) return { success: false, reason: 'no_user_id' };

  const approved = status === 'APPROVED';
  const title = approved ? '✅ Receipt Approved' : '⚠️ Receipt Rejected';
  const amountText = `Rs. ${Number(amount || 0).toLocaleString()}`;
  const message = approved
    ? `Your repayment receipt for ${amountText} was accepted. The payment has been credited and your wallet has been updated.`
    : `Your repayment receipt for ${amountText} was rejected${rejectionReason ? `: ${rejectionReason}` : '. Please upload a valid receipt and try again.'}`;

  return sendPush({
    externalIds: userId,
    heading: title,
    message,
    data: {
      type: 'receipt_review',
      status,
      amount: Number(amount || 0),
      rejectionReason: rejectionReason || null,
    },
    url: `${process.env.WEB_URL || 'http://localhost:3001'}/dashboard/salesman/receipts`,
  });
}

// ===========================================================================
// RIDER / DELIVERY PUSH NOTIFICATIONS
// ---------------------------------------------------------------------------
// Riders authenticate against the separate Rider table; the rider app registers
// with OneSignal via login(String(riderId)), so we target riders by their Rider
// id as external_id. Customers/shop members stay targeted by their DB user id.
// ===========================================================================

/** Shared low-level POST used by the rider/delivery helpers below. */
async function sendPush({ externalIds, heading, message, data, url }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping push');
    return { success: false, reason: 'not_configured' };
  }
  const ids = (Array.isArray(externalIds) ? externalIds : [externalIds])
    .filter((id) => id !== null && id !== undefined && id !== '')
    .map(String);
  if (ids.length === 0) return { success: false, reason: 'no_recipients' };

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: { external_id: ids },
    target_channel: 'push',
    headings: { en: heading },
    contents: { en: message },
    ...(url ? { url } : {}),
    ...(data ? { data } : {}),
  };

  try {
    const response = await fetch(ONESIGNAL_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Key ${process.env.ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    if (!response.ok) {
      console.error(`❌ OneSignal API error (${response.status}):`, JSON.stringify(json));
      return { success: false, error: json };
    }
    return { success: true, data: json };
  } catch (err) {
    console.error('❌ OneSignal fetch failed:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * #1 New delivery job offer → a rider. Sent alongside the realtime websocket
 * request so an offline/backgrounded rider still gets a chance to grab the job.
 */
export async function sendNewJobOfferToRider({ riderId, jobId, orderNumber, pickupAddress, dropoffAddress, paymentAmount, distanceKm, secondsToRespond }) {
  const money = paymentAmount != null ? `Rs. ${Number(paymentAmount).toLocaleString()}` : 'a new delivery';
  const dist = distanceKm != null ? ` • ${Number(distanceKm).toFixed(1)} km` : '';
  const res = await sendPush({
    externalIds: riderId,
    heading: 'New Delivery Request',
    message: `Earn ${money}${dist}. Pickup: ${pickupAddress || 'the shop'}. Tap to accept before it expires!`,
    data: { type: 'delivery_offer', jobId, orderNumber, pickupAddress, dropoffAddress, secondsToRespond },
  });
  if (res.success) console.log(`🔔 Rider job offer push → rider ${riderId} | job ${jobId}`, res.data?.id);
  return res;
}

/**
 * #2 Job assigned / pickup reminder → the assigned rider. Fires once the rider
 * is on the hook for a job (accepted an offer or grabbed an available job).
 */
export async function sendJobAssignedToRider({ riderId, jobId, orderNumber, pickupAddress }) {
  const res = await sendPush({
    externalIds: riderId,
    heading: 'Delivery Assigned',
    message: `Head to pickup for Order ${orderNumber || ''}: ${pickupAddress || 'the shop'}.`,
    data: { type: 'delivery_assigned', jobId, orderNumber, pickupAddress },
  });
  if (res.success) console.log(`🔔 Rider assigned push → rider ${riderId} | job ${jobId}`, res.data?.id);
  return res;
}

// Customer-facing messages per rider step (#3). Steps not listed send no push.
const RIDER_STEP_CUSTOMER_MESSAGES = {
  accepted:           { heading: 'Rider Assigned',    message: (n) => `A rider is heading to the shop for your order ${n}.` },
  arrived_at_pickup:  { heading: 'Rider at the Shop',  message: (n) => `Your rider is collecting order ${n} from the shop.` },
  picked_up:          { heading: 'Order Picked Up',    message: (n) => `Your rider has order ${n} and is on the way to you.` },
  in_transit:         { heading: 'On the Way',         message: (n) => `Your order ${n} is on the way!` },
  arrived_at_dropoff: { heading: 'Rider Arriving',     message: (n) => `Your rider is arriving with order ${n}. Please be ready.` },
};

// Shop-facing messages for the pickup-relevant steps only (#3, "and shop").
const RIDER_STEP_SHOP_MESSAGES = {
  accepted:          { heading: 'Rider Assigned',     message: (n) => `A rider is on the way to collect order ${n}.` },
  arrived_at_pickup: { heading: 'Rider at Your Shop',  message: (n) => `The rider is here to collect order ${n}. Please hand it over.` },
  picked_up:         { heading: 'Order Collected',    message: (n) => `The rider has collected order ${n}.` },
};

/** #3 Rider progress → the customer. */
export async function sendRiderStatusToCustomer({ customerId, orderId, orderNumber, riderStep }) {
  const entry = RIDER_STEP_CUSTOMER_MESSAGES[riderStep];
  if (!entry || !customerId) return { success: false, reason: 'not_notifiable' };
  const res = await sendPush({
    externalIds: customerId,
    heading: entry.heading,
    message: entry.message(orderNumber || ''),
    data: { type: 'rider_status', orderId, orderNumber, riderStep },
  });
  if (res.success) console.log(`🔔 Rider status → customer ${customerId} | ${riderStep}`, res.data?.id);
  return res;
}

/** #3 Rider progress → the shop (manager + salesmen), pickup-relevant steps only. */
export async function sendRiderStatusToShop({ shopMemberIds, orderId, orderNumber, riderStep }) {
  const entry = RIDER_STEP_SHOP_MESSAGES[riderStep];
  if (!entry || !shopMemberIds?.length) return { success: false, reason: 'not_notifiable' };
  const res = await sendPush({
    externalIds: shopMemberIds,
    heading: entry.heading,
    message: entry.message(orderNumber || ''),
    data: { type: 'rider_status_shop', orderId, orderNumber, riderStep },
  });
  if (res.success) console.log(`🔔 Rider status → shop (${shopMemberIds.length}) | ${riderStep}`, res.data?.id);
  return res;
}

/** #4 "Your rider is nearby" → the customer (fired once when the rider gets close). */
export async function sendRiderNearbyToCustomer({ customerId, orderId, orderNumber }) {
  if (!customerId) return { success: false, reason: 'no_customer_id' };
  const res = await sendPush({
    externalIds: customerId,
    heading: 'Your Rider is Nearby',
    message: `Your rider is almost there with order ${orderNumber || ''}. Please be ready to receive it.`,
    data: { type: 'rider_nearby', orderId, orderNumber },
  });
  if (res.success) console.log(`🔔 Rider nearby → customer ${customerId} | order ${orderNumber}`, res.data?.id);
  return res;
}
