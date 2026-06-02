import type { UnknownAction } from '@reduxjs/toolkit';
import type { ThunkDispatch } from 'redux-thunk';
import type { Delivery } from '../types/delivery';

export type RootState = {
    availability: {
        status: 'online' | 'offline';
        isSyncing: boolean;
        lastSyncError: string | null;
    };
    assignedDeliveries: {
        deliveries: Delivery[];
        isLoading: boolean;
        isRefreshing: boolean;
        isUpdating: boolean;
        error: string | null;
    };
    home: {
        profile: unknown;
        activeDelivery: Delivery | null;
        assignedDeliveries: Delivery[];
        isLoading: boolean;
        isRefreshing: boolean;
        error: string | null;
    };
    incomingRequest: {
        currentRequest: unknown;
        connectionStatus: 'disconnected' | 'connecting' | 'connected';
        isActing: boolean;
        error: string | null;
        lastEventAt: number | null;
    };
};

export type AppDispatch = ThunkDispatch<RootState, unknown, UnknownAction>;
