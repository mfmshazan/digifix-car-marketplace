import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Platform } from 'react-native';
import { jobsAPI } from './api';
import { isMockSession } from './storage';

let trackingTimer = null;
let appStateSubscription = null;
let currentJobId = null;
let currentIntervalMs = 7000;
let trackingPaused = false;
let trackingInFlight = false;
let lastTrackingError = null;
let usingBackgroundTask = false;

const BACKGROUND_LOCATION_TASK = 'digifix-active-delivery-location';
const ACTIVE_JOB_STORAGE_KEY = '@digifix/active-delivery-job-id';

// Background tasks must be registered in module scope so Android/iOS can invoke
// them even when the rider has opened an external navigation application.
if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
    TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
        if (error) {
            console.error('Background location task failed:', error.message);
            return;
        }

        const locations = data?.locations;
        const latestLocation = Array.isArray(locations)
            ? locations[locations.length - 1]
            : null;
        const jobId = await AsyncStorage.getItem(ACTIVE_JOB_STORAGE_KEY);

        if (!latestLocation || !jobId) {
            return;
        }

        try {
            await jobsAPI.addLocation(jobId, mapCoordsToLocation(latestLocation));
        } catch (taskError) {
            console.error(
                'Background location upload failed:',
                taskError?.message || taskError
            );
        }
    });
}

const SRI_LANKA_MOCK_LOCATION = {
    latitude: 6.9077,
    longitude: 79.8673,
    accuracy: 12,
    speed: 0,
    heading: null,
};

export const LOCATION_ERROR_CODES = {
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
    SERVICES_DISABLED: 'SERVICES_DISABLED',
    UNKNOWN: 'UNKNOWN',
};

const mapCoordsToLocation = (location) => ({
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy:
        typeof location.coords.accuracy === 'number'
            ? location.coords.accuracy
            : null,
    speed:
        typeof location.coords.speed === 'number' ? location.coords.speed : null,
    heading:
        typeof location.coords.heading === 'number'
            ? location.coords.heading
            : null,
    timestamp:
        typeof location.timestamp === 'number' ? location.timestamp : Date.now(),
});

const buildMockLocation = () => ({
    ...SRI_LANKA_MOCK_LOCATION,
    timestamp: Date.now(),
});

const clampTrackingInterval = (intervalMs) => {
    if (!Number.isFinite(intervalMs)) {
        return 7000;
    }

    return Math.min(10000, Math.max(5000, intervalMs));
};

const clearTrackingTimer = () => {
    if (trackingTimer) {
        clearTimeout(trackingTimer);
        trackingTimer = null;
    }
};

const removeAppStateListener = () => {
    if (appStateSubscription) {
        appStateSubscription.remove();
        appStateSubscription = null;
    }
};

export const getLocationTrackingState = () => ({
    jobId: currentJobId,
    intervalMs: currentJobId ? currentIntervalMs : null,
    isTracking: Boolean(currentJobId) && !trackingPaused,
    isPaused: Boolean(currentJobId) && trackingPaused,
    isBackgroundTracking: Boolean(currentJobId) && usingBackgroundTask,
    lastError: lastTrackingError,
});

export const createLocationError = (code, message, cause) => {
    const error = new Error(message);
    error.code = code;
    if (cause) {
        error.cause = cause;
    }
    return error;
};

export const normalizeLocationError = (error) => {
    if (error?.code && Object.values(LOCATION_ERROR_CODES).includes(error.code)) {
        return error;
    }

    const message = error?.message || 'Unable to access location';

    if (/permission/i.test(message) && /denied|granted/i.test(message)) {
        return createLocationError(
            LOCATION_ERROR_CODES.PERMISSION_DENIED,
            'Location permission was denied.',
            error
        );
    }

    if (/services?.*disabled|settings.*unsatisfied/i.test(message)) {
        return createLocationError(
            LOCATION_ERROR_CODES.SERVICES_DISABLED,
            'Location services are disabled on this device.',
            error
        );
    }

    if (/unavailable|timeout|could not|get current location/i.test(message)) {
        return createLocationError(
            LOCATION_ERROR_CODES.LOCATION_UNAVAILABLE,
            'Current GPS coordinates are unavailable right now.',
            error
        );
    }

    return createLocationError(LOCATION_ERROR_CODES.UNKNOWN, message, error);
};

export const getLocationErrorMessage = (error) =>
    normalizeLocationError(error).message;

export const isLocationPermissionDenied = (error) =>
    normalizeLocationError(error).code ===
    LOCATION_ERROR_CODES.PERMISSION_DENIED;

const normalizePermissionResult = (permission) => ({
    granted: Boolean(permission?.granted),
    canAskAgain: permission?.canAskAgain !== false,
    status: permission?.status || 'undetermined',
});

export const requestForegroundLocationPermission = async () => {
    if (Platform.OS === 'web') {
        return {
            granted: true,
            canAskAgain: true,
            status: 'granted',
        };
    }

    try {
        const permission = await Location.requestForegroundPermissionsAsync();
        return normalizePermissionResult(permission);
    } catch (error) {
        throw normalizeLocationError(error);
    }
};

export const requestLocationPermission = requestForegroundLocationPermission;

const ensureForegroundLocationPermission = async () => {
    if (Platform.OS === 'web') {
        return {
            granted: true,
            canAskAgain: true,
            status: 'granted',
        };
    }

    try {
        const existingPermission = await Location.getForegroundPermissionsAsync();

        if (existingPermission?.granted) {
            return normalizePermissionResult(existingPermission);
        }

        const requestedPermission = await requestForegroundLocationPermission();

        if (!requestedPermission.granted) {
            throw createLocationError(
                LOCATION_ERROR_CODES.PERMISSION_DENIED,
                'Location permission was denied.'
            );
        }

        return requestedPermission;
    } catch (error) {
        throw normalizeLocationError(error);
    }
};

