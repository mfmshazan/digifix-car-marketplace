/**
 * OneSignal push helper (mobile).
 *
 * Mirrors the web setup: the backend sends pushes server-side via the OneSignal
 * REST API, targeting each user by external_id (= DB user id). This module just
 * initialises the native SDK and calls login(userId) so the device is reachable.
 *
 * Notes:
 *  - react-native-onesignal is a NATIVE module. It only works in a dev build /
 *    APK — NOT in Expo Go, and NOT on web. All calls are guarded + dynamically
 *    imported so those environments no-op instead of crashing.
 *  - Uses the same OneSignal app as the web dashboard (App ID b7bee127...).
 */
import { Platform } from 'react-native';

const ONESIGNAL_APP_ID =
  process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'b7bee127-d086-4b0d-ba3f-6e3d0b98e429';

type OneSignalSDK = typeof import('react-native-onesignal').OneSignal;

let sdk: OneSignalSDK | null = null;
let initialized = false;
let pendingExternalId: string | null = null;

/** Lazily load the native SDK. Returns null in Expo Go / web / on failure. */
async function getSDK(): Promise<OneSignalSDK | null> {
  if (Platform.OS === 'web') return null;
  if (sdk) return sdk;
  try {
    const mod = await import('react-native-onesignal');
    sdk = mod.OneSignal;
    return sdk;
  } catch (e) {
    console.warn('[OneSignal] native module unavailable (Expo Go?):', (e as Error).message);
    return null;
  }
}

/** Initialise once per app launch and ask for notification permission (Android 13+ needs it). */
export async function initOneSignal(): Promise<void> {
  if (initialized) return;
  const os = await getSDK();
  if (!os) return;
  try {
    os.initialize(ONESIGNAL_APP_ID);
    // Prompt for permission; `true` falls back to system settings if already denied.
    os.Notifications.requestPermission(true).catch(() => {});
    initialized = true;
    console.log('[OneSignal] initialised');
    // If a login was requested before init finished, apply it now.
    if (pendingExternalId) {
      os.login(pendingExternalId);
      console.log('[OneSignal] logged in (deferred) as', pendingExternalId);
      pendingExternalId = null;
    }
  } catch (e) {
    console.warn('[OneSignal] init failed:', (e as Error).message);
  }
}

/** Associate this device with the logged-in user so the backend can target it. Idempotent. */
export async function loginOneSignal(userId: string): Promise<void> {
  if (!userId) return;
  const os = await getSDK();
  if (!os) return;
  if (!initialized) {
    // Init hasn't run yet — remember and let initOneSignal() apply it.
    pendingExternalId = userId;
    await initOneSignal();
    return;
  }
  try {
    os.login(userId);
    console.log('[OneSignal] logged in as', userId);
  } catch (e) {
    console.warn('[OneSignal] login failed:', (e as Error).message);
  }
}

/** Detach the device from the user (call on sign-out). */
export async function logoutOneSignal(): Promise<void> {
  const os = await getSDK();
  if (!os) return;
  try {
    os.logout();
    console.log('[OneSignal] logged out');
  } catch {
    /* no-op */
  }
}
