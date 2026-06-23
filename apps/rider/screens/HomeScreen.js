import React, { useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    ActivityIndicator,
    TouchableOpacity,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
    Button,
    SurfaceCard,
    StatusBadge,
} from '../components/Common';
import AvailabilityToggle from '../components/AvailabilityToggle';
import {
    fetchDriverHome,
    selectHomeProfile,
    selectActiveDelivery,
    selectAssignedDeliveries,
    selectHomeLoading,
    selectHomeRefreshing,
    selectHomeError,
} from '../store/slices/homeSlice';
import { colors, spacing, typography, shadows, radii } from '../styles/theme';

const formatStatus = (value) =>
    value ? value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) : '';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
})}`;
const formatRating = (value) => {
    const rating = Number(value);
    return Number.isFinite(rating) ? rating.toFixed(1) : '0.0';
};

const statusTone = (status) => {
    if (['delivered', 'online', 'accepted', 'in_transit'].includes(status)) return 'success';
    if (['assigned', 'arrived_at_pickup', 'arrived_at_dropoff'].includes(status)) return 'info';
    if (status === 'failed' || status === 'offline') return 'danger';
    return 'warning';
};

function StatCard({ label, value, icon, accent = false }) {
    return (
        <View style={[styles.statCard, accent && styles.statCardAccent]}>
            <View style={[styles.statIconWrap, accent && styles.statIconWrapAccent]}>
                <Ionicons name={icon} size={18} color={accent ? colors.secondary : colors.textSecondary} />
            </View>
            <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );
}

function ActiveDeliveryCard({ delivery, onPress }) {
    const tone = statusTone(delivery.status);
    const toneColors = {
        success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46' },
        info:    { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF' },
        warning: { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E' },
        danger:  { bg: '#FEF2F2', border: '#EF4444', text: '#991B1B' },
    };
    const tc = toneColors[tone] || toneColors.info;

    return (
        <TouchableOpacity
            style={styles.activeCard}
            onPress={onPress}
            activeOpacity={0.92}
        >
            {/* Status stripe */}
            <View style={[styles.activeCardStripe, { backgroundColor: tc.border }]} />

            <View style={styles.activeCardBody}>
                {/* Header row */}
                <View style={styles.activeCardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.activeCardOrder}>{delivery.orderNumber}</Text>
                        <Text style={styles.activeCardCustomer}>{delivery.customerName}</Text>
                    </View>
                    <View style={[styles.activeBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                        <View style={[styles.activeDot, { backgroundColor: tc.border }]} />
                        <Text style={[styles.activeBadgeText, { color: tc.text }]}>
                            {formatStatus(delivery.status)}
                        </Text>
                    </View>
                </View>

                {/* Route */}
                <View style={styles.routeBlock}>
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, styles.routeDotPickup]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>PICKUP</Text>
                            <Text style={styles.routeAddress}>{delivery.pickupAddress}</Text>
                        </View>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.routeRow}>
                        <View style={[styles.routeDot, styles.routeDotDropoff]} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>DROPOFF</Text>
                            <Text style={styles.routeAddress}>{delivery.dropoffAddress}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <View style={styles.activeCardFooter}>
                    <View style={styles.activeCardMeta}>
                        <Ionicons name="navigate-outline" size={14} color={colors.textMuted} />
                        <Text style={styles.activeCardMetaText}>
                            {delivery.distanceKm ? `${Number(delivery.distanceKm).toFixed(1)} km` : 'Route assigned'}
                        </Text>
                    </View>
                    {delivery.etaMinutes ? (
                        <View style={styles.activeCardMeta}>
                            <Ionicons name="time-outline" size={14} color={colors.textMuted} />
                            <Text style={styles.activeCardMetaText}>{delivery.etaMinutes} min ETA</Text>
                        </View>
                    ) : null}
                    <Text style={styles.activeCardEarning}>{formatCurrency(delivery.paymentAmount)}</Text>
                </View>

                <View style={styles.openBtn}>
                    <Text style={styles.openBtnText}>Open Route</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.secondary} />
                </View>
            </View>
        </TouchableOpacity>
    );
}

function AssignedMiniCard({ delivery, onPress }) {
    return (
        <TouchableOpacity style={styles.miniCard} onPress={onPress} activeOpacity={0.88}>
            <View style={styles.miniCardLeft}>
                <View style={styles.miniCardIcon}>
                    <Ionicons name="cube-outline" size={18} color={colors.secondary} />
                </View>
            </View>
            <View style={styles.miniCardBody}>
                <Text style={styles.miniCardOrder}>{delivery.orderNumber}</Text>
                <Text style={styles.miniCardAddress} numberOfLines={1}>{delivery.pickupAddress}</Text>
            </View>
            <View style={styles.miniCardRight}>
                <Text style={styles.miniCardPay}>{formatCurrency(delivery.paymentAmount)}</Text>
                <StatusBadge label={formatStatus(delivery.status)} tone={statusTone(delivery.status)} />
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen({ navigation }) {
    const dispatch = useDispatch();
    const profile = useSelector(selectHomeProfile);
    const activeDelivery = useSelector(selectActiveDelivery);
    const assignedDeliveries = useSelector(selectAssignedDeliveries);
    const isLoading = useSelector(selectHomeLoading);
    const isRefreshing = useSelector(selectHomeRefreshing);
    const error = useSelector(selectHomeError);

    useEffect(() => {
        dispatch(fetchDriverHome());
    }, [dispatch]);

    useFocusEffect(
        useCallback(() => {
            dispatch(fetchDriverHome());
        }, [dispatch])
    );

    const handleRefresh = () => {
        dispatch(fetchDriverHome());
    };

    if (isLoading && !profile) {
        return (
            <View style={styles.centerState}>
                <ActivityIndicator size="large" color={colors.secondary} />
                <Text style={styles.stateTitle}>Loading your dashboard</Text>
                <Text style={styles.stateBody}>Preparing summary, current route, and assigned work.</Text>
            </View>
        );
    }

    if (error && !profile) {
        return (
            <View style={styles.centerState}>
                <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
                <Text style={styles.stateTitle}>Dashboard unavailable</Text>
                <Text style={styles.stateBody}>{error}</Text>
                <Button title="Try Again" onPress={handleRefresh} style={styles.retryButton} />
            </View>
        );
    }

    const assignedList = assignedDeliveries || [];
    const greeting = (() => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    })();

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.secondary} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.hero}>
                <View style={styles.heroGlowLarge} />
                <View style={styles.heroGlowSmall} />
                <View style={styles.heroTopRow}>
                    <View style={styles.brandPill}>
                        <Ionicons name="bicycle" size={15} color="#BFDBFE" />
                        <Text style={styles.brandPillText}>RIDER COMMAND</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileShortcut}
                        onPress={() => navigation.navigate('Profile')}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="person-outline" size={20} color={colors.surface} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.greeting}>{greeting}</Text>
                <Text style={styles.driverName}>{profile?.full_name || 'Delivery Partner'}</Text>
                <Text style={styles.heroSubtitle}>
                    Stay ready, respond quickly, and keep every delivery moving.
                </Text>
            </View>

            <View style={styles.availabilityPanel}>
                <View style={styles.availabilityCopy}>
                    <Text style={styles.availabilityEyebrow}>AVAILABILITY</Text>
                    <Text style={styles.availabilityTitle}>Receive new requests</Text>
                </View>
                <AvailabilityToggle />
            </View>

            <View style={styles.statsRow}>
                <StatCard
                    icon="checkmark-circle-outline"
                    label="Completed"
                    value={profile?.total_deliveries ?? 0}
                />
                <StatCard
                    icon="star-outline"
                    label="Rating"
                    value={formatRating(profile?.rating)}
                    accent
                />
                <StatCard
                    icon="cube-outline"
                    label="In Queue"
                    value={assignedList.length}
                />
            </View>

            {error ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={16} color={colors.danger} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                </View>
            ) : null}

            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <View style={styles.sectionPill}>
                        <View style={[styles.liveDot, activeDelivery && styles.liveDotActive]} />
                        <Text style={styles.sectionPillText}>{activeDelivery ? 'LIVE' : 'IDLE'}</Text>
                    </View>
                    <Text style={styles.sectionTitle}>Active Delivery</Text>
                </View>

                {activeDelivery ? (
                    <ActiveDeliveryCard
                        delivery={activeDelivery}
                        onPress={() => navigation.navigate('ActiveDelivery', { job: activeDelivery })}
                    />
                ) : (
                    <SurfaceCard style={styles.idleCard}>
                        <Ionicons name="car-outline" size={36} color={colors.textMuted} style={{ marginBottom: spacing.sm }} />
                        <Text style={styles.idleTitle}>No active delivery</Text>
                        <Text style={styles.idleBody}>
                            Stay online. When a nearby delivery request arrives, you can accept or decline it from the request popup.
                        </Text>
                    </SurfaceCard>
                )}
            </View>

            {assignedList.length > 0 ? (
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <View style={[styles.sectionPill, styles.sectionPillQueue]}>
                            <Text style={[styles.sectionPillText, styles.sectionPillTextQueue]}>QUEUE</Text>
                        </View>
                        <Text style={styles.sectionTitle}>Assigned ({assignedList.length})</Text>
                    </View>

                    {assignedList.map((delivery) => (
                        <AssignedMiniCard
                            key={delivery.id}
                            delivery={delivery}
                            onPress={() => navigation.navigate('ActiveDelivery', { job: delivery })}
                        />
                    ))}
                </View>
            ) : null}

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        paddingBottom: 120,
    },

    hero: {
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: 54,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    heroGlowLarge: {
        position: 'absolute',
        width: 220,
        height: 220,
        borderRadius: 110,
        backgroundColor: 'rgba(59,130,246,0.18)',
        right: -85,
        top: -120,
    },
    heroGlowSmall: {
        position: 'absolute',
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(139,92,246,0.13)',
        right: 60,
        bottom: -82,
    },
    heroTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.xl,
    },
    brandPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: radii.pill,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    brandPillText: {
        ...typography.overline,
        color: '#BFDBFE',
        fontSize: 10,
    },
    profileShortcut: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
    },
    greeting: {
        ...typography.bodySmall,
        color: '#93C5FD',
        fontWeight: '700',
        marginBottom: 2,
    },
    driverName: {
        ...typography.h1,
        color: colors.textOnDark,
    },
    heroSubtitle: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        marginTop: spacing.sm,
        maxWidth: 310,
    },
    availabilityPanel: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginHorizontal: spacing.lg,
        marginTop: -30,
        padding: spacing.md,
        borderRadius: radii.md,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        ...shadows.medium,
    },
    availabilityCopy: {
        flex: 1,
        paddingTop: 2,
    },
    availabilityEyebrow: {
        ...typography.overline,
        color: colors.secondary,
        marginBottom: 5,
    },
    availabilityTitle: {
        ...typography.body,
        color: colors.text,
        fontWeight: '800',
    },

    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.borderSubtle,
        ...shadows.small,
    },
    statCardAccent: {
        backgroundColor: '#EFF6FF',
        borderColor: '#BFDBFE',
    },
    statIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
        ...shadows.small,
    },
    statIconWrapAccent: {
        backgroundColor: '#DBEAFE',
    },
    statValue: {
        ...typography.h2,
        fontSize: 20,
        color: colors.text,
    },
    statValueAccent: {
        color: colors.secondary,
    },
    statLabel: {
        ...typography.caption,
        marginTop: 2,
        textAlign: 'center',
    },

    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        backgroundColor: colors.dangerSoft,
        borderRadius: radii.sm,
        padding: spacing.md,
        borderLeftWidth: 3,
        borderLeftColor: colors.danger,
    },
    errorBannerText: {
        ...typography.bodySmall,
        color: colors.danger,
        flex: 1,
    },

    section: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginBottom: spacing.md,
    },
    sectionPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.dangerSoft,
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: radii.pill,
    },
    sectionPillQueue: {
        backgroundColor: colors.secondarySoft,
    },
    sectionPillText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.danger,
        letterSpacing: 0.8,
    },
    sectionPillTextQueue: {
        color: colors.secondary,
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.textMuted,
    },
    liveDotActive: {
        backgroundColor: colors.danger,
    },
    sectionTitle: {
        ...typography.h3,
        color: colors.text,
    },

    activeCard: {
        backgroundColor: colors.surface,
        borderRadius: radii.lg,
        flexDirection: 'row',
        overflow: 'hidden',
        ...shadows.medium,
        marginBottom: spacing.sm,
    },
    activeCardStripe: {
        width: 4,
        backgroundColor: colors.secondary,
    },
    activeCardBody: {
        flex: 1,
        padding: spacing.md,
    },
    activeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
        gap: spacing.sm,
    },
    activeCardOrder: {
        ...typography.h3,
        color: colors.text,
    },
    activeCardCustomer: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: radii.pill,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    activeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    activeBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    routeBlock: {
        backgroundColor: colors.background,
        borderRadius: radii.sm,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
    },
    routeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginTop: 4,
        flexShrink: 0,
    },
    routeDotPickup: {
        backgroundColor: colors.secondary,
    },
    routeDotDropoff: {
        backgroundColor: colors.danger,
    },
    routeLine: {
        width: 2,
        height: 16,
        backgroundColor: colors.border,
        marginLeft: 4,
        marginVertical: 4,
    },
    routeLabel: {
        ...typography.caption,
        color: colors.textMuted,
        marginBottom: 2,
    },
    routeAddress: {
        ...typography.bodySmall,
        color: colors.text,
        fontSize: 13,
    },
    activeCardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    activeCardMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    activeCardMetaText: {
        ...typography.caption,
        color: colors.textMuted,
        fontSize: 12,
    },
    activeCardEarning: {
        ...typography.body,
        fontWeight: '800',
        color: colors.secondary,
        marginLeft: 'auto',
    },
    openBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: spacing.sm,
        marginTop: spacing.xs,
    },
    openBtnText: {
        ...typography.bodySmall,
        color: colors.secondary,
        fontWeight: '700',
        fontSize: 13,
    },

    idleCard: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.background,
        shadowOpacity: 0,
        elevation: 0,
    },
    idleTitle: {
        ...typography.h3,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    idleBody: {
        ...typography.bodySmall,
        color: colors.textMuted,
        textAlign: 'center',
        marginBottom: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    browseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.secondary,
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderRadius: radii.pill,
    },
    browseBtnText: {
        ...typography.bodySmall,
        color: colors.surface,
        fontWeight: '700',
    },

    miniCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        gap: spacing.sm,
        ...shadows.small,
        borderWidth: 1,
        borderColor: colors.border,
    },
    miniCardLeft: {},
    miniCardIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.secondarySoft,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniCardBody: {
        flex: 1,
    },
    miniCardOrder: {
        ...typography.body,
        fontWeight: '700',
        color: colors.text,
    },
    miniCardAddress: {
        ...typography.caption,
        color: colors.textMuted,
        marginTop: 2,
    },
    miniCardRight: {
        alignItems: 'flex-end',
        gap: spacing.xs,
    },
    miniCardPay: {
        ...typography.bodySmall,
        fontWeight: '800',
        color: colors.secondary,
    },

    quickActions: {
        paddingHorizontal: spacing.lg,
        marginTop: spacing.lg,
    },
    quickBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.surface,
        borderRadius: radii.md,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: colors.border,
        ...shadows.small,
    },
    quickBtnText: {
        ...typography.body,
        fontWeight: '700',
        color: colors.secondary,
    },

    centerState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
        backgroundColor: colors.background,
    },
    stateTitle: {
        ...typography.h2,
        marginTop: spacing.md,
        textAlign: 'center',
    },
    stateBody: {
        ...typography.bodySmall,
        textAlign: 'center',
        marginTop: spacing.sm,
    },
    retryButton: {
        marginTop: spacing.lg,
        minWidth: 180,
    },
});