export const getCurrentLocation = async () => {
    try {
        if (await isMockSession()) {
            return buildMockLocation();
        }

        await ensureForegroundLocationPermission();

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
        });

        return mapCoordsToLocation(location);
    } catch (error) {
        throw normalizeLocationError(error);
    }
};

const scheduleNextTrackingTick = (delayMs = currentIntervalMs) => {
    clearTrackingTimer();

    if (!currentJobId || trackingPaused) {
        return;
    }

    trackingTimer = setTimeout(() => {
        void sendTrackedLocation();
    }, delayMs);
};

const handleAppStateChange = (nextAppState) => {
    if (!currentJobId) {
        return;
    }

    if (nextAppState === 'active') {
        trackingPaused = false;
        if (!usingBackgroundTask) {
            scheduleNextTrackingTick(0);
        }
        return;
    }

    trackingPaused = !usingBackgroundTask;
    clearTrackingTimer();
};

const ensureAppStateSubscription = () => {
    if (Platform.OS === 'web' || appStateSubscription) {
        return;
    }

    appStateSubscription = AppState.addEventListener(
        'change',
        handleAppStateChange
    );
};

const sendTrackedLocation = async () => {
    if (!currentJobId || trackingPaused || trackingInFlight) {
        return;
    }

    trackingInFlight = true;

    try {
        const location = await getCurrentLocation();
        await jobsAPI.addLocation(currentJobId, location);
        lastTrackingError = null;
    } catch (error) {
        lastTrackingError = getLocationErrorMessage(error);
        console.error('Error sending location update:', lastTrackingError);
    } finally {
        trackingInFlight = false;

        if (currentJobId && !trackingPaused && !usingBackgroundTask) {
            scheduleNextTrackingTick();
        }
    }
};

const startBackgroundLocationTask = async (jobId, intervalMs) => {
    if (Platform.OS === 'web' || !(await TaskManager.isAvailableAsync())) {
        return false;
    }

    const backgroundPermission = await Location.requestBackgroundPermissionsAsync();
    if (!backgroundPermission.granted) {
        return false;
    }

    await AsyncStorage.setItem(ACTIVE_JOB_STORAGE_KEY, String(jobId));

    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(
        BACKGROUND_LOCATION_TASK
    );
    if (alreadyStarted) {
        await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.High,
        timeInterval: intervalMs,
        distanceInterval: 5,
        deferredUpdatesInterval: intervalMs,
        pausesUpdatesAutomatically: false,
        activityType: Location.ActivityType.AutomotiveNavigation,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
            notificationTitle: 'Digifix delivery in progress',
            notificationBody: 'Sharing your live location with the customer',
            notificationColor: '#1A7A4A',
            killServiceOnDestroy: false,
        },
    });

    return true;
};

export const startLocationTracking = async (jobId, options = {}) => {
    const intervalMs = clampTrackingInterval(options.intervalMs ?? 7000);

    if (!jobId) {
        return getLocationTrackingState();
    }

    if (await isMockSession()) {
        currentJobId = jobId;
        currentIntervalMs = intervalMs;
        trackingPaused = false;
        lastTrackingError = null;
        console.log('Mock location tracking started for job:', jobId);
        return getLocationTrackingState();
    }

    try {
        await ensureForegroundLocationPermission();

        const isDuplicateStart =
            currentJobId === jobId &&
            currentIntervalMs === intervalMs &&
            (trackingTimer !== null ||
                trackingInFlight ||
                trackingPaused ||
                usingBackgroundTask);

        if (isDuplicateStart) {
            return getLocationTrackingState();
        }

        if (currentJobId && currentJobId !== jobId) {
            await stopLocationTracking();
        }

        currentJobId = jobId;
        currentIntervalMs = intervalMs;
        lastTrackingError = null;
        trackingPaused =
            Platform.OS !== 'web' && AppState.currentState !== 'active';

        ensureAppStateSubscription();

        try {
            usingBackgroundTask = await startBackgroundLocationTask(
                jobId,
                intervalMs
            );
        } catch (backgroundError) {
            usingBackgroundTask = false;
            console.warn(
                'Background tracking unavailable; using foreground tracking:',
                getLocationErrorMessage(backgroundError)
            );
        }

        // Upload immediately so the customer sees the rider as soon as the job
        // is accepted. The OS-managed task supplies subsequent background points.
        await sendTrackedLocation();

        if (!usingBackgroundTask && !trackingPaused) {
            scheduleNextTrackingTick();
        }

        console.log('Location tracking started for job:', jobId);
        return getLocationTrackingState();
    } catch (error) {
        const normalizedError = normalizeLocationError(error);
        lastTrackingError = normalizedError.message;
        console.error(
            'Error starting location tracking:',
            normalizedError.message
        );
        throw normalizedError;
    }
};

export const stopLocationTracking = async () => {
    clearTrackingTimer();
    removeAppStateListener();

    const hadTrackingSession = Boolean(currentJobId || trackingInFlight);

    try {
        if (
            Platform.OS !== 'web' &&
            (await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK))
        ) {
            await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
        }
        await AsyncStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    } catch (error) {
        console.warn('Could not stop background location task:', error?.message || error);
    }

    currentJobId = null;
    currentIntervalMs = 7000;
    trackingPaused = false;
    trackingInFlight = false;
    usingBackgroundTask = false;
    lastTrackingError = null;

    if (hadTrackingSession) {
        console.log('Location tracking stopped');
    }

    return getLocationTrackingState();
};

export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
