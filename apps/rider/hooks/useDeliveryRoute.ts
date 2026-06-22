import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    fetchRoute,
    getRouteErrorMessage,
    type DeliveryRoute,
    type RouteCoordinate,
    type RouteProvider,
} from '../services/route';

type UseDeliveryRouteOptions = {
    origin: RouteCoordinate | null;
    destination: RouteCoordinate | null;
    provider?: RouteProvider;
    enabled?: boolean;
};

type UseDeliveryRouteResult = {
    route: DeliveryRoute | null;
    isLoading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
};

const areCoordinatesEqual = (
    a: RouteCoordinate | null,
    b: RouteCoordinate | null
) =>
    Boolean(
        a &&
        b &&
        a.latitude === b.latitude &&
        a.longitude === b.longitude
    );

export const useDeliveryRoute = ({
    origin,
    destination,
    provider,
    enabled = true,
}: UseDeliveryRouteOptions): UseDeliveryRouteResult => {
    const [route, setRoute] = useState<DeliveryRoute | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const canFetchRoute = enabled && Boolean(origin && destination);
    const requestKey = useMemo(
        () =>
            origin && destination
                ? `${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}:${provider || 'default'}`
                : 'disabled',
        [destination, origin, provider]
    );

    const refetch = useCallback(async () => {
        if (!origin || !destination || !enabled) {
            setRoute(null);
            setError(null);
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const nextRoute = await fetchRoute({
                origin,
                destination,
                provider,
            });

            setRoute((previousRoute) => {
                if (
                    previousRoute &&
                    areCoordinatesEqual(previousRoute.coordinates[0] || null, nextRoute.coordinates[0] || null) &&
                    previousRoute.distanceMeters === nextRoute.distanceMeters &&
                    previousRoute.durationSeconds === nextRoute.durationSeconds
                ) {
                    return previousRoute;
                }

                return nextRoute;
            });
        } catch (routeError) {
            setRoute(null);
            setError(getRouteErrorMessage(routeError));
        } finally {
            setIsLoading(false);
        }
    }, [destination, enabled, origin, provider]);

    useEffect(() => {
        if (!canFetchRoute) {
            setRoute(null);
            setError(null);
            return;
        }

        void refetch();
    }, [canFetchRoute, refetch, requestKey]);

    return {
        route,
        isLoading,
        error,
        refetch,
    };
};
