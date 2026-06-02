import type { AsyncThunk } from '@reduxjs/toolkit';
import type { Delivery } from '../../types/delivery';
import type { RootState } from '../types';

export const fetchAssignedDeliveries: AsyncThunk<
    Delivery[],
    void,
    { rejectValue: string }
>;

export const acceptAssignedDelivery: AsyncThunk<
    Delivery | null,
    Delivery['id'],
    { rejectValue: string }
>;

export const rejectAssignedDelivery: AsyncThunk<
    { id: Delivery['id'] } | null,
    Delivery['id'],
    { rejectValue: string }
>;

export const clearAssignedDeliveriesError: () => {
    type: string;
};

export const selectAssignedDeliveries: (state: RootState) => Delivery[];
export const selectAssignedDeliveriesLoading: (state: RootState) => boolean;
export const selectAssignedDeliveriesRefreshing: (state: RootState) => boolean;
export const selectAssignedDeliveriesUpdating: (state: RootState) => boolean;
export const selectAssignedDeliveriesError: (
    state: RootState
) => string | null;
