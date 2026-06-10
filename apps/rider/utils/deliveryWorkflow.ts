export enum DeliveryWorkflowStatus {
    ASSIGNED = 'assigned',
    ACCEPTED = 'accepted',
    ARRIVED_PICKUP = 'arrived_at_pickup',
    PICKED_UP = 'picked_up',
    IN_TRANSIT = 'in_transit',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

export enum DeliveryWorkflowAction {
    ACCEPT = 'accept',
    REJECT = 'reject',
    ARRIVE_PICKUP = 'arrive_pickup',
    PICK_UP = 'pick_up',
    START_TRANSIT = 'start_transit',
    COMPLETE_DELIVERY = 'complete_delivery',
    CANCEL = 'cancel',
}

export const DELIVERY_WORKFLOW_TRANSITIONS: Readonly<
    Record<DeliveryWorkflowStatus, readonly DeliveryWorkflowStatus[]>
> = {
    [DeliveryWorkflowStatus.ASSIGNED]: [
        DeliveryWorkflowStatus.ACCEPTED,
        DeliveryWorkflowStatus.CANCELLED,
    ],
    [DeliveryWorkflowStatus.ACCEPTED]: [
        DeliveryWorkflowStatus.ARRIVED_PICKUP,
        DeliveryWorkflowStatus.CANCELLED,
    ],
    [DeliveryWorkflowStatus.ARRIVED_PICKUP]: [
        DeliveryWorkflowStatus.PICKED_UP,
        DeliveryWorkflowStatus.CANCELLED,
    ],
    [DeliveryWorkflowStatus.PICKED_UP]: [
        DeliveryWorkflowStatus.IN_TRANSIT,
        DeliveryWorkflowStatus.CANCELLED,
    ],
    [DeliveryWorkflowStatus.IN_TRANSIT]: [
        DeliveryWorkflowStatus.DELIVERED,
        DeliveryWorkflowStatus.CANCELLED,
    ],
    [DeliveryWorkflowStatus.DELIVERED]: [],
    [DeliveryWorkflowStatus.CANCELLED]: [],
};

export const DELIVERY_WORKFLOW_ACTIONS: Readonly<
    Record<DeliveryWorkflowStatus, readonly DeliveryWorkflowAction[]>
> = {
    [DeliveryWorkflowStatus.ASSIGNED]: [
        DeliveryWorkflowAction.ACCEPT,
        DeliveryWorkflowAction.REJECT,
    ],
    [DeliveryWorkflowStatus.ACCEPTED]: [
        DeliveryWorkflowAction.ARRIVE_PICKUP,
        DeliveryWorkflowAction.CANCEL,
    ],
    [DeliveryWorkflowStatus.ARRIVED_PICKUP]: [
        DeliveryWorkflowAction.PICK_UP,
        DeliveryWorkflowAction.CANCEL,
    ],
    [DeliveryWorkflowStatus.PICKED_UP]: [
        DeliveryWorkflowAction.START_TRANSIT,
        DeliveryWorkflowAction.CANCEL,
    ],
    [DeliveryWorkflowStatus.IN_TRANSIT]: [
        DeliveryWorkflowAction.COMPLETE_DELIVERY,
        DeliveryWorkflowAction.CANCEL,
    ],
    [DeliveryWorkflowStatus.DELIVERED]: [],
    [DeliveryWorkflowStatus.CANCELLED]: [],
};

export const DELIVERY_ACTION_TARGET_STATUS: Readonly<
    Record<DeliveryWorkflowAction, DeliveryWorkflowStatus>
> = {
    [DeliveryWorkflowAction.ACCEPT]: DeliveryWorkflowStatus.ACCEPTED,
    [DeliveryWorkflowAction.REJECT]: DeliveryWorkflowStatus.CANCELLED,
    [DeliveryWorkflowAction.ARRIVE_PICKUP]: DeliveryWorkflowStatus.ARRIVED_PICKUP,
    [DeliveryWorkflowAction.PICK_UP]: DeliveryWorkflowStatus.PICKED_UP,
    [DeliveryWorkflowAction.START_TRANSIT]: DeliveryWorkflowStatus.IN_TRANSIT,
    [DeliveryWorkflowAction.COMPLETE_DELIVERY]: DeliveryWorkflowStatus.DELIVERED,
    [DeliveryWorkflowAction.CANCEL]: DeliveryWorkflowStatus.CANCELLED,
};

export const DELIVERY_ACTION_LABELS: Readonly<
    Record<DeliveryWorkflowAction, string>
> = {
    [DeliveryWorkflowAction.ACCEPT]: 'Accept Delivery',
    [DeliveryWorkflowAction.REJECT]: 'Reject Delivery',
    [DeliveryWorkflowAction.ARRIVE_PICKUP]: 'Arrived at Pickup',
    [DeliveryWorkflowAction.PICK_UP]: 'Confirm Pickup',
    [DeliveryWorkflowAction.START_TRANSIT]: 'Start Transit',
    [DeliveryWorkflowAction.COMPLETE_DELIVERY]: 'Complete Delivery',
    [DeliveryWorkflowAction.CANCEL]: 'Cancel Delivery',
};

export const isWorkflowStatus = (
    status: string
): status is DeliveryWorkflowStatus =>
    Object.values(DeliveryWorkflowStatus).includes(
        status as DeliveryWorkflowStatus
    );

export const getAvailableTransitions = (
    currentStatus: DeliveryWorkflowStatus
): readonly DeliveryWorkflowStatus[] =>
    DELIVERY_WORKFLOW_TRANSITIONS[currentStatus] ?? [];

export const canTransitionTo = (
    currentStatus: DeliveryWorkflowStatus,
    nextStatus: DeliveryWorkflowStatus
): boolean => getAvailableTransitions(currentStatus).includes(nextStatus);

export const assertValidTransition = (
    currentStatus: DeliveryWorkflowStatus,
    nextStatus: DeliveryWorkflowStatus
): DeliveryWorkflowStatus => {
    if (!canTransitionTo(currentStatus, nextStatus)) {
        throw new Error(
            `Invalid delivery transition from ${currentStatus} to ${nextStatus}`
        );
    }

    return nextStatus;
};

export const getAvailableActions = (
    currentStatus: DeliveryWorkflowStatus
): readonly DeliveryWorkflowAction[] =>
    DELIVERY_WORKFLOW_ACTIONS[currentStatus] ?? [];

export const canPerformAction = (
    currentStatus: DeliveryWorkflowStatus,
    action: DeliveryWorkflowAction
): boolean => getAvailableActions(currentStatus).includes(action);

export const getNextStatusForAction = (
    currentStatus: DeliveryWorkflowStatus,
    action: DeliveryWorkflowAction
): DeliveryWorkflowStatus | null => {
    if (!canPerformAction(currentStatus, action)) {
        return null;
    }

    const nextStatus = DELIVERY_ACTION_TARGET_STATUS[action];
    return canTransitionTo(currentStatus, nextStatus) ? nextStatus : null;
};

export const isTerminalStatus = (
    status: DeliveryWorkflowStatus
): boolean => getAvailableTransitions(status).length === 0;
