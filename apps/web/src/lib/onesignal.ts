/**
 * Push notification helper.
 *
 * Strategy:
 *  - The BROWSER TOGGLE just controls whether this salesman WANTS notifications.
 *  - Actual push delivery is done entirely server-side via OneSignal REST API.
 *  - We store the salesman's OneSignal subscription by calling the backend
 *    which uses the REST API with external_id targeting.
 *  - The frontend only needs to: register a service worker + request permission.
 */

const SW_PATH = '/OneSignalSDKWorker.js';

/** Register the OneSignal service worker and request notification permission.
 *  Returns 'granted' | 'denied' | 'default'.
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'denied';

  // Register OneSignal service worker so background push works
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register(SW_PATH, { scope: '/' });
      console.log('[Push] Service worker registered');
    } catch (e) {
      console.warn('[Push] Service worker registration failed:', e);
    }
  }

  if (window.Notification.permission === 'granted') return 'granted';
  if (window.Notification.permission === 'denied') return 'denied';

  const result = await window.Notification.requestPermission();
  return result;
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

// Stubs kept so imports in page.tsx still compile
export async function initOneSignal(): Promise<boolean> { return true; }
export async function loginOneSignalUser(_userId: string): Promise<void> { return; }
export async function logoutOneSignalUser(): Promise<void> { return; }
export async function setPushOptIn(_optIn: boolean): Promise<void> { return; }
