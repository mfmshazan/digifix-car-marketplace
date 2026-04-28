/**
 * API Configuration for DIGIFIX Mobile App
 *
 * IMPORTANT: use `getApiUrl()` (a function) for every request and for avatar URLs.
 * A single module-level `API_URL` constant breaks after a Metro reload because
 * `Constants.expoConfig.hostUri` is often undefined on the first evaluation, so the
 * wrong host (e.g. localhost on a physical device) is frozen forever — profile
 * images under /uploads/ then fail while name/phone from prefs still look fine.
 *
 * This file handles API URL configuration for different environments:
 * - Android Emulator: Uses 10.0.2.2 (maps to host's localhost)
 * - iOS Simulator: Uses localhost
 * - Physical Device: Uses EXPO_PUBLIC_API_HOST env variable (your computer's IP)
 * - Web: Uses localhost
 *
 * ⚠️  Set your computer's IP in apps/mobile/.env:
 *       EXPO_PUBLIC_API_HOST=10.241.244.60
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// CONFIGURATION - pulled from .env or auto-detected
// ============================================

// Your computer's local IP address (for physical device testing)
// Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find this
export const LOCAL_IP = '192.168.43.171';

// Backend port (should match Docker/backend configuration)
export const API_PORT = 3000;

// ============================================
// AUTO-DETECT ENVIRONMENT
// ============================================

/**
 * Resolves the API base URL at call time (not once at import), so Expo Go picks up
 * `hostUri` once Metro is ready, and falls back to LAN IP when it is not.
 */
export function getApiUrl(): string {
  if (!__DEV__) {
    return 'https://api.your-production-domain.com/api';
  }

  if (Platform.OS === 'web') {
    return `http://localhost:${API_PORT}/api`;
  }

  const isExpoGo = Constants.appOwnership === 'expo';
  const hostUri = Constants.expoConfig?.hostUri;

  if (isExpoGo && hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `http://${hostIp}:${API_PORT}/api`;
  }

  // Expo Go: right after dev-server restart, hostUri can be missing briefly — use LAN IP
  if (isExpoGo) {
    const raw = process.env.EXPO_PUBLIC_API_HOST || LOCAL_IP;
    const ip = String(raw)
      .replace(/^https?:\/\//, '')
      .split('/')[0]
      .trim();
    if (ip) {
      return `http://${ip}:${API_PORT}/api`;
    }
  }

  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return `http://${LOCAL_IP}:${API_PORT}/api`;
  }

  return `http://localhost:${API_PORT}/api`;
}

/**
 * Returns the Expo Go deep-link base (exp://<host>:8081) so Stripe can redirect
 * back into the app after payment. Uses the same host resolution as getApiUrl().
 */
export function getExpoDeepLinkBase(): string {
  const isExpoGo = Constants.appOwnership === 'expo';
  const hostUri = Constants.expoConfig?.hostUri; // e.g. "172.20.10.14:8081"

  if (isExpoGo && hostUri) {
    const hostIp = hostUri.split(':')[0];
    return `exp://${hostIp}:8081`;
  }

  const raw = process.env.EXPO_PUBLIC_API_HOST || LOCAL_IP;
  const ip = String(raw).replace(/^https?:\/\//, '').split('/')[0].trim();
  return `exp://${ip || LOCAL_IP}:8081`;
}

/**
 * Turn stored avatar values (relative /uploads/..., absolute http(s), file URIs)
 * into a string suitable for <Image source={{ uri }} />.
 */
export const resolveAvatarDisplayUri = (
  avatar: string | null | undefined
): string | null => {
  if (avatar == null || avatar === '') return null;
  const v = String(avatar).trim();
  // Stale session blob URLs from persisted cache — never render
  if (v.startsWith('blob:')) return null;
  if (v.startsWith('http://') || v.startsWith('https://')) return v;
  if (v.startsWith('file://') || v.startsWith('content://') || v.startsWith('ph://')) {
    return v;
  }
  if (v.startsWith('/uploads/') || v.startsWith('uploads/')) {
    const base = getApiUrl().replace(/\/api\/?$/, '');
    return `${base}/${v.replace(/^\//, '')}`;
  }
  return v;
};

const buildEndpoints = (base: string) => ({
  AUTH: {
    REGISTER: `${base}/auth/register`,
    LOGIN: `${base}/auth/login`,
    LOGOUT: `${base}/auth/logout`,
    ME: `${base}/auth/me`,
  },
  USERS: {
    BASE: `${base}/users`,
    PROFILE: `${base}/users/profile`,
    PROFILE_PICTURE: `${base}/users/profile-picture`,
  },
  PRODUCTS: {
    BASE: `${base}/products`,
    BY_ID: (id: string) => `${base}/products/${id}`,
    BY_CATEGORY: (categoryId: string) => `${base}/products/category/${categoryId}`,
  },
  CATEGORIES: {
    BASE: `${base}/categories`,
    BY_ID: (id: string) => `${base}/categories/${id}`,
  },
  ORDERS: {
    BASE: `${base}/orders`,
    BY_ID: (id: string) => `${base}/orders/${id}`,
  },
  CART: `${base}/cart`,
  HEALTH: `http://${LOCAL_IP}:${API_PORT}/health`,
});

/** Endpoints that always track the current `getApiUrl()` — call `getApiEndpoints()` when building URLs. */
export function getApiEndpoints() {
  return buildEndpoints(getApiUrl());
}

/**
 * Back-compat named export: older code / default imports expect `API_ENDPOINTS`.
 * Lazily delegates to `getApiEndpoints()` so URLs stay in sync with `getApiUrl()`.
 */
export const API_ENDPOINTS: ReturnType<typeof buildEndpoints> = new Proxy(
  {} as ReturnType<typeof buildEndpoints>,
  {
    get(_, prop: string | symbol) {
      return (getApiEndpoints() as Record<string | symbol, unknown>)[prop];
    },
  }
);

export const API_URL = getApiUrl();

if (__DEV__) {
  console.log('🌐 API Configuration:', {
    platform: Platform.OS,
    apiUrl: getApiUrl(),
    localIp: LOCAL_IP,
    isExpoGo: Constants.appOwnership === 'expo',
    envHost: process.env.EXPO_PUBLIC_API_HOST,
  });
}

export default {
  getApiUrl,
  getApiEndpoints,
  API_ENDPOINTS,
  LOCAL_IP,
  API_PORT,
};
