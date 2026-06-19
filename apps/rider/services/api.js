import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getAccessToken, getRefreshToken, saveTokens, clearTokens } from './storage';

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let refreshSubscribers = [];

/**
 * Subscribe to token refresh
 */
const subscribeTokenRefresh = (callback) => {
    refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers when token is refreshed
 */
const onTokenRefreshed = (newAccessToken) => {
    refreshSubscribers.forEach((callback) => callback(null, newAccessToken));
    refreshSubscribers = [];
};

/**
 * Notify all subscribers when token refresh fails
 */
const onRefreshFailed = (error) => {
    refreshSubscribers.forEach((callback) => callback(error));
    refreshSubscribers = [];
};

/**
 * Request interceptor - Add access token to headers
 */
api.interceptors.request.use(
    async (config) => {
        const token = await getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response interceptor - Handle token refresh on 401/403
 */
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401/403 and we haven't tried to refresh yet
        if (
            (error.response?.status === 401 || error.response?.status === 403) &&
            !originalRequest._retry
        ) {
            if (isRefreshing) {
                // Wait for the ongoing refresh to complete
                return new Promise((resolve, reject) => {
                    subscribeTokenRefresh((err, newAccessToken) => {
                        if (err) {
                            return reject(err);
                        }
                        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                        resolve(api(originalRequest));
                    });
                });
            }


            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const refreshToken = await getRefreshToken();

                if (!refreshToken) {
                    // No refresh token, user needs to login again
                    await clearTokens();
                    throw new Error('No refresh token available');
                }

                // Call refresh endpoint
                const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                    refreshToken,
                });

                const { accessToken } = response.data.data;

                // Save new access token
                await saveTokens(accessToken, refreshToken);

                // Update authorization header
                api.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;

                // Notify all waiting requests
                onTokenRefreshed(accessToken);

                isRefreshing = false;

                // Retry original request
                return api(originalRequest);
            } catch (refreshError) {
                isRefreshing = false;
                onRefreshFailed(refreshError);
                await clearTokens();
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

// API methods
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    logout: (refreshToken) => api.post('/auth/logout', { refreshToken }),
    register: (data) => api.post('/auth/register', data),
};

export const partnerAPI = {
    getProfile: () => api.get('/partner/profile'),
    updateProfile: (data) => api.put('/partner/profile', data),
    deleteProfile: () => api.delete('/partner/profile'),
    updateStatus: (status) => api.put('/partner/status', { status }),

    updateLocation: (latitude, longitude) =>
        api.put('/partner/location', { latitude, longitude }),
};
export const jobsAPI = {
    getAvailable: () => api.get('/jobs/available'),
    getActive: () => api.get('/jobs/active'),
    getAssigned: () => api.get('/jobs/assigned'),
    getHistory: (limit = 20, offset = 0) =>
        api.get(`/jobs/history?limit=${limit}&offset=${offset}`),
    acceptAssigned: (jobId) => api.put(`/jobs/${jobId}/status`, { status: 'accepted' }),
    acceptIncomingRequest: (offerId) =>
        api.post(`/jobs/request-offers/${offerId}/accept`),
    declineIncomingRequest: (offerId, reason = 'driver_declined_request') =>
        api.post(`/jobs/request-offers/${offerId}/decline`, { reason }),
    expireIncomingRequest: (offerId) =>
        api.post(`/jobs/request-offers/${offerId}/expire`),
    rejectAssigned: (jobId) => api.post(`/jobs/${jobId}/reject`),
    updateStatus: (jobId, status, extraData = {}) =>
        api.put(`/jobs/${jobId}/status`, { status, ...extraData }),
    addLocation: (jobId, locationData) =>
        api.post(`/jobs/${jobId}/location`, locationData),
    submitProof: async (jobId, proofData) => {
        const formData = new FormData();
        formData.append('recipientName', proofData.recipientName || '');
        formData.append('notes', proofData.notes || '');
        formData.append('latitude', String(proofData.latitude));
        formData.append('longitude', String(proofData.longitude));

        // Append photo if available
        if (proofData.photoUri) {
            // In React Native, photoUri is a file:// path from camera
            const photoFile = {
                uri: proofData.photoUri,
                type: 'image/jpeg',
                name: 'delivery-photo.jpg',
            };
            formData.append('photo', photoFile);
        }

        // Append signature if available (as data URL or canvas)
        if (proofData.signatureData) {
            formData.append('signature', proofData.signatureData);
        }

        const token = await getAccessToken();
        if (!token) {
            throw new Error('Your rider session has expired. Please sign in again.');
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/proof`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    // Do not set Content-Type manually. React Native must add
                    // the multipart boundary generated for this FormData body.
                },
                body: formData,
                signal: controller.signal,
            });

            const responseText = await response.text();
            let result = {};

            try {
                result = responseText ? JSON.parse(responseText) : {};
            } catch {
                result = {};
            }

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    `Proof upload failed with status ${response.status}`
                );
            }

            return { data: result };
        } catch (error) {
            if (error?.name === 'AbortError') {
                throw new Error('Proof upload timed out. Check your connection and try again.');
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    },
};
export default api;



