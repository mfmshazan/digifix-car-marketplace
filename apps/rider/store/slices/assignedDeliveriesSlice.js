import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { jobsAPI } from '../../services/api';
import { normalizeDeliveries } from '../../models/delivery';
import { fetchDriverHome } from './homeSlice';

export const fetchAssignedDeliveries = createAsyncThunk(
    'assignedDeliveries/fetchAssignedDeliveries',
    async (_, { rejectWithValue }) => {
        try {
            const response = await jobsAPI.getAssigned();
            return normalizeDeliveries(response?.data?.data ?? []);
        } catch (error) {
            console.warn('Assigned deliveries unavailable:', error?.response?.data?.message || error?.message);
            return [];
        }
    }
);

export const acceptAssignedDelivery = createAsyncThunk(
    'assignedDeliveries/acceptAssignedDelivery',
    async (deliveryId, { dispatch, rejectWithValue }) => {
        try {
            const response = await jobsAPI.acceptAssigned(deliveryId);

            // The accept response is enough to open Active Delivery. Refresh
            // dashboard data in the background so two additional API rounds do
            // not block navigation after the rider taps Accept.
            setTimeout(() => {
                void dispatch(fetchAssignedDeliveries());
                void dispatch(fetchDriverHome());
            }, 300);

            return response?.data?.data ?? null;
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to accept assigned delivery'
            );
        }
    }
);

export const rejectAssignedDelivery = createAsyncThunk(
    'assignedDeliveries/rejectAssignedDelivery',
    async (deliveryId, { dispatch, rejectWithValue }) => {
        try {
            const response = await jobsAPI.rejectAssigned(deliveryId);
            await Promise.all([
                dispatch(fetchAssignedDeliveries()),
                dispatch(fetchDriverHome()),
            ]);
            return response?.data?.data ?? null;
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to reject assigned delivery'
            );
        }
    }
);

const initialState = {
    deliveries: [],
    isLoading: false,
    isRefreshing: false,
    isUpdating: false,
    error: null,
};

const assignedDeliveriesSlice = createSlice({
    name: 'assignedDeliveries',
    initialState,
    reducers: {
        clearAssignedDeliveriesError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchAssignedDeliveries.pending, (state) => {
                state.error = null;
                if (state.deliveries.length > 0) {
                    state.isRefreshing = true;
                } else {
                    state.isLoading = true;
                }
            })
            .addCase(fetchAssignedDeliveries.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.deliveries = action.payload;
            })
            .addCase(fetchAssignedDeliveries.rejected, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.error = action.payload ?? 'Failed to load assigned deliveries';
            })
            .addCase(acceptAssignedDelivery.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(acceptAssignedDelivery.fulfilled, (state) => {
                state.isUpdating = false;
            })
            .addCase(acceptAssignedDelivery.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload ?? 'Failed to accept assigned delivery';
            })
            .addCase(rejectAssignedDelivery.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
            })
            .addCase(rejectAssignedDelivery.fulfilled, (state) => {
                state.isUpdating = false;
            })
            .addCase(rejectAssignedDelivery.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload ?? 'Failed to reject assigned delivery';
            });
    },
});

export const { clearAssignedDeliveriesError } = assignedDeliveriesSlice.actions;
export const selectAssignedDeliveries = (state) => state.assignedDeliveries.deliveries;
export const selectAssignedDeliveriesLoading = (state) => state.assignedDeliveries.isLoading;
export const selectAssignedDeliveriesRefreshing = (state) => state.assignedDeliveries.isRefreshing;
export const selectAssignedDeliveriesUpdating = (state) => state.assignedDeliveries.isUpdating;
export const selectAssignedDeliveriesError = (state) => state.assignedDeliveries.error;

export default assignedDeliveriesSlice.reducer;

