import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { API_BASE_URL } from '../config';
import {
    getAccessToken,
    isMockSession,
} from '../services/storage';
import { navigate } from '../services/navigation';
import {
    acceptIncomingRequest,
    declineIncomingRequest,
    expireIncomingRequest,
    receiveIncomingRequest,
    resolveIncomingRequest,
    selectIncomingRequest,
    selectIncomingRequestActing,
    selectIncomingRequestError,
    setSocketConnectionStatus,
} from '../store/slices/incomingRequestSlice';
import { selectActiveDelivery } from '../store/slices/homeSlice';
import { Button, SurfaceCard } from './Common';
import { colors, radii, spacing, typography } from '../styles/theme';

const RECONNECT_DELAY_MS = 3000;

const buildSocketUrl = (token) =>
    `${API_BASE_URL.replace(/^http/i, 'ws').replace(/\/api\/?$/, '/ws')}?token=${encodeURIComponent(token)}`;

const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function RealtimeDispatchLayer({ isAuthenticated }) {
    const dispatch = useDispatch();
    const incomingRequest = useSelector(selectIncomingRequest);
    const isActing = useSelector(selectIncomingRequestActing);
    const requestError = useSelector(selectIncomingRequestError);
    const activeDelivery = useSelector(selectActiveDelivery);
    const [now, setNow] = useState(Date.now());
    const hasAutoExpiredRef = useRef(false);
    const activeDeliveryRef = useRef(activeDelivery);
    const reconnectTimerRef = useRef(null);
    const socketRef = useRef(null);
    const teardownRef = useRef(false);

    useEffect(() => {
        activeDeliveryRef.current = activeDelivery;
    }, [activeDelivery]);

    useEffect(() => {
        if (!incomingRequest) {
            hasAutoExpiredRef.current = false;
            return undefined;
        }

        hasAutoExpiredRef.current = false;
        setNow(Date.now());

        const intervalId = setInterval(() => {
            setNow(Date.now());
        }, 250);

        return () => {
            clearInterval(intervalId);
        };
    }, [incomingRequest?.requestId]);

    const remainingMs = useMemo(() => {
        if (!incomingRequest?.expiresAt) {
            return 0;
        }

        return Math.max(
            0,
            new Date(incomingRequest.expiresAt).getTime() - now
        );
    }, [incomingRequest?.expiresAt, now]);

    useEffect(() => {
        if (
            !incomingRequest?.requestId ||
            remainingMs > 0 ||
            hasAutoExpiredRef.current ||
            isActing
        ) {
            return;
        }

        hasAutoExpiredRef.current = true;
        void dispatch(expireIncomingRequest(incomingRequest.requestId));
    }, [dispatch, incomingRequest?.requestId, isActing, remainingMs]);

    useEffect(() => {
        teardownRef.current = false;

        const cleanupSocket = () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }

            if (socketRef.current) {
                socketRef.current.onopen = null;
                socketRef.current.onmessage = null;
                socketRef.current.onerror = null;
                socketRef.current.onclose = null;
                socketRef.current.close();
                socketRef.current = null;
            }
        };

        const connect = async () => {
            if (!isAuthenticated || teardownRef.current) {
                dispatch(setSocketConnectionStatus('disconnected'));
                return;
            }

            if (await isMockSession()) {
                dispatch(setSocketConnectionStatus('disconnected'));
                return;
            }

            const token = await getAccessToken();

            if (!token || token === 'mock-guest-token') {
                dispatch(setSocketConnectionStatus('disconnected'));
                return;
            }

            dispatch(setSocketConnectionStatus('connecting'));

            const socket = new WebSocket(buildSocketUrl(token));
            socketRef.current = socket;

            socket.onopen = () => {
                dispatch(setSocketConnectionStatus('connected'));
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);

                    if (message.type === 'incoming_order_request') {
                        if (activeDeliveryRef.current) {
                            return;
                        }

                        dispatch(receiveIncomingRequest(message.data));
                        return;
                    }

                    if (message.type === 'order_request_resolved') {
                        dispatch(resolveIncomingRequest(message.data));
                    }
                } catch (error) {
                    console.error('Failed to parse realtime dispatch message:', error);
                }
            };

            socket.onerror = () => {
                dispatch(setSocketConnectionStatus('disconnected'));
            };

            socket.onclose = () => {
                dispatch(setSocketConnectionStatus('disconnected'));
                if (teardownRef.current) {
                    return;
                }

                reconnectTimerRef.current = setTimeout(() => {
                    void connect();
                }, RECONNECT_DELAY_MS);
            };
        };

        void connect();

        return () => {
            teardownRef.current = true;
            cleanupSocket();
        };
    }, [dispatch, isAuthenticated]);

    const handleAccept = async () => {
        if (!incomingRequest?.requestId || isActing) {
            return;
        }

        const result = await dispatch(acceptIncomingRequest(incomingRequest.requestId));

        if (acceptIncomingRequest.fulfilled.match(result) && result.payload?.id) {
            navigate('ActiveDelivery', {
                job: result.payload,
            });
        }
    };

    const handleDecline = async () => {
        if (!incomingRequest?.requestId || isActing) {
            return;
        }

        await dispatch(
            declineIncomingRequest({
                requestId: incomingRequest.requestId,
                reason: 'driver_declined_request',
            })
        );
    };

    const countdownSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
    const countdownProgress =
        incomingRequest?.secondsToRespond && incomingRequest.secondsToRespond > 0
            ? remainingMs / (incomingRequest.secondsToRespond * 1000)
            : 0;

    return (
        <Modal
            visible={Boolean(incomingRequest)}
            transparent
            animationType="fade"
            onRequestClose={handleDecline}
        >
            <View style={styles.backdrop}>
                <SurfaceCard style={styles.overlayCard}>
                    <View style={styles.offerHeader}>
                        <View style={styles.offerGlow} />
                        <View style={styles.offerHeaderTop}>
                            <View style={styles.offerIcon}>
                                <Ionicons name="notifications" size={22} color={colors.surface} />
                            </View>
                            <View style={styles.countdownCircle}>
                                <Text style={styles.countdownValue}>{countdownSeconds}</Text>
                                <Text style={styles.countdownUnit}>SEC</Text>
                            </View>
                        </View>
                        <Text style={styles.eyebrow}>NEW DELIVERY OFFER</Text>
                        <Text style={styles.title}>
                            {incomingRequest?.orderNumber || 'New delivery request'}
                        </Text>
                        <Text style={styles.subtitle}>
                            Review the route and accept before dispatch offers it to the next rider.
                        </Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.max(0, Math.min(100, countdownProgress * 100))}%` },
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.offerBody}>
                        <View style={styles.routeBlock}>
                            <View style={styles.routeRow}>
                                <View style={styles.routeRail}>
                                    <View style={[styles.routeDot, styles.pickupDot]} />
                                    <View style={styles.routeLine} />
                                </View>
                                <View style={styles.routeCopy}>
                                    <Text style={styles.detailLabel}>PICKUP</Text>
                                    <Text style={styles.detailText}>{incomingRequest?.pickupAddress}</Text>
                                </View>
                            </View>
                            <View style={styles.routeRow}>
                                <View style={styles.routeRail}>
                                    <View style={[styles.routeDot, styles.dropoffDot]} />
                                </View>
                                <View style={styles.routeCopy}>
                                    <Text style={styles.detailLabel}>DROPOFF</Text>
                                    <Text style={styles.detailText}>{incomingRequest?.dropoffAddress}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.summaryRow}>
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryIcon}>
                                    <Ionicons name="wallet-outline" size={18} color={colors.secondary} />
                                </View>
                                <Text style={styles.summaryLabel}>RIDER FEE</Text>
                                <Text style={styles.summaryValue}>
                                    {formatCurrency(incomingRequest?.paymentAmount)}
                                </Text>
                            </View>
                            <View style={styles.summaryCard}>
                                <View style={[styles.summaryIcon, styles.distanceIcon]}>
                                    <Ionicons name="navigate-outline" size={18} color={colors.accent} />
                                </View>
                                <Text style={styles.summaryLabel}>TO PICKUP</Text>
                                <Text style={styles.summaryValue}>
                                    {incomingRequest?.distanceToPickupKm
                                        ? `${Number(incomingRequest.distanceToPickupKm).toFixed(1)} km`
                                        : 'Nearby'}
                                </Text>
                            </View>
                        </View>

                        {requestError ? (
                            <View style={styles.errorBanner}>
                                <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                                <Text style={styles.errorText}>{requestError}</Text>
                            </View>
                        ) : null}

                        <View style={styles.actionRow}>
                            <Button
                                title="Decline"
                                icon="close-outline"
                                variant="outline"
                                onPress={handleDecline}
                                disabled={isActing}
                                style={styles.actionButton}
                            />
                            <Button
                                title="Accept Delivery"
                                icon="checkmark-outline"
                                onPress={handleAccept}
                                loading={isActing}
                                disabled={isActing}
                                style={[styles.actionButton, styles.acceptButton]}
                            />
                        </View>
                    </View>
                </SurfaceCard>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.md,
        backgroundColor: colors.overlay,
    },
    overlayCard: {
        padding: 0,
        borderRadius: radii.xl,
        overflow: 'hidden',
        borderColor: 'rgba(255,255,255,0.12)',
    },
    offerHeader: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.primary,
        padding: spacing.lg,
    },
    offerGlow: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: 'rgba(59,130,246,0.2)',
        right: -80,
        top: -100,
    },
    offerHeaderTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    offerIcon: {
        width: 46,
        height: 46,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    countdownCircle: {
        width: 58,
        height: 58,
        borderRadius: 29,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 3,
        borderColor: colors.danger,
    },
    countdownUnit: {
        ...typography.overline,
        color: colors.textMuted,
        fontSize: 8,
        lineHeight: 9,
    },
    eyebrow: {
        ...typography.overline,
        color: '#93C5FD',
        marginBottom: 6,
    },
    title: {
        ...typography.h1,
        color: colors.textOnDark,
        marginBottom: spacing.sm,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        marginBottom: spacing.md,
        maxWidth: 320,
    },
    countdownValue: {
        ...typography.h3,
        color: colors.danger,
    },
    progressTrack: {
        height: 8,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.14)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.secondary,
        borderRadius: radii.pill,
    },
    offerBody: {
        padding: spacing.lg,
    },
    routeBlock: {
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surfaceMuted,
        marginBottom: spacing.md,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    routeRail: {
        width: 22,
        alignItems: 'center',
    },
    routeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
    },
    pickupDot: {
        backgroundColor: colors.secondary,
    },
    dropoffDot: {
        backgroundColor: colors.danger,
    },
    routeLine: {
        flex: 1,
        width: 2,
        minHeight: 32,
        backgroundColor: colors.borderStrong,
        marginVertical: 4,
    },
    routeCopy: {
        flex: 1,
        paddingBottom: spacing.md,
    },
    detailLabel: {
        ...typography.overline,
        color: colors.textMuted,
        marginBottom: 4,
    },
    detailText: {
        ...typography.body,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    summaryCard: {
        flex: 1,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.backgroundAccent,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
    },
    summaryIcon: {
        width: 34,
        height: 34,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.secondarySoft,
        marginBottom: spacing.sm,
    },
    distanceIcon: {
        backgroundColor: colors.accentSoft,
    },
    summaryLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    summaryValue: {
        ...typography.h3,
        color: colors.text,
    },
    errorText: {
        ...typography.bodySmall,
        color: colors.dangerDark,
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        padding: spacing.sm,
        borderRadius: radii.sm,
        backgroundColor: colors.dangerSoft,
        marginBottom: spacing.md,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionButton: {
        flex: 1,
    },
    acceptButton: {
        flex: 1.35,
    },
});


