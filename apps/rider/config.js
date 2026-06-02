// API Configuration
// The rider app uses the same DigiFix backend as the marketplace apps.
const DEFAULT_BACKEND_HOST = '192.168.8.171';
const DEFAULT_BACKEND_PORT = '3000';

const normalizeApiUrl = (raw) => {
    if (!raw) return null;

    const trimmed = String(raw).trim().replace(/\/+$/, '');
    if (!trimmed) return null;

    const withProtocol = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `http://${trimmed}`;

    return withProtocol.endsWith('/api') ? withProtocol : `${withProtocol}/api`;
};

const envApiUrl = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL);
const envApiHost = process.env.EXPO_PUBLIC_API_HOST;

export const API_BASE_URL =
    envApiUrl ||
    normalizeApiUrl(`${envApiHost || DEFAULT_BACKEND_HOST}:${DEFAULT_BACKEND_PORT}`);

// Admin API key for testing (matches backend .env)
export const ADMIN_API_KEY = 'test_admin_key_change_in_production';

// Token refresh settings
export const TOKEN_REFRESH_THRESHOLD = 60 * 1000; // Refresh 1 minute before expiry

// Route service configuration
export const ROUTE_PROVIDER = process.env.EXPO_PUBLIC_ROUTE_PROVIDER || 'mapbox';
export const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || '';
export const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';
