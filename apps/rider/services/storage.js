import * as SecureStore from 'expo-secure-store';
import { DeviceEventEmitter, Platform } from 'react-native';

// Platform-specific storage
// Use SecureStore on mobile, localStorage on web
const isWeb = Platform.OS === 'web';

const storage = {
    async setItem(key, value) {
        if (isWeb) {
            try {
                localStorage.setItem(key, value);
            } catch (error) {
                console.error('localStorage setItem error:', error);
            }
        } else {
            await SecureStore.setItemAsync(key, value);
        }
    },

    async getItem(key) {
        if (isWeb) {
            try {
                return localStorage.getItem(key);
            } catch (error) {
                console.error('localStorage getItem error:', error);
                return null;
            }
        } else {
            return await SecureStore.getItemAsync(key);
        }
    },

    async removeItem(key) {
        if (isWeb) {
            try {
                localStorage.removeItem(key);
            } catch (error) {
                console.error('localStorage removeItem error:', error);
            }
        } else {
            await SecureStore.deleteItemAsync(key);
        }
    }
};

const KEYS = {
    ACCESS_TOKEN: 'access_token',
    REFRESH_TOKEN: 'refresh_token',
    USER_DATA: 'user_data',

};

export const AUTH_STATE_CHANGED_EVENT = 'digifix:rider-auth-state-changed';

/**
 * Save authentication tokens securely
 */
export const saveTokens = async (accessToken, refreshToken) => {
    try {
        await storage.setItem(KEYS.ACCESS_TOKEN, accessToken);
        await storage.setItem(KEYS.REFRESH_TOKEN, refreshToken);
        DeviceEventEmitter.emit(AUTH_STATE_CHANGED_EVENT, { isAuthenticated: true });
    } catch (error) {
        console.error('Error saving tokens:', error);
        throw error;
    }
};

/**
 * Get access token
 */
export const getAccessToken = async () => {
    try {
        const token = await storage.getItem(KEYS.ACCESS_TOKEN);
        return token || null;
    } catch (error) {
        console.error('Error getting access token:', error);
        return null;
    }
};


/**
 * Get refresh token
 */
export const getRefreshToken = async () => {
    try {
        return await storage.getItem(KEYS.REFRESH_TOKEN);
    } catch (error) {
        console.error('Error getting refresh token:', error);
        return null;
    }
};

/**
 * Clear all tokens (logout)
 */
export const clearTokens = async () => {
    try {
        await storage.removeItem(KEYS.ACCESS_TOKEN);
        await storage.removeItem(KEYS.REFRESH_TOKEN);
        await storage.removeItem(KEYS.USER_DATA);
        DeviceEventEmitter.emit(AUTH_STATE_CHANGED_EVENT, { isAuthenticated: false });

    } catch (error) {
        console.error('Error clearing tokens:', error);
    }
};



/**
 * Save user data
 */
export const saveUserData = async (userData) => {
    try {
        await storage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
    } catch (error) {
        console.error('Error saving user data:', error);
    }
};

/**
 * Get user data
 */
export const getUserData = async () => {
    try {
        const data = await storage.getItem(KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
};

/**
 * Check if running in mock session (development mode)
 */
export const isMockSession = async () => {
    return false; // Always use real API - no mock sessions
};

