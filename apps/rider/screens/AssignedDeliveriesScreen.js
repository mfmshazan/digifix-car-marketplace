import React, { useEffect } from 'react';
import {
    Alert,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    EmptyState,
    ScreenHero,
    StatusBadge,
    SurfaceCard,
} from '../components/Common';
import {
    clearAssignedDeliveriesError,
    fetchAssignedDeliveries,
    selectAssignedDeliveries,
    selectAssignedDeliveriesError,
    selectAssignedDeliveriesLoading,
    selectAssignedDeliveriesRefreshing,
    selectAssignedDeliveriesUpdating,
} from '../store/slices/assignedDeliveriesSlice';
import { colors, radii, spacing, typography } from '../styles/theme';

const formatStatus = (status) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForStatus = (status) => {
    if (status === 'accepted') return 'success';
    if (status === 'assigned') return 'info';
    return 'warning';
};

const formatCurrency = (value) =>
    `Rs. ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function AssignedDeliveriesScreen({ navigation }) {
    const dispatch = useDispatch();
    const deliveries = useSelector(selectAssignedDeliveries);
    const isLoading = useSelector(selectAssignedDeliveriesLoading);
    const isRefreshing = useSelector(selectAssignedDeliveriesRefreshing);
    const isUpdating = useSelector(selectAssignedDeliveriesUpdating);
    const error = useSelector(selectAssignedDeliveriesError);

    useEffect(() => {
        dispatch(fetchAssignedDeliveries());
    }, [dispatch]);

    useEffect(() => {
        if (error) {
            Alert.alert('Assigned Deliveries', error, [
                { text: 'OK', onPress: () => dispatch(clearAssignedDeliveriesError()) },
            ]);
        }
    }, [error, dispatch]);

    const renderItem = ({ item }) => (
        <SurfaceCard style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                    <Text style={styles.orderEyebrow}>ASSIGNED ORDER</Text>
                    <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    <Text style={styles.customer}>{item.customerName}</Text>
                </View>
                <StatusBadge label={formatStatus(item.status)} tone={toneForStatus(item.status)} />
            </View>

            <View style={styles.routeBlock}>
                <View style={styles.routeRow}>
                    <View style={styles.routeMarkerColumn}>
                        <View style={[styles.routeDot, styles.pickupDot]} />
                        <View style={styles.routeLine} />
                    </View>
                    <View style={styles.routeCopy}>
                        <Text style={styles.label}>PICKUP</Text>
                        <Text style={styles.address}>{item.pickupAddress}</Text>
                    </View>
                </View>
                <View style={styles.routeRow}>
                    <View style={styles.routeMarkerColumn}>
                        <View style={[styles.routeDot, styles.dropoffDot]} />
                    </View>
                    <View style={styles.routeCopy}>
                        <Text style={styles.label}>DROPOFF</Text>
                        <Text style={styles.address}>{item.dropoffAddress}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.metaBlock}>
                <View style={styles.metaItem}>
                    <Ionicons name="cube-outline" size={17} color={colors.textSecondary} />
                    <Text style={styles.metaText} numberOfLines={2}>
                        {item.itemSummary || 'No item details shared'}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={17} color={colors.textSecondary} />
                    <Text style={styles.metaText}>
                        {item.etaMinutes ? `${item.etaMinutes} min ETA` : 'ETA awaiting route'}
                    </Text>
                </View>
                <View style={styles.payoutPill}>
                    <Text style={styles.payoutLabel}>RIDER PAYOUT</Text>
                    <Text style={styles.payoutValue}>{formatCurrency(item.paymentAmount)}</Text>
                </View>
            </View>

            <Button
                title="Review Delivery"
                icon="arrow-forward"
                iconPosition="right"
                onPress={() => navigation.navigate('DeliveryDetails', { delivery: item })}
                style={styles.primaryAction}
                disabled={isUpdating}
            />
        </SurfaceCard>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <ScreenHero
                    eyebrow="Delivery queue"
                    title="Assigned Deliveries"
                    subtitle="Review accepted work, confirm every stop, and start the route when you are ready."
                    icon="layers-outline"
                >
                    <View style={styles.heroSummary}>
                        <View style={styles.heroSummaryIcon}>
                            <Ionicons name="cube-outline" size={18} color="#BFDBFE" />
                        </View>
                        <View>
                            <Text style={styles.heroSummaryValue}>{deliveries.length}</Text>
                            <Text style={styles.heroSummaryLabel}>orders waiting in your queue</Text>
                        </View>
                    </View>
                </ScreenHero>
            </View>

            <FlatList
                data={deliveries}
                renderItem={renderItem}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => dispatch(fetchAssignedDeliveries())}
                        tintColor={colors.secondary}
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        title={isLoading ? 'Loading assigned deliveries...' : 'No assigned deliveries'}
                        body={
                            isLoading
                                ? 'Pulling your assigned queue from dispatch.'
                                : 'Accepted delivery requests will appear here.'
                        }
                        icon="layers-outline"
                    />
                }
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: 120,
    },
    card: {
        marginBottom: spacing.md,
        padding: spacing.lg,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.sm,
    },
    cardHeaderCopy: {
        flex: 1,
    },
    orderEyebrow: {
        ...typography.overline,
        color: colors.secondary,
        marginBottom: 4,
    },
    orderNumber: {
        ...typography.h3,
        marginBottom: 2,
    },
    customer: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    routeBlock: {
        backgroundColor: colors.surfaceMuted,
        borderRadius: radii.sm,
        padding: spacing.md,
        marginTop: spacing.sm,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    routeMarkerColumn: {
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
        minHeight: 34,
        backgroundColor: colors.borderStrong,
        marginVertical: 4,
    },
    routeCopy: {
        flex: 1,
        paddingBottom: spacing.md,
    },
    label: {
        ...typography.overline,
        color: colors.textMuted,
        marginBottom: 4,
    },
    address: {
        ...typography.bodySmall,
        color: colors.text,
    },
    metaBlock: {
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    metaText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        flex: 1,
    },
    payoutPill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderRadius: radii.sm,
        backgroundColor: colors.secondarySoft,
        marginTop: spacing.xs,
    },
    payoutLabel: {
        ...typography.overline,
        color: colors.secondaryDark,
    },
    payoutValue: {
        ...typography.h3,
        color: colors.secondaryDark,
    },
    primaryAction: {
        marginTop: spacing.md,
    },
    heroSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    heroSummaryIcon: {
        width: 40,
        height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(59,130,246,0.18)',
    },
    heroSummaryValue: {
        ...typography.h3,
        color: colors.textOnDark,
    },
    heroSummaryLabel: {
        ...typography.caption,
        color: colors.textOnDarkMuted,
        marginTop: 1,
    },
});
