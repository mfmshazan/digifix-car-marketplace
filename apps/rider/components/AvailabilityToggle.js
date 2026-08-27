import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectStatus,
    selectIsOnline,
    selectIsSyncing,
    selectSyncError,
    toggleAvailability,
    clearSyncError,
} from '../store/slices/availabilitySlice';
import { colors, spacing, typography, radii } from '../styles/theme';

const TRACK_WIDTH = 58;
const TRACK_HEIGHT = 32;
const THUMB_SIZE = 24;
const THUMB_PADDING = 4;

export default function AvailabilityToggle() {
    const dispatch = useDispatch();
    const status = useSelector(selectStatus);
    const isOnline = useSelector(selectIsOnline);
    const isSyncing = useSelector(selectIsSyncing);
    const syncError = useSelector(selectSyncError);

    const thumbPosition = useRef(new Animated.Value(isOnline ? 1 : 0)).current;
    const trackColor = useRef(new Animated.Value(isOnline ? 1 : 0)).current;

    useEffect(() => {
        const toValue = isOnline ? 1 : 0;
        Animated.parallel([
            Animated.spring(thumbPosition, {
                toValue,
                useNativeDriver: false,
                damping: 15,
                stiffness: 180,
            }),
            Animated.timing(trackColor, {
                toValue,
                duration: 220,
                useNativeDriver: false,
            }),
        ]).start();
    }, [isOnline]);

    useEffect(() => {
        if (syncError) {
            Alert.alert(
                'Sync Failed',
                `Could not update status: ${syncError}. Status rolled back.`,
                [{ text: 'OK', onPress: () => dispatch(clearSyncError()) }]
            );
        }
    }, [syncError]);

    const thumbLeft = thumbPosition.interpolate({
        inputRange: [0, 1],
        outputRange: [THUMB_PADDING, TRACK_WIDTH - THUMB_SIZE - THUMB_PADDING],
    });

    const interpolatedTrack = trackColor.interpolate({
        inputRange: [0, 1],
        outputRange: [colors.borderStrong, colors.secondary],
    });

    const handleToggle = () => {
        if (isSyncing) return;
        const newStatus = isOnline ? 'offline' : 'online';
        dispatch(toggleAvailability({ newStatus, previousStatus: status }));
    };

    const orderAvailabilityMessage = isSyncing
        ? 'Updating availability. New orders can only be received when this switch is active.'
        : isOnline
            ? 'Active. You can receive new orders while this switch is on.'
            : 'Inactive. Turn this switch on to start receiving new orders.';

    return (
        <View style={styles.wrapper}>
            <View style={styles.topRow}>
                <View style={styles.labelRow}>
                    <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                    <Text style={[styles.label, isOnline ? styles.labelOnline : styles.labelOffline]}>
                        {isSyncing ? 'Updating' : isOnline ? 'Online' : 'Offline'}
                    </Text>
                </View>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={handleToggle}
                    disabled={isSyncing}
                    style={styles.touchTarget}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: isOnline, busy: isSyncing }}
                    accessibilityLabel={`Driver status: ${status}. Orders can only be received when this switch is active. Tap to go ${isOnline ? 'offline' : 'online'}.`}
                    accessibilityHint="Switch on to receive new orders. Switch off to stop receiving them."
                >
                    <Animated.View style={[styles.track, { backgroundColor: interpolatedTrack }]}>
                        <Animated.View style={[styles.thumb, { left: thumbLeft }]}>
                            {isSyncing ? <ActivityIndicator size="small" color={colors.primary} /> : null}
                        </Animated.View>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            <Text style={styles.helperText}>{orderAvailabilityMessage}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'flex-end',
        gap: spacing.xs,
        maxWidth: 220,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radii.pill,
    },
    dotOnline: {
        backgroundColor: '#7EF7C6',
    },
    dotOffline: {
        backgroundColor: 'rgba(255,255,255,0.6)',
    },
    label: {
        ...typography.bodySmall,
        fontWeight: '700',
    },
    labelOnline: {
        color: colors.text,
    },
    labelOffline: {
        color: colors.textSecondary,
    },
    touchTarget: {
        padding: 2,
    },
    track: {
        width: TRACK_WIDTH,
        height: TRACK_HEIGHT,
        borderRadius: radii.pill,
        justifyContent: 'center',
    },
    thumb: {
        position: 'absolute',
        width: THUMB_SIZE,
        height: THUMB_SIZE,
        borderRadius: radii.pill,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    helperText: {
        ...typography.caption,
        maxWidth: 220,
        color: colors.textSecondary,
        textAlign: 'right',
        lineHeight: 18,
    },
});
