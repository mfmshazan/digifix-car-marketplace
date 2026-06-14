import React, { useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import {
    Button,
    SurfaceCard,
    StatusBadge,
    EmptyState,
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

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;
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
            {/* -- HEADER ------------------------------- */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.greeting}>{greeting},</Text>
                    <Text style={styles.driverName}>{profile?.full_name || 'Delivery Partner'}</Text>
                </View>
                <View style={styles.headerRight}>
                    <AvailabilityToggle />
                </View>
            </View>

            {/* -- STATS -------------------------------- */}
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

            {/* -- ERROR BANNER ------------------------- */}
            {error ? (
                <View style={styles.errorBanner}>
                    <Ionicons name="warning-outline" size={16} color={colors.danger} />
                    <Text style={styles.errorBannerText}>{error}</Text>
                </View>
            ) : null}

            {/* -- ACTIVE DELIVERY ---------------------- */}
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
                        <Text style={styles.idleBody}>When you accept a delivery, the live route will appear here.</Text>
                        <TouchableOpacity
                            style={styles.browseBtn}
                            onPress={() => navigation.navigate('AvailableJobs')}
                            activeOpacity={0.85}
                        >
                            <Ionicons name="search-outline" size={16} color={colors.surface} />
                            <Text style={styles.browseBtnText}>Browse Available Jobs</Text>
                        </TouchableOpacity>
                    </SurfaceCard>
                )}
            </View>

            {/* -- ASSIGNED QUEUE ----------------------- */}
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
        paddingBottom: 32,
    },

    // -- Header ------------------------------------------
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerLeft: {
        flex: 1,
    },
    headerRight: {
        marginLeft: spacing.md,
        marginTop: 4,
    },
    greeting: {
        ...typography.caption,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    driverName: {
        ...typography.h2,
        color: colors.text,
        marginTop: 2,
    },

    // -- Stats --------------------------------------------
    statsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    statCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: colors.background,
        borderRadius: radii.md,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statCardAccent: {
        backgroundColor: colors.secondarySoft,
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

    // -- Error Banner -------------------------------------
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

    // -- Section ------------------------------------------
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

    // -- Active Delivery Card ------------------------------
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

    // -- Idle / Empty State --------------------------------
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

    // -- Assigned Mini Card --------------------------------
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

    // -- Center State --------------------------------------
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

