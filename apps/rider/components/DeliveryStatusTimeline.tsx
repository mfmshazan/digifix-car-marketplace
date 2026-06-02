import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Delivery } from '../types/delivery';
import { SurfaceCard } from './Common';
import { colors, radii, spacing, typography } from '../styles/theme';
import {
    DeliveryWorkflowStatus,
    isWorkflowStatus,
} from '../utils/deliveryWorkflow';

type DeliveryStatusTimelineProps = {
    status: Delivery['status'];
};

const TIMELINE_STEPS: readonly {
    status: DeliveryWorkflowStatus;
    label: string;
    hint: string;
}[] = [
    {
        status: DeliveryWorkflowStatus.ASSIGNED,
        label: 'Assigned',
        hint: 'Dispatch sent this order to you',
    },
    {
        status: DeliveryWorkflowStatus.ACCEPTED,
        label: 'Accepted',
        hint: 'You confirmed the delivery',
    },
    {
        status: DeliveryWorkflowStatus.ARRIVED_PICKUP,
        label: 'Arrived at Pickup',
        hint: 'You reached the merchant or pickup point',
    },
    {
        status: DeliveryWorkflowStatus.PICKED_UP,
        label: 'Picked Up',
        hint: 'The order is now in your possession',
    },
    {
        status: DeliveryWorkflowStatus.IN_TRANSIT,
        label: 'In Transit',
        hint: 'Heading to the customer',
    },
    {
        status: DeliveryWorkflowStatus.DELIVERED,
        label: 'Delivered',
        hint: 'Final handoff completed',
    },
];

const getCurrentStepIndex = (status: Delivery['status']) => {
    if (!isWorkflowStatus(status)) {
        return -1;
    }

    return TIMELINE_STEPS.findIndex((step) => step.status === status);
};

export default function DeliveryStatusTimeline({
    status,
}: DeliveryStatusTimelineProps) {
    const currentIndex = getCurrentStepIndex(status);

    return (
        <SurfaceCard style={styles.card}>
            <Text style={styles.title}>Status Timeline</Text>
            <View style={styles.timeline}>
                {TIMELINE_STEPS.map((step, index) => {
                    const isCompleted = currentIndex >= index;
                    const isCurrent = currentIndex === index;
                    const isLast = index === TIMELINE_STEPS.length - 1;

                    return (
                        <View key={step.status} style={styles.stepRow}>
                            <View style={styles.railColumn}>
                                <View
                                    style={[
                                        styles.dot,
                                        isCompleted && styles.dotCompleted,
                                        isCurrent && styles.dotCurrent,
                                    ]}
                                />
                                {!isLast ? (
                                    <View
                                        style={[
                                            styles.rail,
                                            isCompleted && styles.railCompleted,
                                        ]}
                                    />
                                ) : null}
                            </View>

                            <View style={styles.copyColumn}>
                                <Text
                                    style={[
                                        styles.stepLabel,
                                        isCompleted && styles.stepLabelActive,
                                    ]}
                                >
                                    {step.label}
                                </Text>
                                <Text style={styles.stepHint}>{step.hint}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>
        </SurfaceCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
        marginBottom: spacing.md,
    },
    timeline: {
        gap: spacing.xs,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: spacing.sm,
    },
    railColumn: {
        width: 22,
        alignItems: 'center',
    },
    dot: {
        width: 14,
        height: 14,
        borderRadius: radii.pill,
        borderWidth: 2,
        borderColor: colors.borderStrong,
        backgroundColor: colors.surface,
        marginTop: 2,
    },
    dotCompleted: {
        borderColor: colors.secondary,
        backgroundColor: colors.secondarySoft,
    },
    dotCurrent: {
        borderColor: colors.primary,
        backgroundColor: colors.primarySoft,
    },
    rail: {
        flex: 1,
        width: 2,
        backgroundColor: colors.border,
        marginTop: spacing.xs,
        marginBottom: -spacing.xs,
    },
    railCompleted: {
        backgroundColor: colors.secondary,
    },
    copyColumn: {
        flex: 1,
        paddingBottom: spacing.md,
    },
    stepLabel: {
        ...typography.body,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    stepLabelActive: {
        color: colors.text,
    },
    stepHint: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginTop: 2,
    },
});
