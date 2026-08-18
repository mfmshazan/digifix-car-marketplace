/**
 * API Configuration — Rider App
 *
 * IP is resolved DYNAMICALLY from Expo Metro at runtime.
 * You do NOT need to update this file or the .env when changing WiFi networks.
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL  (full URL override, e.g. for production)
 *   2. Constants.expoConfig.hostUri  (auto-detected by Expo Go = your PC's LAN IP)
 *   3. EXPO_PUBLIC_API_HOST  (manual fallback, set in .env if auto-detect fails)
 *   4. localhost (last resort)
 */

import Constants from 'expo-constants';

const PORT = process.env.EXPO_PUBLIC_API_PORT || '3000';

const normalizeApiUrl = (raw) => {
    if (!raw) return null;
    const trimmed = String(raw).trim().replace(/\/+$/, '');
    if (!trimmed) return null;
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `http://${trimmed}`;
    return withProtocol.endsWith('/api') ? withProtocol : `${withProtocol}/api`;
};

const getApiUrl = () => {
    // 1. Full URL override from .env (e.g. production URL)
    const envUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
    if (envUrl) return envUrl;

    // 2. Auto-detect from Expo Go / Metro (works on ANY WiFi automatically)
    const hostUri = Constants.expoConfig?.hostUri; // e.g. "10.60.55.60:8081"
    if (hostUri) {
        const hostIp = hostUri.split(':')[0];
        return `http://${hostIp}:${PORT}/api`;
    }

    // 3. Manual fallback from .env (only needed if running outside Expo Go)
    const envHost = process.env.EXPO_PUBLIC_API_HOST;
    if (envHost) return normalizeApiUrl(`${envHost}:${PORT}`);

    // 4. Last resort
    return `http://localhost:${PORT}/api`;
};

export const API_BASE_URL = getApiUrl();

if (__DEV__) {
    console.log('🌐 Rider API:', {
        url: API_BASE_URL,
        hostUri: Constants.expoConfig?.hostUri,
        envHost: process.env.EXPO_PUBLIC_API_HOST,
    });
}

// Admin API key for testing (matches backend .env)
export const ADMIN_API_KEY = 'test_admin_key_change_in_production';

// Token refresh settings
export const TOKEN_REFRESH_THRESHOLD = 60 * 1000; // Refresh 1 minute before expiry

// Route service configuration
const normalizeOptionalCredential = (value) => {
    const credential = String(value || '').trim();
    if (!credential || /^(your_|replace_|placeholder|change_me)/i.test(credential)) {
        return '';
    }
    return credential;
};

export const ROUTE_PROVIDER = process.env.EXPO_PUBLIC_ROUTE_PROVIDER || 'google';
export const MAPBOX_ACCESS_TOKEN = normalizeOptionalCredential(
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
);
export const GOOGLE_MAPS_API_KEY = normalizeOptionalCredential(
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY
);
