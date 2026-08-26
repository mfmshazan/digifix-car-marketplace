import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StackScreenProps } from '@react-navigation/stack';
import { useDispatch, useSelector } from 'react-redux';
import { ScreenHero, StatusBadge } from '../components/Common';
import DeliveryActionControls from '../components/DeliveryActionControls';
import DeliveryDetailSection from '../components/DeliveryDetailSection';
import { colors, spacing, typography } from '../styles/theme';
import type { Delivery, DeliveryStatus } from '../types/delivery';
import type { RootStackParamList } from '../types/navigation';
import type { AppDispatch, RootState } from '../store/types';
import {
    fetchAssignedDeliveries,
    selectAssignedDeliveries,
} from '../store/slices/assignedDeliveriesSlice';
import {
    fetchDriverHome,
    selectActiveDelivery,
    selectAssignedDeliveries as selectHomeAssignedDeliveries,
} from '../store/slices/homeSlice';
import {
    DeliveryWorkflowAction,
    isWorkflowStatus,
} from '../utils/deliveryWorkflow';

type DeliveryDetailsScreenProps = StackScreenProps<
    RootStackParamList,
    'DeliveryDetails'
>;

const formatStatus = (status: DeliveryStatus) =>
    status.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const toneForStatus = (status: DeliveryStatus) => {
    if (['accepted', 'picked_up', 'in_transit', 'delivered'].includes(status)) {
        return 'success' as const;
    }
    if (['assigned', 'arrived_at_pickup', 'arrived_at_dropoff'].includes(status)) {
        return 'info' as const;
    }
    if (['failed', 'cancelled'].includes(status)) {
        return 'danger' as const;
    }
    return 'warning' as const;
};

