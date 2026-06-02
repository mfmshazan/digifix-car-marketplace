import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { partnerAPI } from '../../services/api';

const normalizeAvailabilityStatus = (status) =>
    status === 'offline' ? 'offline' : 'online';

export const hydrateAvailability = createAsyncThunk(
    'availability/hydrate',
    async (_, { rejectWithValue }) => {
        try {
            const response = await partnerAPI.getProfile();
            return normalizeAvailabilityStatus(response?.data?.data?.status);
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to load availability status'
            );
        }
    }
);

export const toggleAvailability = createAsyncThunk(
    'availability/toggle',
    async ({ newStatus, previousStatus }, { rejectWithValue }) => {
        try {
            const response = await partnerAPI.updateStatus(newStatus);
            return response?.data?.data?.status ?? newStatus;
        } catch (error) {
            return rejectWithValue({
                message:
                    error?.response?.data?.message ||
                    error?.message ||
                    'Failed to update availability status',
                previousStatus,
            });
        }
    }
);

const availabilitySlice = createSlice({
    name: 'availability',
    initialState: {
        status: 'offline',
        isSyncing: false,
        lastSyncError: null,
    },
    reducers: {
        setStatus(state, action) {
            state.status = action.payload;
        },
        initStatus(state, action) {
            state.status = normalizeAvailabilityStatus(action.payload);
            state.isSyncing = false;
            state.lastSyncError = null;
        },
        clearSyncError(state) {
            state.lastSyncError = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(hydrateAvailability.fulfilled, (state, action) => {
                state.status = action.payload;
                state.isSyncing = false;
                state.lastSyncError = null;
            })
            .addCase(toggleAvailability.pending, (state, action) => {
                state.status = normalizeAvailabilityStatus(action.meta.arg.newStatus);
                state.isSyncing = true;
                state.lastSyncError = null;
            })
            .addCase(toggleAvailability.fulfilled, (state, action) => {
                state.isSyncing = false;
                state.status = normalizeAvailabilityStatus(action.payload);
            })
            .addCase(toggleAvailability.rejected, (state, action) => {
                state.isSyncing = false;
                state.status = normalizeAvailabilityStatus(
                    action.payload?.previousStatus ?? state.status
                );
                state.lastSyncError = action.payload?.message ?? 'Unknown error';
            });
    },
});

export const { setStatus, initStatus, clearSyncError } = availabilitySlice.actions;
export const selectIsOnline = (state) => state.availability.status === 'online';
export const selectStatus = (state) => state.availability.status;
export const selectIsSyncing = (state) => state.availability.isSyncing;
export const selectSyncError = (state) => state.availability.lastSyncError;

export default availabilitySlice.reducer;
