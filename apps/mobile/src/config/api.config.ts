/**
 * API Configuration for DIGIFIX Mobile App
 * 
 * This file handles API URL configuration for different environments:
 * - Android Emulator: Uses 10.0.2.2 (maps to host's localhost)
 * - iOS Simulator: Uses localhost
 * - Physical Device: Uses your computer's actual IP address
 * - Web: Uses localhost
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// CONFIGURATION - Update these values
// ============================================

// Your computer's local IP address (for physical device testing)
// Run 'ipconfig' (Windows) or 'ifconfig' (Mac/Linux) to find this
const LOCAL_IP = '192.168.8.168';

// Backend port (should match Docker/backend configuration)
const API_PORT = 3000;

// ============================================
// AUTO-DETECT ENVIRONMENT
// ============================================

/**
 * Determines the correct API base URL based on the platform and environment
 */
const getApiUrl = (): string => {
  // Check if running in Expo Go on a device
  const isExpoGo = Constants.appOwnership === 'expo';

  // Check if running in development
  const isDevelopment = __DEV__;

  if (!isDevelopment) {
    // Production URL - replace with your actual production API URL
    return 'https://api.your-production-domain.com/api';
  }

  // Development environment
  if (Platform.OS === 'android') {
    // Android Emulator uses 10.0.2.2 to access host's localhost
    // For physical Android device, use LOCAL_IP
    if (isExpoGo) {
      // Running on physical device with Expo Go
      return `http://${LOCAL_IP}:${API_PORT}/api`;
    }
    // Running on Android Emulator
    return `http://10.0.2.2:${API_PORT}/api`;
  }

  if (Platform.OS === 'ios') {
    // iOS Simulator can use localhost directly
    // For physical iOS device, use LOCAL_IP
    if (isExpoGo) {
      return `http://${LOCAL_IP}:${API_PORT}/api`;
    }
    return `http://localhost:${API_PORT}/api`;
  }

  // Web platform
  return `http://localhost:${API_PORT}/api`;
};

// ============================================
// EXPORTS
// ============================================

export const API_URL = getApiUrl();

// API Endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH: {
    REGISTER: `${API_URL}/auth/register`,
    LOGIN: `${API_URL}/auth/login`,
    LOGOUT: `${API_URL}/auth/logout`,
    ME: `${API_URL}/auth/me`,
  },
  // Users
  USERS: {
    BASE: `${API_URL}/users`,
    PROFILE: `${API_URL}/users/profile`,
  },
  // Products
  PRODUCTS: {
    BASE: `${API_URL}/products`,
    BY_ID: (id: string) => `${API_URL}/products/${id}`,
    BY_CATEGORY: (categoryId: string) => `${API_URL}/products/category/${categoryId}`,
  },
  // Categories
  CATEGORIES: {
    BASE: `${API_URL}/categories`,
    BY_ID: (id: string) => `${API_URL}/categories/${id}`,
  },
  // Orders
  ORDERS: {
    BASE: `${API_URL}/orders`,
    BY_ID: (id: string) => `${API_URL}/orders/${id}`,
  },
  // Health check
  HEALTH: `http://${Platform.OS === 'android' ? '10.0.2.2' : 'localhost'}:${API_PORT}/health`,
};

// Debug logging in development
if (__DEV__) {
  console.log('🌐 API Configuration:', {
    platform: Platform.OS,
    apiUrl: API_URL,
    isExpoGo: Constants.appOwnership === 'expo',
  });
}

export default {
  API_URL,
  API_ENDPOINTS,
  LOCAL_IP,
  API_PORT,
};
