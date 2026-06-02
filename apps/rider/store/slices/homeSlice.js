import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { partnerAPI, jobsAPI } from '../../services/api';
import { normalizeDeliveries, normalizeDelivery } from '../../models/delivery';
import { initStatus } from './availabilitySlice';

export const fetchDriverHome = createAsyncThunk(
    'home/fetchDriverHome',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const profileRes = await partnerAPI.getProfile();
            const profile = profileRes?.data?.data ?? null;

            let activeDelivery = null;
            let assignedDeliveries = [];

            try {
                const [activeJobRes, assignedJobsRes] = await Promise.all([
                    jobsAPI.getActive(),
                    jobsAPI.getAssigned(),
                ]);

                activeDelivery = activeJobRes?.data?.data
                    ? normalizeDelivery(activeJobRes.data.data)
                    : null;
                assignedDeliveries = normalizeDeliveries(assignedJobsRes?.data?.data ?? []);
            } catch (jobsError) {
                console.warn('Delivery jobs unavailable:', jobsError?.response?.data?.message || jobsError?.message);
            }

            if (profile?.status) {
                dispatch(initStatus(profile.status));
            }

            return {
                profile,
                activeDelivery,
                assignedDeliveries,
            };
        } catch (error) {
            return rejectWithValue(
                error?.response?.data?.message ||
                error?.message ||
                'Failed to load driver dashboard'
            );
        }
    }
);

const initialState = {
    profile: null,
    activeDelivery: null,
    assignedDeliveries: [],
    isLoading: false,
    isRefreshing: false,
    error: null,
    lastUpdatedAt: null,
};

const homeSlice = createSlice({
    name: 'home',
    initialState,
    reducers: {
        setRefreshing(state, action) {
            state.isRefreshing = action.payload;
        },
        clearHomeError(state) {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDriverHome.pending, (state) => {
                state.error = null;
                if (!state.lastUpdatedAt) {
                    state.isLoading = true;
                } else {
                    state.isRefreshing = true;
                }
            })
            .addCase(fetchDriverHome.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.error = null;
                state.profile = action.payload.profile;
                state.activeDelivery = action.payload.activeDelivery;
                state.assignedDeliveries = action.payload.assignedDeliveries;
                state.lastUpdatedAt = Date.now();
            })
            .addCase(fetchDriverHome.rejected, (state, action) => {
                state.isLoading = false;
                state.isRefreshing = false;
                state.error = action.payload ?? 'Failed to load driver dashboard';
            });
    },
});

export const { setRefreshing, clearHomeError } = homeSlice.actions;
export const selectHomeProfile = (state) => state.home.profile;
export const selectActiveDelivery = (state) => state.home.activeDelivery;
export const selectAssignedDeliveries = (state) => state.home.assignedDeliveries;
export const selectHomeLoading = (state) => state.home.isLoading;
export const selectHomeRefreshing = (state) => state.home.isRefreshing;
export const selectHomeError = (state) => state.home.error;

export default homeSlice.reducer;

