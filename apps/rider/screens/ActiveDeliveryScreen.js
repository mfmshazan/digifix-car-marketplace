import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import {
    SurfaceCard,
    StatusBadge,
    SectionHeader,
} from '../components/Common';
import DeliveryActionControls from '../components/DeliveryActionControls';
import DeliveryStatusTimeline from '../components/DeliveryStatusTimeline';
import { useDeliveryRoute } from '../hooks/useDeliveryRoute';
import { useLiveLocationTracking } from '../hooks/useLiveLocationTracking';
import {
    getCurrentLocation,
    getLocationErrorMessage,
} from '../services/location';
import { fetchDriverHome, selectActiveDelivery } from '../store/slices/homeSlice';
import { colors, spacing, typography, radii } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

const toneForStatus = (status) => {
    if (['accepted', 'picked_up', 'in_transit', 'delivered'].includes(status)) {
        return 'success';
    }
    if (['assigned', 'arrived_at_pickup', 'arrived_at_dropoff'].includes(status)) {
        return 'info';
    }
    if (['failed', 'cancelled'].includes(status)) {
        return 'danger';
    }
    return 'warning';
};

const toCoordinate = (latitude, longitude) => {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return null;
    }

    return {
        latitude: lat,
        longitude: lng,
    };
};

const formatStatusLabel = (status) =>
    (status || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDistance = (distanceKm) => {
    if (distanceKm === null || distanceKm === undefined) {
        return 'Route pending';
    }

    if (distanceKm < 1) {
        return `${Math.round(distanceKm * 1000)} m`;
    }

    return `${distanceKm.toFixed(1)} km`;
};

const MapMarkerIcon = ({ name, color }) => (
    <View style={styles.mapMarkerWrap}>
        <View style={[styles.mapMarkerBubble, { backgroundColor: color }]}>
            <Ionicons name={name} size={23} color="#FFFFFF" />
        </View>
        <View style={[styles.mapMarkerPointer, { borderTopColor: color }]} />
    </View>
);

const buildMapRegion = (coordinates) => {
    const points = coordinates.filter(Boolean);

    if (!points.length) {
        return {
            latitude: 6.9271,
            longitude: 79.8612,
            latitudeDelta: 0.12,
            longitudeDelta: 0.12,
        };
    }

    const latitudes = points.map((point) => point.latitude);
    const longitudes = points.map((point) => point.longitude);
    const minLatitude = Math.min(...latitudes);
    const maxLatitude = Math.max(...latitudes);
    const minLongitude = Math.min(...longitudes);
    const maxLongitude = Math.max(...longitudes);

    return {
        latitude: (minLatitude + maxLatitude) / 2,
        longitude: (minLongitude + maxLongitude) / 2,
        latitudeDelta: Math.max(0.02, (maxLatitude - minLatitude) * 1.8),
        longitudeDelta: Math.max(0.02, (maxLongitude - minLongitude) * 1.8),
    };
};

export default function ActiveDeliveryScreen({ route: navigationRoute, navigation }) {
    const dispatch = useDispatch();
    const activeDelivery = useSelector(selectActiveDelivery);
    const routeJobId = navigationRoute.params?.jobId;
    const initialJob =
        navigationRoute.params?.job ||
        (activeDelivery && activeDelivery.id === routeJobId ? activeDelivery : null);
    const mapRef = useRef(null);
    const [job, setJob] = useState(initialJob);
    const [driverLocation, setDriverLocation] = useState(null);
    const [routeError, setRouteError] = useState(null);
    const [isResolvingRoute, setIsResolvingRoute] = useState(true);
    const { isTracking, isPaused, trackingError } =
        useLiveLocationTracking({
            jobId: job?.id,
            status: job?.status,
            intervalMs: 7000,
        });

    useEffect(() => {
        if (!job && routeJobId) {
            void dispatch(fetchDriverHome());
        }
    }, [dispatch, job, routeJobId]);

    useEffect(() => {
        if (navigationRoute.params?.job) {
            setJob(navigationRoute.params.job);
            return;
        }

        if (activeDelivery && (!routeJobId || activeDelivery.id === routeJobId)) {
            setJob(activeDelivery);
        }
    }, [activeDelivery, navigationRoute.params?.job, routeJobId]);

    useEffect(() => {
        if (!job) {
            return undefined;
        }

        let isMounted = true;

        const loadDriverLocation = async () => {
            try {
                const location = await getCurrentLocation();

                if (!isMounted) {
                    return;
                }

                setDriverLocation(location);
                setRouteError(null);
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setRouteError(getLocationErrorMessage(error));
            } finally {
                if (isMounted) {
                    setIsResolvingRoute(false);
                }
            }
        };

        setIsResolvingRoute(true);
        void loadDriverLocation();

        const intervalId = setInterval(() => {
            void loadDriverLocation();
        }, 10000);

        return () => {
            isMounted = false;
            clearInterval(intervalId);
        };
    }, [job?.id]);

    const pickupCoordinate = useMemo(
        () => toCoordinate(job?.pickupLatitude ?? job?.pickup_latitude, job?.pickupLongitude ?? job?.pickup_longitude),
        [job]
    );
    const dropoffCoordinate = useMemo(
        () => toCoordinate(job?.dropoffLatitude ?? job?.dropoff_latitude, job?.dropoffLongitude ?? job?.dropoff_longitude),
        [job]
    );
    const driverCoordinate = useMemo(
        () =>
            driverLocation
                ? {
                    latitude: driverLocation.latitude,
                    longitude: driverLocation.longitude,
                }
                : null,
        [driverLocation]
    );

    const nextStopCoordinate = useMemo(() => {
        if (['accepted', 'arrived_at_pickup'].includes(job?.status)) {
            return pickupCoordinate;
        }

        if (['picked_up', 'in_transit', 'arrived_at_dropoff', 'delivered'].includes(job?.status)) {
            return dropoffCoordinate;
        }

        return pickupCoordinate || dropoffCoordinate;
    }, [dropoffCoordinate, job?.status, pickupCoordinate]);

    const openStopInMaps = () => {
        if (!nextStopCoordinate) {
            return;
        }

        const destination = `${nextStopCoordinate.latitude},${nextStopCoordinate.longitude}`;
        void Linking.openURL(
            `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`
        );
    };

    const {
        route: deliveryRoute,
        isLoading: isLoadingRoute,
        error: routeServiceError,
    } = useDeliveryRoute({
        origin: driverCoordinate,
        destination: nextStopCoordinate,
        enabled: Boolean(driverCoordinate && nextStopCoordinate),
    });

    const routeCoordinates = useMemo(() => {
        if (deliveryRoute?.coordinates?.length) {
            return deliveryRoute.coordinates;
        }

        return [];
    }, [deliveryRoute?.coordinates, driverCoordinate, nextStopCoordinate]);

    const distanceRemainingKm = deliveryRoute?.distanceKm ?? null;
    const etaMinutes = deliveryRoute?.etaMinutes ?? null;

    useEffect(() => {
        if (!mapRef.current || routeCoordinates.length < 2) {
            return;
        }

        mapRef.current.fitToCoordinates(routeCoordinates, {
            animated: true,
            edgePadding: {
                top: 100,
                right: 60,
                bottom: 200,
                left: 60,
            },
        });
    }, [routeCoordinates]);

    if (!job) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No active delivery selected.</Text>
            </View>
        );
    }

    const routeUnavailable =
        !deliveryRoute?.coordinates?.length || routeCoordinates.length < 2;
    const mapRegion = buildMapRegion([
        driverCoordinate,
        pickupCoordinate,
        dropoffCoordinate,
    ]);

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion}
            >
                {driverCoordinate ? (
                    <Marker
                        coordinate={driverCoordinate}
                        title="Your Location"
                        description="Live driver position"
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <MapMarkerIcon name="bicycle" color={colors.accent} />
                    </Marker>
                ) : null}

                {pickupCoordinate ? (
                    <Marker
                        coordinate={pickupCoordinate}
                        title="Pickup"
                        description={job.pickupAddress ?? job.pickup_address ?? 'Shop pickup location'}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <MapMarkerIcon name="storefront" color={colors.primary} />
                    </Marker>
                ) : null}

                {dropoffCoordinate ? (
                    <Marker
                        coordinate={dropoffCoordinate}
                        title="Drop-off"
                        description={job.dropoffAddress ?? job.dropoff_address ?? 'Customer delivery location'}
                        anchor={{ x: 0.5, y: 1 }}
                    >
                        <MapMarkerIcon name="home" color={colors.secondary} />
                    </Marker>
                ) : null}

                {routeCoordinates.length >= 2 ? (
                    <Polyline
                        coordinates={routeCoordinates}
                        strokeColor={colors.secondary}
                        strokeWidth={6}
                    />
                ) : null}
            </MapView>

            <View style={styles.mapOverlay}>
                <View style={styles.mapOverlayTop}>
                    <View style={styles.liveRouteBadge}>
                        <View style={styles.liveRouteDot} />
                        <Text style={styles.liveRouteText}>LIVE ROUTE</Text>
                    </View>
                    <StatusBadge
                        label={formatStatusLabel(job.status)}
                        tone={toneForStatus(job.status)}
                    />
                </View>
                <Text style={styles.mapOverlayOrder}>
                    {job.orderNumber ?? job.order_number}
                </Text>
                <View style={styles.mapOverlayMetrics}>
                    <View style={styles.mapOverlayMetric}>
                        <Ionicons name="time-outline" size={15} color="#BFDBFE" />
                        <Text style={styles.mapOverlayMetricText}>
                            {etaMinutes ? `${etaMinutes} min` : 'Calculating ETA'}
                        </Text>
                    </View>
                    <View style={styles.mapOverlayMetric}>
                        <Ionicons name="navigate-outline" size={15} color="#BFDBFE" />
                        <Text style={styles.mapOverlayMetricText}>
                            {formatDistance(distanceRemainingKm)}
                        </Text>
                    </View>
                </View>
            </View>

            <ScrollView
                style={styles.sheet}
                contentContainerStyle={styles.sheetContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.sheetHandle} />
                <SectionHeader
                    eyebrow="Route operations"
                    title="Delivery Control"
                    subtitle="Follow the road route, update each checkpoint, and keep customer tracking accurate."
                />

                <View style={styles.metricGrid}>
                    <SurfaceCard style={styles.metricCard}>
                        <View style={styles.metricIcon}>
                            <Ionicons name="time-outline" size={18} color={colors.secondary} />
                        </View>
                        <Text style={styles.metricLabel}>ETA</Text>
                        <Text style={styles.metricValue}>
                            {etaMinutes ? `${etaMinutes} min` : isLoadingRoute ? 'Loading' : 'Calculating'}
                        </Text>
                    </SurfaceCard>

                    <SurfaceCard style={styles.metricCard}>
                        <View style={[styles.metricIcon, styles.distanceMetricIcon]}>
                            <Ionicons name="navigate-outline" size={18} color={colors.accent} />
                        </View>
                        <Text style={styles.metricLabel}>Distance Left</Text>
                        <Text style={styles.metricValue}>
                            {formatDistance(distanceRemainingKm)}
                        </Text>
                    </SurfaceCard>

                    <SurfaceCard style={styles.metricCardWide}>
                        <View style={styles.locationMetricRow}>
                            <View style={[styles.metricIcon, styles.locationMetricIcon]}>
                                <Ionicons name="radio-outline" size={18} color={colors.successDark} />
                            </View>
                            <View style={styles.locationMetricCopy}>
                                <Text style={styles.metricLabel}>Live GPS Broadcast</Text>
                                <Text style={styles.metricValueSmall}>
                                    {driverCoordinate
                                        ? `${driverCoordinate.latitude.toFixed(5)}, ${driverCoordinate.longitude.toFixed(5)}`
                                        : isResolvingRoute
                                            ? 'Resolving GPS...'
                                            : 'Unavailable'}
                                </Text>
                            </View>
                        </View>
                    </SurfaceCard>
                </View>

                {routeUnavailable ? (
                    <SurfaceCard style={styles.fallbackCard}>
                        <Text style={styles.cardTitle}>Route Unavailable</Text>
                        <Text style={styles.body}>
                            {routeServiceError ||
                                routeError ||
                                'We could not build a live route right now. Pickup and drop-off markers are still shown on the map.'}
                        </Text>
                        {nextStopCoordinate ? (
                            <TouchableOpacity style={styles.callButton} onPress={openStopInMaps}>
                                <Ionicons name="navigate-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.callButtonText}>Open in Maps</Text>
                            </TouchableOpacity>
                        ) : null}
                    </SurfaceCard>
                ) : null}

                <SurfaceCard style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Pickup</Text>
                    <Text style={styles.address}>
                        {job.pickupAddress ?? job.pickup_address}
                    </Text>
                    {job.pickupContactName || job.pickup_contact_name ? (
                        <Text style={styles.contact}>
                            Contact: {job.pickupContactName ?? job.pickup_contact_name}
                        </Text>
                    ) : null}
                    {job.pickupContactPhone || job.pickup_contact_phone ? (
                        <Text style={styles.contact}>
                            Phone: {job.pickupContactPhone ?? job.pickup_contact_phone}
                        </Text>
                    ) : null}
                </SurfaceCard>

                <SurfaceCard style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Drop-off</Text>
                    <Text style={styles.address}>
                        {job.dropoffAddress ?? job.dropoff_address}
                    </Text>
                    <Text style={styles.contact}>
                        Customer: {job.customerName ?? job.customer_name}
                    </Text>
                    <Text style={styles.contact}>
                        Phone: {job.customerPhone ?? job.customer_phone}
                    </Text>
                    {(job.customerPhone ?? job.customer_phone) ? (
                        <TouchableOpacity
                            style={styles.callButton}
                            onPress={() => Linking.openURL(`tel:${job.customerPhone ?? job.customer_phone}`)}
                        >
                            <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                            <Text style={styles.callButtonText}>Call Customer</Text>
                        </TouchableOpacity>
                    ) : null}
                </SurfaceCard>

                <SurfaceCard style={styles.detailCard}>
                    <Text style={styles.cardTitle}>Live Tracking</Text>
                    <Text style={styles.body}>
                        {isTracking
                            ? 'Driver location is being sent to the backend every 7 seconds.'
                            : isPaused
                                ? 'Tracking is paused while the app is in the background.'
                                : 'Tracking will start automatically when this delivery is in progress.'}
                    </Text>
                    {trackingError ? (
                        <Text style={styles.trackingError}>{trackingError}</Text>
                    ) : null}
                </SurfaceCard>

                {job.itemSummary || job.items_description ? (
                    <SurfaceCard style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Items</Text>
                        <Text style={styles.body}>
                            {job.itemSummary ?? job.items_description}
                        </Text>
                    </SurfaceCard>
                ) : null}

                {job.specialInstructions || job.special_instructions ? (
                    <SurfaceCard style={styles.detailCard}>
                        <Text style={styles.cardTitle}>Special Instructions</Text>
                        <Text style={styles.body}>
                            {job.specialInstructions ?? job.special_instructions}
                        </Text>
                    </SurfaceCard>
                ) : null}

                <DeliveryStatusTimeline status={job.status} />

                <DeliveryActionControls
                    delivery={job}
                    onDeliveryChange={setJob}
                    onActionSuccess={({ action, delivery: nextDelivery }) => {
                        if (action === 'complete_delivery') {
                            navigation.navigate('ProofOfDelivery', {
                                jobId: nextDelivery.id,
                            });
                        }
                    }}
                />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    emptyWrap: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    emptyText: {
        ...typography.body,
    },
    map: {
        height: 320,
    },
    mapOverlay: {
        position: 'absolute',
        top: spacing.md,
        left: spacing.md,
        right: spacing.md,
        zIndex: 5,
        borderRadius: radii.md,
        padding: spacing.md,
        backgroundColor: 'rgba(15,23,42,0.94)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    mapOverlayTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.sm,
    },
    liveRouteBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    liveRouteDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    liveRouteText: {
        ...typography.overline,
        color: '#A7F3D0',
    },
    mapOverlayOrder: {
        ...typography.h3,
        color: colors.textOnDark,
        marginTop: spacing.sm,
    },
    mapOverlayMetrics: {
        flexDirection: 'row',
        gap: spacing.md,
        marginTop: spacing.sm,
    },
    mapOverlayMetric: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    mapOverlayMetricText: {
        ...typography.caption,
        color: colors.textOnDarkMuted,
    },
    mapMarkerWrap: {
        alignItems: 'center',
    },
    mapMarkerBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.24,
        shadowRadius: 5,
        elevation: 5,
    },
    mapMarkerPointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 9,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        marginTop: -2,
    },
    sheet: {
        flex: 1,
        marginTop: -spacing.lg,
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        backgroundColor: colors.background,
    },
    sheetContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    sheetHandle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.borderStrong,
        alignSelf: 'center',
        marginTop: -8,
        marginBottom: spacing.lg,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    metricCard: {
        flexGrow: 1,
        flexBasis: '47%',
        minWidth: 140,
        padding: spacing.md,
    },
    metricCardWide: {
        width: '100%',
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
        marginBottom: spacing.sm,
    },
    distanceMetricIcon: {
        backgroundColor: colors.accentSoft,
    },
    locationMetricRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    locationMetricIcon: {
        backgroundColor: colors.successSoft,
        marginBottom: 0,
        marginRight: spacing.sm,
    },
    locationMetricCopy: {
        flex: 1,
    },
    metricLabel: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    metricValue: {
        ...typography.h2,
        color: colors.text,
    },
    metricValueSmall: {
        ...typography.body,
        color: colors.text,
    },
    fallbackCard: {
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surfaceMuted,
    },
    detailCard: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    cardTitle: {
        ...typography.h3,
        marginBottom: spacing.sm,
    },
    address: {
        ...typography.body,
        marginBottom: spacing.xs,
    },
    contact: {
        ...typography.bodySmall,
    },
    body: {
        ...typography.body,
    },
    trackingError: {
        ...typography.bodySmall,
        color: colors.danger,
        marginTop: spacing.sm,
    },
    callButton: {
        marginTop: spacing.sm,
        backgroundColor: colors.secondary,
        borderRadius: radii.sm,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    callButtonText: {
        ...typography.body,
        color: '#FFFFFF',
        fontWeight: '600',
    },
});
