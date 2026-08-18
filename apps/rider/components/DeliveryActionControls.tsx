import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { Button, SurfaceCard } from './Common';
import { jobsAPI } from '../services/api';
import { getCurrentLocation } from '../services/location';
import {
    acceptAssignedDelivery,
    rejectAssignedDelivery,
} from '../store/slices/assignedDeliveriesSlice';
import { fetchDriverHome } from '../store/slices/homeSlice';
import type { AppDispatch } from '../store/types';
import type { Delivery } from '../types/delivery';
import {
    DELIVERY_ACTION_LABELS,
    DeliveryWorkflowAction,
    assertValidTransition,
    getAvailableActions,
    getNextStatusForAction,
    isWorkflowStatus,
} from '../utils/deliveryWorkflow';
import { colors, spacing, typography } from '../styles/theme';

type DeliveryActionSuccess = {
    action: DeliveryWorkflowAction;
    delivery: Delivery;
};

type DeliveryActionControlsProps = {
    delivery: Delivery;
    onDeliveryChange?: (delivery: Delivery) => void;
    onActionSuccess?: (result: DeliveryActionSuccess) => void;
};

type ActionRequestState = {
    action: DeliveryWorkflowAction;
};

const ACTION_ORDER: readonly DeliveryWorkflowAction[] = [
    DeliveryWorkflowAction.ARRIVE_PICKUP,
    DeliveryWorkflowAction.PICK_UP,
    DeliveryWorkflowAction.START_TRANSIT,
    DeliveryWorkflowAction.ARRIVE_DROPOFF,
    DeliveryWorkflowAction.COMPLETE_DELIVERY,
];

const ACTION_VARIANTS: Record<
    DeliveryWorkflowAction,
    'primary' | 'outline' | 'danger'
> = {
    [DeliveryWorkflowAction.ACCEPT]: 'primary',
    [DeliveryWorkflowAction.REJECT]: 'outline',
    [DeliveryWorkflowAction.ARRIVE_PICKUP]: 'primary',
    [DeliveryWorkflowAction.PICK_UP]: 'primary',
    [DeliveryWorkflowAction.START_TRANSIT]: 'primary',
    [DeliveryWorkflowAction.ARRIVE_DROPOFF]: 'primary',
    [DeliveryWorkflowAction.COMPLETE_DELIVERY]: 'danger',
    [DeliveryWorkflowAction.CANCEL]: 'danger',
};

const getActionTitle = (action: DeliveryWorkflowAction) =>
    DELIVERY_ACTION_LABELS[action] ?? 'Continue';

const getApiErrorMessage = (error: unknown) => {
    if (
        error &&
        typeof error === 'object' &&
        'response' in error &&
        error.response &&
        typeof error.response === 'object' &&
        'data' in error.response &&
        error.response.data &&
        typeof error.response.data === 'object' &&
        'message' in error.response.data &&
        typeof error.response.data.message === 'string'
    ) {
        return error.response.data.message;
    }

    return error instanceof Error
        ? error.message
        : 'We could not update the delivery status. Please try again.';
};

