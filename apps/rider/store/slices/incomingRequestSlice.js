import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { normalizeDelivery } from '../../models/delivery';
import { jobsAPI } from '../../services/api';
import { fetchAssignedDeliveries } from './assignedDeliveriesSlice';
import { fetchDriverHome } from './homeSlice';

export const acceptIncomingRequest = createAsyncThunk(
    'incomingRequest/accept',
    async (requestId, { dispatch, rejectWithValue }) => {
        try {
            const response = await jobsAPI.acceptIncomingRequest(requestId);
            await Promise.all([
                dispatch(fetchDriverHome()),
                dispatch(fetchAssignedDeliveries()),
            ]);

            return normalizeDelivery(response?.data?.data ?? {});
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                    error?.message ||
                    'Failed to accept incoming request'
            );
        }
    }
);

export const declineIncomingRequest = createAsyncThunk(
    'incomingRequest/decline',
    async ({ requestId, reason }, { dispatch, rejectWithValue }) => {
        try {
            const response = await jobsAPI.declineIncomingRequest(requestId, reason);
            await Promise.all([
                dispatch(fetchDriverHome()),
                dispatch(fetchAssignedDeliveries()),
            ]);
            return response?.data?.data ?? { requestId, resolution: 'declined' };
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                    error?.message ||
                    'Failed to decline incoming request'
            );
        }
    }
);

export const expireIncomingRequest = createAsyncThunk(
    'incomingRequest/expire',
    async (requestId, { dispatch, rejectWithValue }) => {
        try {
            const response = await jobsAPI.expireIncomingRequest(requestId);
            await Promise.all([
                dispatch(fetchDriverHome()),
                dispatch(fetchAssignedDeliveries()),
            ]);
            return response?.data?.data ?? { requestId, resolution: 'expired' };
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                    error?.message ||
                    'Failed to expire incoming request'
            );
        }
    }
);

const initialState = {
    currentRequest: null,
    connectionStatus: 'disconnected',
    isActing: false,
    error: null,
    lastEventAt: null,
};

const incomingRequestSlice = createSlice({
    name: 'incomingRequest',
    initialState,
    reducers: {
        setSocketConnectionStatus(state, action) {
            state.connectionStatus = action.payload;
        },
        receiveIncomingRequest(state, action) {
            state.currentRequest = action.payload;
            state.error = null;
            state.lastEventAt = Date.now();
        },
        resolveIncomingRequest(state, action) {
            if (
                !state.currentRequest ||
                (action.payload?.requestId &&
                    state.currentRequest.requestId !== action.payload.requestId)
            ) {
                return;
            }

            state.currentRequest = null;
            state.isActing = false;
            state.lastEventAt = Date.now();
        },
        clearIncomingRequest(state) {
            state.currentRequest = null;
            state.isActing = false;
            state.error = null;
        },
        setIncomingRequestError(state, action) {
            state.error = action.payload;
            state.isActing = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(acceptIncomingRequest.pending, (state) => {
                state.isActing = true;
                state.error = null;
            })
            .addCase(acceptIncomingRequest.fulfilled, (state) => {
                state.isActing = false;
                state.currentRequest = null;
                state.error = null;
            })
            .addCase(acceptIncomingRequest.rejected, (state, action) => {
                state.isActing = false;
                state.error = action.payload ?? 'Failed to accept incoming request';
            })
            .addCase(declineIncomingRequest.pending, (state) => {
                state.isActing = true;
                state.error = null;
            })
            .addCase(declineIncomingRequest.fulfilled, (state) => {
                state.isActing = false;
                state.currentRequest = null;
                state.error = null;
            })
            .addCase(declineIncomingRequest.rejected, (state, action) => {
                state.isActing = false;
                state.error = action.payload ?? 'Failed to decline incoming request';
            })
            .addCase(expireIncomingRequest.pending, (state) => {
                state.isActing = true;
                state.error = null;
            })
            .addCase(expireIncomingRequest.fulfilled, (state) => {
                state.isActing = false;
                state.currentRequest = null;
                state.error = null;
            })
            .addCase(expireIncomingRequest.rejected, (state, action) => {
                state.isActing = false;
                state.error = action.payload ?? 'Failed to expire incoming request';
            });
    },
});

export const {
    setSocketConnectionStatus,
    receiveIncomingRequest,
    resolveIncomingRequest,
    clearIncomingRequest,
    setIncomingRequestError,
} = incomingRequestSlice.actions;

export const selectIncomingRequest = (state) => state.incomingRequest.currentRequest;
export const selectIncomingRequestConnectionStatus = (state) =>
    state.incomingRequest.connectionStatus;
export const selectIncomingRequestActing = (state) => state.incomingRequest.isActing;
export const selectIncomingRequestError = (state) => state.incomingRequest.error;

export default incomingRequestSlice.reducer;
