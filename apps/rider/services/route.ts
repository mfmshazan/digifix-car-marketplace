import {
    GOOGLE_MAPS_API_KEY,
    MAPBOX_ACCESS_TOKEN,
    ROUTE_PROVIDER,
} from '../config';

export type RouteProvider = 'mapbox' | 'google';

export type RouteCoordinate = {
    latitude: number;
    longitude: number;
};

export type RouteRequest = {
    origin: RouteCoordinate;
    destination: RouteCoordinate;
    provider?: RouteProvider;
    languageCode?: string;
};

export type DeliveryRoute = {
    provider: RouteProvider;
    coordinates: RouteCoordinate[];
    distanceMeters: number;
    distanceKm: number;
    durationSeconds: number;
    etaMinutes: number;
};

export type RouteServiceErrorCode =
    | 'CONFIG_MISSING'
    | 'REQUEST_FAILED'
    | 'ROUTE_UNAVAILABLE'
    | 'PARSE_FAILED';

export type RouteServiceError = Error & {
    code: RouteServiceErrorCode;
    cause?: unknown;
};

const MAPBOX_DIRECTIONS_BASE_URL =
    'https://api.mapbox.com/directions/v5/mapbox/driving-traffic';
const GOOGLE_ROUTES_BASE_URL =
    'https://routes.googleapis.com/directions/v2:computeRoutes';

const clampEtaMinutes = (durationSeconds: number) =>
    Math.max(1, Math.round(durationSeconds / 60));

const toDistanceKm = (distanceMeters: number) => distanceMeters / 1000;

const createRouteServiceError = (
    code: RouteServiceErrorCode,
    message: string,
    cause?: unknown
): RouteServiceError => {
    const error = new Error(message) as RouteServiceError;
    error.code = code;
    if (cause) {
        error.cause = cause;
    }
    return error;
};

const parseDurationSeconds = (duration: string) => {
    const parsed = Number.parseFloat(duration.replace(/s$/, ''));

    if (!Number.isFinite(parsed)) {
        throw createRouteServiceError(
            'PARSE_FAILED',
            `Could not parse route duration "${duration}".`
        );
    }

    return parsed;
};

const isValidCoordinate = (value: RouteCoordinate | null | undefined): value is RouteCoordinate =>
    Boolean(
        value &&
        Number.isFinite(value.latitude) &&
        Number.isFinite(value.longitude)
    );

const buildRouteResult = (
    provider: RouteProvider,
    coordinates: RouteCoordinate[],
    distanceMeters: number,
    durationSeconds: number
): DeliveryRoute => ({
    provider,
    coordinates,
    distanceMeters,
    distanceKm: toDistanceKm(distanceMeters),
    durationSeconds,
    etaMinutes: clampEtaMinutes(durationSeconds),
});

