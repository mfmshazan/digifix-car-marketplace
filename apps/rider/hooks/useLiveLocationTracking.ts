import { useCallback, useEffect, useState } from 'react';
import type { DeliveryStatus } from '../types/delivery';
import {
    getLocationErrorMessage,
    getLocationTrackingState,
    startLocationTracking,
    stopLocationTracking,
} from '../services/location';
import { DeliveryWorkflowStatus } from '../utils/deliveryWorkflow';

type UseLiveLocationTrackingOptions = {
    jobId?: string | number | null;
    status?: DeliveryStatus | null;
    intervalMs?: number;
};

type UseLiveLocationTrackingResult = {
    isTracking: boolean;
    isPaused: boolean;
    trackingError: string | null;
    startTracking: () => Promise<void>;
    stopTracking: () => Promise<void>;
};

const TRACKABLE_STATUSES: DeliveryStatus[] = [
    DeliveryWorkflowStatus.ACCEPTED,
    DeliveryWorkflowStatus.ARRIVED_PICKUP,
    DeliveryWorkflowStatus.PICKED_UP,
    DeliveryWorkflowStatus.IN_TRANSIT,
];

const isTrackableStatus = (status?: DeliveryStatus | null) =>
    Boolean(status && TRACKABLE_STATUSES.includes(status));

export const useLiveLocationTracking = ({
    jobId,
    status,
    intervalMs = 7000,
}: UseLiveLocationTrackingOptions): UseLiveLocationTrackingResult => {
    const [trackingState, setTrackingState] = useState(getLocationTrackingState());

    const syncTrackingState = useCallback(() => {
        setTrackingState(getLocationTrackingState());
    }, []);

    const startTracking = useCallback(async () => {
        if (!jobId) {
            syncTrackingState();
            return;
        }

        try {
            await startLocationTracking(jobId, { intervalMs });
            syncTrackingState();
        } catch (error) {
            setTrackingState({
                ...getLocationTrackingState(),
                lastError: getLocationErrorMessage(error),
            });
        }
    }, [intervalMs, jobId, syncTrackingState]);

    const stopTracking = useCallback(async () => {
        await stopLocationTracking();
        syncTrackingState();
    }, [syncTrackingState]);

    useEffect(() => {
        if (!jobId || !isTrackableStatus(status)) {
            void stopTracking();
            return;
        }

        void startTracking();
    }, [jobId, startTracking, status, stopTracking]);

    useEffect(() => () => {
        void stopLocationTracking();
    }, []);

    return {
        isTracking: trackingState.isTracking,
        isPaused: trackingState.isPaused,
        trackingError: trackingState.lastError,
        startTracking,
        stopTracking,
    };
};
