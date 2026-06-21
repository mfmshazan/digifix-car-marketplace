const OSRM_BASE_URL =
  process.env.OSRM_BASE_URL || 'https://router.project-osrm.org/route/v1/driving';
const ROUTE_CACHE_TTL_MS = Number(process.env.ROUTE_CACHE_TTL_MS || 15000);
const routeCache = new Map();

const isCoordinate = (point) =>
  point &&
  Number.isFinite(Number(point.latitude)) &&
  Number.isFinite(Number(point.longitude));

const normalizeCoordinate = (point) => ({
  latitude: Number(point.latitude),
  longitude: Number(point.longitude),
});

const coordinateKey = (point) =>
  `${Number(point.latitude).toFixed(4)},${Number(point.longitude).toFixed(4)}`;

const getCacheKey = (points) => points.map(coordinateKey).join('|');

const pruneRouteCache = () => {
  const now = Date.now();
  routeCache.forEach((entry, key) => {
    if (now - entry.createdAt > ROUTE_CACHE_TTL_MS * 4) {
      routeCache.delete(key);
    }
  });
};

export const getRoadRoute = async (points) => {
  const normalizedPoints = points.filter(isCoordinate).map(normalizeCoordinate);

  if (normalizedPoints.length < 2) {
    return null;
  }

  const cacheKey = getCacheKey(normalizedPoints);
  const cached = routeCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt <= ROUTE_CACHE_TTL_MS) {
    return cached.route;
  }

  const waypointPath = normalizedPoints
    .map((point) => `${point.longitude},${point.latitude}`)
    .join(';');
  const url =
    `${OSRM_BASE_URL}/${waypointPath}` +
    '?alternatives=false&steps=false&overview=full&geometries=geojson';

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'DigiFix-CarParts/1.0',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    throw new Error(`Road routing request failed with status ${response.status}`);
  }

  const payload = await response.json();
  const route = payload?.routes?.[0];

  if (!route?.geometry?.coordinates?.length) {
    throw new Error('Road routing provider returned no drivable route');
  }

  const result = {
    provider: 'osrm',
    coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
      latitude: Number(latitude),
      longitude: Number(longitude),
    })),
    distanceMeters: Number(route.distance || 0),
    durationSeconds: Number(route.duration || 0),
    etaMinutes: Math.max(1, Math.ceil(Number(route.duration || 0) / 60)),
    generatedAt: new Date().toISOString(),
  };

  routeCache.set(cacheKey, {
    createdAt: Date.now(),
    route: result,
  });
  pruneRouteCache();

  return result;
};

export const buildDeliveryRoadRoute = async ({
  status,
  riderLocation,
  pickup,
  dropoff,
}) => {
  const normalizedStatus = String(status || '').toLowerCase();
  const beforePickup = [
    'pending',
    'available',
    'assigned',
    'accepted',
    'arrived_at_pickup',
  ].includes(normalizedStatus);

  const points = beforePickup
    ? [riderLocation, pickup, dropoff]
    : [riderLocation, dropoff];

  return getRoadRoute(points.filter(Boolean));
};
