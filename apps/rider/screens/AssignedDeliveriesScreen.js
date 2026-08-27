import React, { useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    RefreshControl,
    Alert,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
    Button,
    SurfaceCard,
    StatusBadge,
    SectionHeader,
    EmptyState,
} from '../components/Common';
import {
    fetchAssignedDeliveries,
    rejectAssignedDelivery,
    clearAssignedDeliveriesError,
    selectAssignedDeliveries,
    selectAssignedDeliveriesLoading,
    selectAssignedDeliveriesRefreshing,
    selectAssignedDeliveriesUpdating,
    selectAssignedDeliveriesError,
} from '../store/slices/assignedDeliveriesSlice';
import { colors, spacing, typography } from '../styles/theme';

const formatStatus = (status) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForStatus = (status) => {
    if (status === 'accepted') return 'success';
    if (status === 'assigned') return 'info';
    return 'warning';
};

const formatCurrency = (value) => `$${Number(value || 0).toFixed(2)}`;

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

    const handleReject = (delivery) => {
        Alert.alert(
            'Reject Delivery',
            `Reject ${delivery.orderNumber} and return it to dispatch?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: () => dispatch(rejectAssignedDelivery(delivery.id)),
                },
            ]
        );
    };

    const renderItem = ({ item }) => (
        <SurfaceCard style={styles.card}>
            <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                    <Text style={styles.orderNumber}>{item.orderNumber}</Text>
                    <Text style={styles.customer}>{item.customerName}</Text>
                </View>
                <StatusBadge label={formatStatus(item.status)} tone={toneForStatus(item.status)} />
            </View>

            <Text style={styles.label}>Pickup Address</Text>
            <Text style={styles.address}>{item.pickupAddress}</Text>
            <Text style={[styles.label, styles.labelGap]}>Drop-off Address</Text>
            <Text style={styles.address}>{item.dropoffAddress}</Text>

            <View style={styles.metaBlock}>
                <Text style={styles.metaText}>
                    Item Summary: {item.itemSummary || 'No item details shared'}
                </Text>
                <Text style={styles.metaText}>
                    ETA: {item.etaMinutes ? `${item.etaMinutes} min` : 'Awaiting estimate'}
                </Text>
                <Text style={styles.metaText}>Payout: {formatCurrency(item.paymentAmount)}</Text>
            </View>

            <View style={styles.actionRow}>
                <Button
                    title="Reject"
                    variant="outline"
                    onPress={() => handleReject(item)}
                    style={styles.secondaryAction}
                    disabled={isUpdating}
                />
                <Button
                    title="View Details"
                    onPress={() => navigation.navigate('DeliveryDetails', { delivery: item })}
                    style={styles.primaryAction}
                    disabled={isUpdating}
                />
            </View>
        </SurfaceCard>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SectionHeader
                    eyebrow="Queue"
                    title="Assigned Deliveries"
                    subtitle="Review incoming assignments, confirm them, or send them back."
                />
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
                    />
                }
                ListEmptyComponent={
                    <EmptyState
                        title={isLoading ? 'Loading assigned deliveries...' : 'No assigned deliveries'}
                        body={
                            isLoading
                                ? 'Pulling your assigned queue from dispatch.'
                                : 'You do not have any assigned deliveries right now.'
                        }
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
        padding: spacing.lg,
    },
    card: {
        marginBottom: spacing.md,
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
    orderNumber: {
        ...typography.h3,
        marginBottom: spacing.xs,
    },
    customer: {
        ...typography.bodySmall,
        color: colors.text,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        marginBottom: spacing.xs,
    },
    labelGap: {
        marginTop: spacing.sm,
    },
    address: {
        ...typography.body,
    },
    metaBlock: {
        marginTop: spacing.md,
        gap: spacing.xs,
    },
    metaText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    actionRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    secondaryAction: {
        flex: 1,
    },
    primaryAction: {
        flex: 1,
    },
});
