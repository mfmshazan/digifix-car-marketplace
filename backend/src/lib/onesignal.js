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
    headings: { en: '🛒 New Order Received!' },
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
    headings: { en: '⚠️ Cancellation Request' },
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
export async function sendRefundApprovedToSalesman({ salesmanId, orderNumber }) {
  if (!isConfigured()) {
    console.warn('⚠️  OneSignal not configured — skipping refund approved push');
    return { success: false, reason: 'not_configured' };
  }

  const body = {
    app_id: process.env.ONESIGNAL_APP_ID,
    include_aliases: { external_id: [salesmanId] },
    target_channel: 'push',
    headings: { en: '🔄 Refund Approved' },
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
