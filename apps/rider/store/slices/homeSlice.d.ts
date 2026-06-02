import type { AsyncThunk } from '@reduxjs/toolkit';
import type { Delivery } from '../../types/delivery';
import type { RootState } from '../types';

export const fetchDriverHome: AsyncThunk<
    {
        profile: unknown;
        activeDelivery: Delivery | null;
        assignedDeliveries: Delivery[];
    },
    void,
    { rejectValue: string }
>;

export function selectActiveDelivery(state: RootState): Delivery | null;
export function selectAssignedDeliveries(state: RootState): Delivery[];
