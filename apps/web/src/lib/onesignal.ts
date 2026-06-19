/**
 * Push notification helper.
 *
 * Strategy:
 *  - The BROWSER TOGGLE controls whether this salesman WANTS notifications.
 *  - Actual push delivery is done entirely server-side via OneSignal REST API.
 *  - The frontend initialises the OneSignal SDK and calls login(userId) so the
 *    server can target this browser by external_id (= DB user ID).
 */

// Dynamic import so this module is never executed during SSR
let _OneSignal: typeof import('react-onesignal').default | null = null;
let _initialized = false;

async function getSDK() {
  if (_OneSignal) return _OneSignal;
  const mod = await import('react-onesignal');
  _OneSignal = mod.default;
  return _OneSignal;
}

/**
 * Initialise the OneSignal SDK once per browser session.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initOneSignal(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (_initialized) return true;

  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  if (!appId) {
    console.warn('[OneSignal] NEXT_PUBLIC_ONESIGNAL_APP_ID is not set');
    return false;
  }

  try {
    const OneSignal = await getSDK();
    await OneSignal.init({
      appId,
      serviceWorkerPath: '/OneSignalSDKWorker.js',
      autoResubscribe: true,
      promptOptions: { slidedown: { prompts: [] } },
    } as Parameters<typeof OneSignal.init>[0]);
    _initialized = true;
    console.log('[OneSignal] Initialised');
    return true;
  } catch (e) {
    console.error('[OneSignal] Init failed:', e);
    return false;
  }
}

/**
 * Link this browser's push subscription to the salesman's DB user ID.
 * Must be called after initOneSignal() and after the user has logged in.
 * The backend targets notifications using include_aliases: { external_id: [userId] }.
 */
export async function loginOneSignalUser(userId: string): Promise<void> {
  if (typeof window === 'undefined' || !userId) return;
  try {
    const OneSignal = await getSDK();
    await OneSignal.login(userId);
    console.log('[OneSignal] Logged in as', userId);
  } catch (e) {
    console.warn('[OneSignal] login() failed:', e);
  }
}

/** Unlink this browser from the user — call on logout */
export async function logoutOneSignalUser(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const OneSignal = await getSDK();
    await OneSignal.logout();
    console.log('[OneSignal] Logged out');
  } catch (e) {
    console.warn('[OneSignal] logout() failed:', e);
  }
}

/** Request browser notification permission via OneSignal */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';

  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';

  try {
    const OneSignal = await getSDK();
    if (_initialized) {
      await OneSignal.Notifications.requestPermission();
      return window.Notification.permission;
    }
  } catch { /* fall through to native */ }

  return window.Notification.requestPermission();
}

/** Returns current notification permission */
export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';
  return window.Notification.permission;
}

/** Check if user has granted notification permission */
export function isSubscribed(): boolean {
  return getNotificationPermission() === 'granted';
}

export async function setPushOptIn(_optIn: boolean): Promise<void> { return; }
