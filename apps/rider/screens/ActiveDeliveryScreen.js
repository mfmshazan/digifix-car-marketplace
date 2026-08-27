import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    PanResponder,
    useWindowDimensions,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import {
    SurfaceCard,
} from '../components/Common';
import DeliveryActionControls from '../components/DeliveryActionControls';
import DeliveryStatusTimeline from '../components/DeliveryStatusTimeline';
import { useDeliveryRoute } from '../hooks/useDeliveryRoute';
import { getCurrentLocation } from '../services/location';
import { fetchDriverHome, selectActiveDelivery } from '../store/slices/homeSlice';
import { colors, spacing, typography, radii } from '../styles/theme';
import { Ionicons } from '@expo/vector-icons';

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
    const { height: screenHeight } = useWindowDimensions();
    const sheetHeight = Math.min(720, Math.max(480, screenHeight * 0.82));
    const collapsedSheetHeight = 132;
    const collapsedTranslateY = Math.max(0, sheetHeight - collapsedSheetHeight);
    const dispatch = useDispatch();
    const activeDelivery = useSelector(selectActiveDelivery);
    const routeJobId = navigationRoute.params?.jobId;
    const initialJob =
        navigationRoute.params?.job ||
        (activeDelivery && activeDelivery.id === routeJobId ? activeDelivery : null);
    const mapRef = useRef(null);
    const sheetTranslateY = useRef(new Animated.Value(collapsedTranslateY)).current;
    const sheetPositionRef = useRef(collapsedTranslateY);
    const sheetGestureStartRef = useRef(collapsedTranslateY);
    const [isSheetExpanded, setIsSheetExpanded] = useState(false);
    const [job, setJob] = useState(initialJob);
    const [liveDriverCoordinate, setLiveDriverCoordinate] = useState(null);

    const moveSheet = (expanded) => {
        const nextPosition = expanded ? 0 : collapsedTranslateY;
        sheetPositionRef.current = nextPosition;
        setIsSheetExpanded(expanded);
        Animated.spring(sheetTranslateY, {
            toValue: nextPosition,
            useNativeDriver: true,
            damping: 24,
            stiffness: 220,
            mass: 0.9,
        }).start();
    };

    const sheetPanResponder = useMemo(
        () =>
            PanResponder.create({
                onMoveShouldSetPanResponder: (_, gestureState) =>
                    Math.abs(gestureState.dy) > 6,
                onPanResponderGrant: () => {
                    sheetGestureStartRef.current = sheetPositionRef.current;
                    sheetTranslateY.stopAnimation();
                },
                onPanResponderMove: (_, gestureState) => {
                    const nextPosition = Math.min(
                        collapsedTranslateY,
                        Math.max(0, sheetGestureStartRef.current + gestureState.dy)
                    );
                    sheetPositionRef.current = nextPosition;
                    sheetTranslateY.setValue(nextPosition);
                },
                onPanResponderRelease: (_, gestureState) => {
                    if (gestureState.vy < -0.35 || gestureState.dy < -55) {
                        moveSheet(true);
                        return;
                    }

                    if (gestureState.vy > 0.35 || gestureState.dy > 55) {
                        moveSheet(false);
                        return;
                    }

                    moveSheet(sheetPositionRef.current < collapsedTranslateY / 2);
                },
                onPanResponderTerminate: () => {
                    moveSheet(sheetPositionRef.current < collapsedTranslateY / 2);
                },
            }),
        [collapsedTranslateY, sheetTranslateY]
    );

    useEffect(() => {
        const nextPosition = isSheetExpanded ? 0 : collapsedTranslateY;
        sheetPositionRef.current = nextPosition;
        sheetTranslateY.setValue(nextPosition);
    }, [collapsedTranslateY, isSheetExpanded, sheetTranslateY]);

    useEffect(() => {
        if (!job && routeJobId) {
            void dispatch(fetchDriverHome());
        }
    }, [dispatch, job, routeJobId]);

    useEffect(() => {
        if (activeDelivery && (!routeJobId || activeDelivery.id === routeJobId)) {
            setJob(activeDelivery);
        }
    }, [activeDelivery, routeJobId]);

    useEffect(() => {
        let isMounted = true;

        const refreshDriverLocation = async () => {
            try {
                const location = await getCurrentLocation();
                if (isMounted) {
                    setLiveDriverCoordinate(
                        toCoordinate(location.latitude, location.longitude)
                    );
                }
            } catch (error) {
                // Keep the most recent server location when a GPS reading is
                // temporarily unavailable; never invent a map coordinate.
                console.warn('Live rider GPS unavailable:', error?.message);
            }
        };

        void refreshDriverLocation();
        const timer = setInterval(refreshDriverLocation, 7000);

        return () => {
            isMounted = false;
            clearInterval(timer);
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
        () => liveDriverCoordinate || toCoordinate(
            job?.riderLocation?.latitude ?? job?.current_latitude,
            job?.riderLocation?.longitude ?? job?.current_longitude
        ),
        [job?.current_latitude, job?.current_longitude, job?.riderLocation, liveDriverCoordinate]
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
    const fallbackRouteCoordinates = useMemo(() => {
        if (!driverCoordinate || !nextStopCoordinate) {
            return [];
        }

        if (
            driverCoordinate.latitude === nextStopCoordinate.latitude &&
            driverCoordinate.longitude === nextStopCoordinate.longitude
        ) {
            return [];
        }

        return [driverCoordinate, nextStopCoordinate];
    }, [driverCoordinate, nextStopCoordinate]);
    const visibleRouteCoordinates =
        routeCoordinates.length >= 2 ? routeCoordinates : fallbackRouteCoordinates;

    const distanceRemainingKm = deliveryRoute?.distanceKm ?? null;
    const etaMinutes = deliveryRoute?.etaMinutes ?? null;

    useEffect(() => {
        if (!mapRef.current || visibleRouteCoordinates.length < 2) {
            return;
        }

        mapRef.current.fitToCoordinates(visibleRouteCoordinates, {
            animated: true,
            edgePadding: {
                top: 100,
                right: 60,
                bottom: 200,
                left: 60,
            },
        });
    }, [visibleRouteCoordinates]);

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
                scrollEnabled
                zoomEnabled
                rotateEnabled
                pitchEnabled
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
                ) : fallbackRouteCoordinates.length >= 2 ? (
                    <Polyline
                        coordinates={fallbackRouteCoordinates}
                        strokeColor={colors.secondary}
                        strokeWidth={7}
                    />
                ) : null}
            </MapView>

            <Animated.View
                style={[
                    styles.sheet,
                    {
                        height: sheetHeight,
                        transform: [{ translateY: sheetTranslateY }],
                    },
                ]}
            >
                <View
                    style={styles.sheetGrabArea}
                    {...sheetPanResponder.panHandlers}
                >
                    <TouchableOpacity
                        style={styles.sheetHandleButton}
                        onPress={() => moveSheet(!isSheetExpanded)}
                        accessibilityRole="button"
                        accessibilityLabel={isSheetExpanded ? 'Collapse delivery control' : 'Expand delivery control'}
                    >
                        <View style={styles.sheetHandle} />
                    </TouchableOpacity>
                    <View style={styles.sheetHeaderRow}>
                        <View style={styles.sheetHeaderCopy}>
                            <Text style={styles.sheetEyebrow}>ROUTE OPERATIONS</Text>
                            <Text style={styles.sheetTitle}>Delivery Control</Text>
                            <Text style={styles.sheetHint}>
                                {isSheetExpanded
                                    ? 'Swipe the handle down to minimize'
                                    : 'Swipe up to view actions and delivery details'}
                            </Text>
                        </View>
                        <View style={styles.sheetChevron}>
                            <Ionicons
                                name={isSheetExpanded ? 'chevron-down' : 'chevron-up'}
                                size={22}
                                color={colors.secondaryDark}
                            />
                        </View>
                    </View>
                </View>

                <ScrollView
                    style={styles.sheetScroll}
                    contentContainerStyle={styles.sheetContent}
                    showsVerticalScrollIndicator={false}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    overScrollMode="always"
                    bounces
                    scrollEnabled={isSheetExpanded}
                >

                <SurfaceCard style={styles.actionCard}>
                    <Text style={styles.actionEyebrow}>NEXT DELIVERY STEP</Text>
                    <Text style={styles.body}>
                        Live GPS sharing is managed automatically for this active delivery.
                    </Text>
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
                </SurfaceCard>

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
                                <Text style={styles.metricLabel}>Checkpoint Position</Text>
                                <Text style={styles.metricValueSmall}>
                                    {driverCoordinate
                                        ? `${driverCoordinate.latitude.toFixed(5)}, ${driverCoordinate.longitude.toFixed(5)}`
                                        : 'Waiting for pickup'}
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
                                'We could not build a live route right now. Pickup and drop-off markers are still shown on the map.'}
                        </Text>
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
                        <>
                            <Text style={styles.contact}>
                                Phone: {job.pickupContactPhone ?? job.pickup_contact_phone}
                            </Text>
                            <TouchableOpacity
                                style={styles.callButton}
                                onPress={() => Linking.openURL(`tel:${job.pickupContactPhone ?? job.pickup_contact_phone}`)}
                            >
                                <Ionicons name="call-outline" size={18} color="#FFFFFF" />
                                <Text style={styles.callButtonText}>Call Shop</Text>
                            </TouchableOpacity>
                        </>
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
                    <Text style={styles.cardTitle}>Live GPS Position</Text>
                    <Text style={styles.body}>
                        Your device position is shared with the assigned customer while the package is in transit.
                    </Text>
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

                </ScrollView>
            </Animated.View>
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
        flex: 1,
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
        position: 'absolute',
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 10,
        overflow: 'hidden',
        borderTopLeftRadius: radii.xl,
        borderTopRightRadius: radii.xl,
        backgroundColor: colors.background,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.18,
        shadowRadius: 14,
        elevation: 14,
    },
    sheetGrabArea: {
        minHeight: 132,
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    sheetHandleButton: {
        minHeight: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    sheetHeaderCopy: {
        flex: 1,
    },
    sheetEyebrow: {
        ...typography.overline,
        color: colors.secondary,
        marginBottom: 2,
    },
    sheetTitle: {
        ...typography.h2,
        color: colors.text,
    },
    sheetHint: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    sheetChevron: {
        width: 42,
        height: 42,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 21,
        backgroundColor: colors.secondarySoft,
    },
    sheetScroll: {
        flex: 1,
    },
    sheetContent: {
        padding: spacing.lg,
        paddingBottom: spacing.xl * 2,
    },
    sheetHandle: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.borderStrong,
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    actionCard: {
        marginBottom: spacing.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.secondarySoft,
        backgroundColor: colors.surface,
    },
    actionEyebrow: {
        ...typography.overline,
        color: colors.secondaryDark,
        marginBottom: spacing.xs,
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
