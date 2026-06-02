import type { DeliveryWorkflowStatus } from '../utils/deliveryWorkflow';

export type DeliveryStatus =
    | DeliveryWorkflowStatus
    | 'available'
    | 'arrived_at_dropoff'
    | 'failed'
    | 'cancelled';

export type Delivery = {
    id: number | string;
    orderNumber: string;
    customerName: string;
    customerPhone: string;
    pickupAddress: string;
    pickupLatitude: number | null;
    pickupLongitude: number | null;
    pickupContactName: string;
    pickupContactPhone: string;
    dropoffAddress: string;
    dropoffLatitude: number | null;
    dropoffLongitude: number | null;
    distanceKm: number | null;
    paymentAmount: number | null;
    itemSummary: string;
    specialInstructions: string;
    status: DeliveryStatus;
    assignedAt: string | null;
    acceptedAt: string | null;
    createdAt: string | null;
    etaMinutes: number | null;
};