export default function DeliveryActionControls({
    delivery,
    onDeliveryChange,
    onActionSuccess,
}: DeliveryActionControlsProps) {
    const dispatch = useDispatch<AppDispatch>();
    const [loadingAction, setLoadingAction] =
        useState<DeliveryWorkflowAction | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [lastFailedRequest, setLastFailedRequest] =
        useState<ActionRequestState | null>(null);

    const availableActions = useMemo(() => {
        if (!isWorkflowStatus(delivery.status)) {
            return [];
        }

        const allowed = getAvailableActions(delivery.status).filter((action) =>
            ACTION_ORDER.includes(action)
        );

        return ACTION_ORDER.filter((action) => allowed.includes(action));
    }, [delivery.status]);

    const runAction = async (action: DeliveryWorkflowAction) => {
        if (!isWorkflowStatus(delivery.status)) {
            return;
        }

        setLoadingAction(action);
        setActionError(null);
        let didSucceed = false;

        try {
            let nextDelivery: Delivery;

            if (action === DeliveryWorkflowAction.ACCEPT) {
                const result = await dispatch(acceptAssignedDelivery(delivery.id));
                if (acceptAssignedDelivery.rejected.match(result)) {
                    throw new Error(
                        typeof result.payload === 'string'
                            ? result.payload
                            : 'Failed to accept delivery'
                    );
                }

                nextDelivery = {
                    ...delivery,
                    status:
                        getNextStatusForAction(delivery.status, action) ?? delivery.status,
                    acceptedAt: new Date().toISOString(),
                };
            } else if (action === DeliveryWorkflowAction.REJECT) {
                const result = await dispatch(rejectAssignedDelivery(delivery.id));
                if (rejectAssignedDelivery.rejected.match(result)) {
                    throw new Error(
                        typeof result.payload === 'string'
                            ? result.payload
                            : 'Failed to reject delivery'
                    );
                }

                nextDelivery = {
                    ...delivery,
                    status:
                        getNextStatusForAction(delivery.status, action) ?? delivery.status,
                };
            } else {
                if (action === DeliveryWorkflowAction.COMPLETE_DELIVERY) {
                    nextDelivery = {
                        ...delivery,
                    };

                    onDeliveryChange?.(nextDelivery);
                    onActionSuccess?.({ action, delivery: nextDelivery });
                    setLastFailedRequest(null);
                    didSucceed = true;
                    return;
                }

                const nextStatus = getNextStatusForAction(delivery.status, action);

                if (!nextStatus) {
                    throw new Error(`Action "${action}" is not available`);
                }

                assertValidTransition(delivery.status, nextStatus);

                let locationPayload: { latitude?: number; longitude?: number } = {};

                try {
                    const location = await getCurrentLocation();
                    locationPayload = {
                        latitude: location.latitude,
                        longitude: location.longitude,
                    };
                } catch (error) {
                    console.warn('Could not get location for delivery action update');
                }

                try {
                    await jobsAPI.updateStatus(delivery.id, nextStatus, {
                        ...locationPayload,
                    });
                } catch (error) {
                    const apiMessage = getApiErrorMessage(error);
                    const canRepairStaleAcceptedState =
                        action === DeliveryWorkflowAction.ARRIVE_PICKUP &&
                        nextStatus === 'arrived_at_pickup' &&
                        apiMessage.includes(
                            'Invalid transition from assigned to arrived_at_pickup'
                        );

                    if (!canRepairStaleAcceptedState) {
                        throw error;
                    }

                    await jobsAPI.updateStatus(delivery.id, 'accepted', {
                        ...locationPayload,
                    });
                    await jobsAPI.updateStatus(delivery.id, nextStatus, {
                        ...locationPayload,
                    });
                }

                await dispatch(fetchDriverHome());

                nextDelivery = {
                    ...delivery,
                    status: nextStatus,
                };
            }

            onDeliveryChange?.(nextDelivery);
            onActionSuccess?.({ action, delivery: nextDelivery });
            setLastFailedRequest(null);
            didSucceed = true;
        } catch (error) {
            setActionError(getApiErrorMessage(error));
            setLastFailedRequest({
                action,
            });
        } finally {
            setLoadingAction(null);
        }
    };

    const handleActionPress = (action: DeliveryWorkflowAction) => {
        if (loadingAction) {
            return;
        }

        setActionError(null);
        void runAction(action);
    };

    if (!availableActions.length) {
        return null;
    }

    return (
        <>
            <View style={styles.actionGroup}>
                {actionError ? (
                    <SurfaceCard style={styles.errorCard}>
                        <Text style={styles.errorTitle}>Action failed</Text>
                        <Text style={styles.errorMessage}>{actionError}</Text>
                        {lastFailedRequest ? (
                            <Button
                                title={`Retry ${getActionTitle(lastFailedRequest.action)}`}
                                variant="outline"
                                onPress={() => void runAction(lastFailedRequest.action)}
                                loading={loadingAction === lastFailedRequest.action}
                            />
                        ) : null}
                    </SurfaceCard>
                ) : null}

                {availableActions.map((action) => (
                    <Button
                        key={action}
                        title={getActionTitle(action)}
                        variant={ACTION_VARIANTS[action]}
                        onPress={() => handleActionPress(action)}
                        loading={loadingAction === action}
                        disabled={loadingAction !== null && loadingAction !== action}
                        style={styles.actionButton}
                    />
                ))}
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    actionGroup: {
        gap: spacing.sm,
        marginTop: spacing.sm,
    },
    actionButton: {
        width: '100%',
    },
    errorCard: {
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.dangerSoft,
    },
    errorTitle: {
        ...typography.h3,
        color: colors.danger,
        marginBottom: spacing.xs,
    },
    errorMessage: {
        ...typography.bodySmall,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
});
