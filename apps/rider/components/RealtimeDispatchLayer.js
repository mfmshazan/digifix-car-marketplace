import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    View,
} from 'react-native';
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

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

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
                    <Text style={styles.eyebrow}>Incoming Request</Text>
                    <Text style={styles.title}>
                        {incomingRequest?.orderNumber || 'New delivery request'}
                    </Text>
                    <Text style={styles.subtitle}>
                        Accept within the response window to lock this order before it moves to the next closest rider.
                    </Text>

                    <View style={styles.countdownWrap}>
                        <Text style={styles.countdownLabel}>Time Left</Text>
                        <Text style={styles.countdownValue}>{countdownSeconds}s</Text>
                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.max(0, Math.min(100, countdownProgress * 100))}%` },
                                ]}
                            />
                        </View>
                    </View>

                    <View style={styles.detailBlock}>
                        <Text style={styles.detailLabel}>Pickup</Text>
                        <Text style={styles.detailText}>{incomingRequest?.pickupAddress}</Text>
                    </View>

                    <View style={styles.detailBlock}>
                        <Text style={styles.detailLabel}>Drop-off</Text>
                        <Text style={styles.detailText}>{incomingRequest?.dropoffAddress}</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Fee</Text>
                            <Text style={styles.summaryValue}>
                                {formatCurrency(incomingRequest?.paymentAmount)}
                            </Text>
                        </View>
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>To Pickup</Text>
                            <Text style={styles.summaryValue}>
                                {incomingRequest?.distanceToPickupKm
                                    ? `${Number(incomingRequest.distanceToPickupKm).toFixed(1)} km`
                                    : 'Nearby'}
                            </Text>
                        </View>
                    </View>

                    {requestError ? (
                        <Text style={styles.errorText}>{requestError}</Text>
                    ) : null}

                    <View style={styles.actionRow}>
                        <Button
                            title="Decline"
                            variant="outline"
                            onPress={handleDecline}
                            disabled={isActing}
                            style={styles.actionButton}
                        />
                        <Button
                            title="Accept"
                            onPress={handleAccept}
                            loading={isActing}
                            disabled={isActing}
                            style={styles.actionButton}
                        />
                    </View>
                </SurfaceCard>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'center',
        padding: spacing.lg,
        backgroundColor: colors.overlay,
    },
    overlayCard: {
        padding: spacing.lg,
        borderRadius: radii.lg,
    },
    eyebrow: {
        ...typography.caption,
        color: colors.secondary,
        fontWeight: '700',
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
    },
    title: {
        ...typography.h1,
        marginBottom: spacing.xs,
    },
    subtitle: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    countdownWrap: {
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surfaceMuted,
        marginBottom: spacing.lg,
    },
    countdownLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    countdownValue: {
        ...typography.hero,
        color: colors.danger,
        marginBottom: spacing.sm,
    },
    progressTrack: {
        height: 8,
        borderRadius: radii.pill,
        backgroundColor: colors.border,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: colors.secondary,
        borderRadius: radii.pill,
    },
    detailBlock: {
        marginBottom: spacing.md,
    },
    detailLabel: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
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
        color: colors.danger,
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
});