const formatCurrency = (value: number | null) =>
    `Rs. ${Number(value || 0).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

export default function DeliveryDetailsScreen({
    route,
    navigation,
}: DeliveryDetailsScreenProps) {
    const dispatch = useDispatch<AppDispatch>();
    const activeDelivery = useSelector((state: RootState) =>
        selectActiveDelivery(state)
    );
    const assignedDeliveries = useSelector((state: RootState) =>
        selectAssignedDeliveries(state)
    );
    const homeAssignedDeliveries = useSelector((state: RootState) =>
        selectHomeAssignedDeliveries(state)
    );
    const deliveryId = route.params.deliveryId ?? route.params.delivery?.id;
    const matchedDelivery = useMemo(() => {
        if (!deliveryId) {
            return null;
        }

        if (activeDelivery?.id === deliveryId) {
            return activeDelivery;
        }

        return (
            assignedDeliveries.find((item) => item.id === deliveryId) ||
            homeAssignedDeliveries.find((item) => item.id === deliveryId) ||
            null
        );
    }, [
        activeDelivery,
        assignedDeliveries,
        deliveryId,
        homeAssignedDeliveries,
    ]);
    const [delivery, setDelivery] = useState<Delivery | null>(
        route.params.delivery ?? matchedDelivery
    );

    useEffect(() => {
        if (!delivery && deliveryId) {
            void dispatch(fetchAssignedDeliveries());
            void dispatch(fetchDriverHome());
        }
    }, [delivery, deliveryId, dispatch]);

    useEffect(() => {
        if (matchedDelivery) {
            setDelivery(matchedDelivery);
        }
    }, [matchedDelivery]);

    if (!delivery) {
        return (
            <View style={styles.loaderWrap}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading delivery details...</Text>
            </View>
        );
    }

    const workflowStatus = isWorkflowStatus(delivery.status) ? delivery.status : null;

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <ScreenHero
                eyebrow="Delivery brief"
                title={delivery.orderNumber}
                subtitle="Review the complete route, contacts, payout, and instructions before taking action."
                icon="document-text-outline"
                right={
                    <StatusBadge
                        label={formatStatus(delivery.status)}
                        tone={toneForStatus(delivery.status)}
                    />
                }
            >
                <View style={styles.heroMetaRow}>
                    <View style={styles.heroMetaItem}>
                        <Ionicons name="wallet-outline" size={16} color="#BFDBFE" />
                        <Text style={styles.heroMetaText}>{formatCurrency(delivery.paymentAmount)}</Text>
                    </View>
                    <View style={styles.heroMetaItem}>
                        <Ionicons name="navigate-outline" size={16} color="#BFDBFE" />
                        <Text style={styles.heroMetaText}>
                            {delivery.distanceKm ? `${delivery.distanceKm.toFixed(1)} km` : 'Route pending'}
                        </Text>
                    </View>
                </View>
            </ScreenHero>

            <DeliveryDetailSection title="Order ID" icon="barcode-outline">
                <Text style={styles.primaryText}>{delivery.orderNumber}</Text>
            </DeliveryDetailSection>

            <DeliveryDetailSection title="Pickup Information" icon="storefront-outline">
                <Text style={styles.primaryText}>{delivery.pickupAddress}</Text>
                {delivery.pickupContactName ? (
                    <Text style={styles.secondaryText}>
                        Contact: {delivery.pickupContactName}
                    </Text>
                ) : null}
                {delivery.pickupContactPhone ? (
                    <Text style={styles.secondaryText}>
                        Phone: {delivery.pickupContactPhone}
                    </Text>
                ) : null}
                {delivery.etaMinutes ? (
                    <Text style={styles.metaText}>ETA: {delivery.etaMinutes} min</Text>
                ) : null}
            </DeliveryDetailSection>

            <DeliveryDetailSection
                title="Customer / Drop-off Information"
                icon="home-outline"
                iconColor={colors.danger}
            >
                <Text style={styles.primaryText}>{delivery.dropoffAddress}</Text>
                <Text style={styles.secondaryText}>Customer: {delivery.customerName}</Text>
                <Text style={styles.secondaryText}>Phone: {delivery.customerPhone}</Text>
            </DeliveryDetailSection>

            <DeliveryDetailSection title="Item Details" icon="cube-outline" iconColor={colors.accent}>
                <Text style={styles.primaryText}>
                    {delivery.itemSummary || 'No item details provided'}
                </Text>
                <Text style={styles.metaText}>Payout: {formatCurrency(delivery.paymentAmount)}</Text>
                {delivery.distanceKm ? (
                    <Text style={styles.metaText}>
                        Distance: {delivery.distanceKm.toFixed(1)} km
                    </Text>
                ) : null}
            </DeliveryDetailSection>

            <DeliveryDetailSection title="Special Instructions" icon="alert-circle-outline" iconColor={colors.warning}>
                <Text style={styles.primaryText}>
                    {delivery.specialInstructions || 'No special instructions'}
                </Text>
            </DeliveryDetailSection>

            <DeliveryDetailSection title="Current Status" icon="pulse-outline" iconColor={colors.success}>
                <Text style={styles.primaryText}>{formatStatus(delivery.status)}</Text>
                {delivery.assignedAt ? (
                    <Text style={styles.metaText}>
                        Assigned: {new Date(delivery.assignedAt).toLocaleString()}
                    </Text>
                ) : null}
                {delivery.acceptedAt ? (
                    <Text style={styles.metaText}>
                        Accepted: {new Date(delivery.acceptedAt).toLocaleString()}
                    </Text>
                ) : null}
            </DeliveryDetailSection>

            {workflowStatus ? (
                <DeliveryActionControls
                    delivery={delivery}
                    onDeliveryChange={setDelivery}
                    onActionSuccess={({ action, delivery: nextDelivery }) => {
                        if (action === DeliveryWorkflowAction.REJECT) {
                            navigation.goBack();
                            return;
                        }

                        if (action === DeliveryWorkflowAction.ACCEPT) {
                            navigation.navigate('ActiveDelivery', {
                                job: nextDelivery,
                            });
                            return;
                        }

                        if (action === DeliveryWorkflowAction.COMPLETE_DELIVERY) {
                            navigation.navigate('ProofOfDelivery', {
                                jobId: nextDelivery.id,
                            });
                        }
                    }}
                />
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
        padding: spacing.lg,
        paddingBottom: spacing.xl,
    },
    loaderWrap: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.background,
        padding: spacing.lg,
    },
    loadingText: {
        ...typography.body,
        color: colors.textSecondary,
        marginTop: spacing.sm,
    },
    primaryText: {
        ...typography.body,
        color: colors.text,
    },
    secondaryText: {
        ...typography.bodySmall,
        color: colors.textSecondary,
    },
    metaText: {
        ...typography.bodySmall,
        color: colors.secondaryDark,
        fontWeight: '700',
    },
    heroMetaRow: {
        flexDirection: 'row',
        gap: spacing.lg,
        marginTop: spacing.lg,
        paddingTop: spacing.md,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.12)',
    },
    heroMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    heroMetaText: {
        ...typography.bodySmall,
        color: colors.textOnDarkMuted,
        fontWeight: '700',
    },
});
