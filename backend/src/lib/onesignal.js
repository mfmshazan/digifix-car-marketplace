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
