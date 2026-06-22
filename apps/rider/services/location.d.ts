export type LocationErrorCode =
    | 'PERMISSION_DENIED'
    | 'LOCATION_UNAVAILABLE'
    | 'SERVICES_DISABLED'
    | 'UNKNOWN';

export type LocationPermissionResult = {
    granted: boolean;
    canAskAgain: boolean;
    status: 'granted' | 'denied' | 'undetermined';
};

export type AppLocation = {
    latitude: number;
    longitude: number;
    accuracy: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number;
};

export type LocationTrackingState = {
    jobId: string | number | null;
    intervalMs: number | null;
    isTracking: boolean;
    isPaused: boolean;
    lastError: string | null;
};

export type LocationTrackingOptions = {
    intervalMs?: number;
};

export type LocationServiceError = Error & {
    code: LocationErrorCode;
    cause?: unknown;
};

export const LOCATION_ERROR_CODES: Record<LocationErrorCode, LocationErrorCode>;

export function createLocationError(
    code: LocationErrorCode,
    message: string,
    cause?: unknown
): LocationServiceError;

export function normalizeLocationError(error: unknown): LocationServiceError;

export function getLocationErrorMessage(error: unknown): string;

export function isLocationPermissionDenied(error: unknown): boolean;

export function requestForegroundLocationPermission(): Promise<LocationPermissionResult>;

export function requestLocationPermission(): Promise<LocationPermissionResult>;

export function getCurrentLocation(): Promise<AppLocation>;

export function getLocationTrackingState(): LocationTrackingState;

export function startLocationTracking(
    jobId: string | number,
    options?: LocationTrackingOptions
): Promise<LocationTrackingState>;

export function stopLocationTracking(): Promise<LocationTrackingState>;

export function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number;
