/**
 * OneSignal push helper (rider app).
 *
 * The backend sends delivery pushes server-side via the OneSignal REST API,
 * targeting each rider by external_id = their Rider id. This module initialises
 * the native SDK and calls login(riderId) so the device is reachable.
 *
 * Notes:
 *  - react-native-onesignal is a NATIVE module. It only works in a dev build /
 *    APK — NOT in Expo Go, and NOT on web. All calls are guarded + dynamically
 *    imported so those environments no-op instead of crashing.
 *  - Uses the same OneSignal app as the customer app / web dashboard.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const ONESIGNAL_APP_ID =
  process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || 'dc1553f8-9009-4b18-93a8-646525be934d';

// Expo Go ships no custom native modules, so importing react-native-onesignal there
// throws a TurboModule invariant. Detect it up front and skip the import entirely.
const isExpoGo =
  Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

let sdk = null;
let initialized = false;
let pendingExternalId = null;

/** Lazily load the native SDK. Returns null in Expo Go / web / on failure. */
async function getSDK() {
  if (Platform.OS === 'web') return null;
  // In Expo Go the native module doesn't exist — never attempt the import.
  if (isExpoGo) return null;
  if (sdk) return sdk;
  try {
    const mod = await import('react-native-onesignal');
    sdk = mod.OneSignal;
    return sdk;
  } catch (e) {
    console.warn('[OneSignal] native module unavailable (Expo Go?):', e.message);
    return null;
  }
}

/** Initialise once per app launch and ask for notification permission. */
export async function initOneSignal() {
  if (initialized) return;
  const os = await getSDK();
  if (!os) return;
  try {
    os.initialize(ONESIGNAL_APP_ID);
    os.Notifications.requestPermission(true).catch(() => {});
    initialized = true;
    console.log('[OneSignal] initialised');
    if (pendingExternalId) {
      os.login(pendingExternalId);
      console.log('[OneSignal] logged in (deferred) as', pendingExternalId);
      pendingExternalId = null;
    }
  } catch (e) {
    console.warn('[OneSignal] init failed:', e.message);
  }
}

/** Associate this device with the logged-in rider so the backend can target it. */
export async function loginOneSignal(riderId) {
  if (!riderId) return;
  const os = await getSDK();
  if (!os) return;
  if (!initialized) {
    pendingExternalId = String(riderId);
    await initOneSignal();
    return;
  }
  try {
    os.login(String(riderId));
    console.log('[OneSignal] logged in as', riderId);
  } catch (e) {
    console.warn('[OneSignal] login failed:', e.message);
  }
}

/** Decode the Rider id from the access-token JWT (backend reads `decoded.id`). */
function decodeRiderIdFromToken(token) {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const decoded = JSON.parse(atob(b64));
    const id = decoded?.id ?? decoded?.riderId ?? decoded?.partnerId ?? decoded?.sub;
    return id != null ? String(id) : null;
  } catch {
    return null;
  }
}

/**
 * Register this device for push straight from an access token — call on every
 * sign-in and on app cold-start. Makes delivery notifications arrive without the
 * rider opening any screen. No-ops in Expo Go / web / if the token is missing.
 */
export async function registerPushForToken(token) {
  if (!token) return;
  const riderId = decodeRiderIdFromToken(token);
  if (riderId) await loginOneSignal(riderId);
}

/** Detach the device from the rider (call on sign-out). */
export async function logoutOneSignal() {
  const os = await getSDK();
  if (!os) return;
  try {
    os.logout();
    console.log('[OneSignal] logged out');
  } catch {
    /* no-op */
  }
}