const decodeGoogleEncodedPolyline = (encoded: string): RouteCoordinate[] => {
    const coordinates: RouteCoordinate[] = [];
    let index = 0;
    let latitude = 0;
    let longitude = 0;

    while (index < encoded.length) {
        let result = 0;
        let shift = 0;
        let byte = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const latitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
        latitude += latitudeDelta;

        result = 0;
        shift = 0;

        do {
            byte = encoded.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        const longitudeDelta = result & 1 ? ~(result >> 1) : result >> 1;
        longitude += longitudeDelta;

        coordinates.push({
            latitude: latitude / 1e5,
            longitude: longitude / 1e5,
        });
    }

    return coordinates;
};

const fetchMapboxRoute = async ({
    origin,
    destination,
    languageCode = 'en',
}: RouteRequest): Promise<DeliveryRoute> => {
    if (!MAPBOX_ACCESS_TOKEN) {
        throw createRouteServiceError(
            'CONFIG_MISSING',
            'Mapbox route service is not configured. Set EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN.'
        );
    }

    const coordinatesParam = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`;
    const url =
        `${MAPBOX_DIRECTIONS_BASE_URL}/${coordinatesParam}` +
        `?access_token=${encodeURIComponent(MAPBOX_ACCESS_TOKEN)}` +
        '&alternatives=false' +
        '&geometries=geojson' +
        '&overview=full' +
        '&steps=false' +
        `&language=${encodeURIComponent(languageCode)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw createRouteServiceError(
            'REQUEST_FAILED',
            `Mapbox route request failed with status ${response.status}.`
        );
    }

    const payload = await response.json();
    const route = payload?.routes?.[0];

    if (!route?.geometry?.coordinates?.length) {
        throw createRouteServiceError(
            'ROUTE_UNAVAILABLE',
            'Mapbox did not return a route geometry.'
        );
    }

    const coordinates = route.geometry.coordinates.map(
        ([longitude, latitude]: [number, number]) => ({
            latitude,
            longitude,
        })
    );

    return buildRouteResult(
        'mapbox',
        coordinates,
        Number(route.distance ?? 0),
        Number(route.duration ?? 0)
    );
};

const fetchGoogleRoute = async ({
    origin,
    destination,
    languageCode = 'en-US',
}: RouteRequest): Promise<DeliveryRoute> => {
    if (!GOOGLE_MAPS_API_KEY) {
        throw createRouteServiceError(
            'CONFIG_MISSING',
            'Google route service is not configured. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY.'
        );
    }

    const response = await fetch(GOOGLE_ROUTES_BASE_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
            'X-Goog-FieldMask':
                'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
        },
        body: JSON.stringify({
            origin: {
                location: {
                    latLng: {
                        latitude: origin.latitude,
                        longitude: origin.longitude,
                    },
                },
            },
            destination: {
                location: {
                    latLng: {
                        latitude: destination.latitude,
                        longitude: destination.longitude,
                    },
                },
            },
            travelMode: 'DRIVE',
            routingPreference: 'TRAFFIC_AWARE',
            polylineQuality: 'HIGH_QUALITY',
            polylineEncoding: 'ENCODED_POLYLINE',
            computeAlternativeRoutes: false,
            languageCode,
            units: 'METRIC',
        }),
    });

    if (!response.ok) {
        throw createRouteServiceError(
            'REQUEST_FAILED',
            `Google route request failed with status ${response.status}.`
        );
    }

    const payload = await response.json();
    const route = payload?.routes?.[0];
    const encodedPolyline = route?.polyline?.encodedPolyline;

    if (!route || !encodedPolyline) {
        throw createRouteServiceError(
            'ROUTE_UNAVAILABLE',
            'Google did not return a route polyline.'
        );
    }

    return buildRouteResult(
        'google',
        decodeGoogleEncodedPolyline(encodedPolyline),
        Number(route.distanceMeters ?? 0),
        parseDurationSeconds(String(route.duration ?? '0s'))
    );
};

export const getConfiguredRouteProvider = (): RouteProvider =>
    ROUTE_PROVIDER === 'google' ? 'google' : 'mapbox';

export const isRouteServiceConfigured = (
    provider: RouteProvider = getConfiguredRouteProvider()
) =>
    provider === 'google' ? Boolean(GOOGLE_MAPS_API_KEY) : Boolean(MAPBOX_ACCESS_TOKEN);

export const getRouteErrorMessage = (error: unknown) =>
    error instanceof Error
        ? error.message
        : 'Route service is unavailable right now.';

export const fetchRoute = async (
    request: RouteRequest
): Promise<DeliveryRoute> => {
    if (!isValidCoordinate(request.origin) || !isValidCoordinate(request.destination)) {
        throw createRouteServiceError(
            'PARSE_FAILED',
            'Route origin and destination must contain valid coordinates.'
        );
    }

    const provider = request.provider ?? getConfiguredRouteProvider();
    const fallbackProvider: RouteProvider =
        provider === 'google' ? 'mapbox' : 'google';
    const providers = [provider, fallbackProvider].filter(
        (candidate, index, values) =>
            values.indexOf(candidate) === index &&
            isRouteServiceConfigured(candidate)
    );
    const failures: string[] = [];

    for (const candidate of providers) {
        try {
            if (candidate === 'google') {
                return await fetchGoogleRoute(request);
            }

            return await fetchMapboxRoute(request);
        } catch (error) {
            failures.push(
                `${candidate}: ${getRouteErrorMessage(error)}`
            );
        }
    }

    if (!providers.length) {
        throw createRouteServiceError(
            'CONFIG_MISSING',
            'No real road-routing provider is configured.'
        );
    }

    throw createRouteServiceError(
        'REQUEST_FAILED',
        `Real road route unavailable. ${failures.join(' | ')}`
    );
};
