/**
 * API Configuration for DIGIFIX Mobile App
 *
 * This file handles API URL configuration for different environments:
 * - Android Emulator: Uses 10.0.2.2 (maps to host's localhost)
 * - iOS Simulator: Uses localhost
 * - Physical Device: Uses EXPO_PUBLIC_API_HOST env variable (your computer's IP)
 * - Web: Uses localhost
 *
 * ⚠️  Set your computer's IP in apps/mobile/.env:
 *       EXPO_PUBLIC_API_HOST=10.241.244.60
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ============================================
// CONFIGURATION - pulled from .env or auto-detected
// ============================================

// Helper to extract the local IP address if running in Expo Go
const getExpoGoHostIp = (): string | null => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    // hostUri usually looks like "192.168.x.x:8081"
    return hostUri.split(':')[0];
  }
  return null;
};

// 1. Prioritize .env variable (EXPO_PUBLIC_API_HOST)
// 2. Fallback to dynamically detecting the Expo Go host machine IP
// 3. Last resort fallback to a hardcoded local IP
const FALLBACK_LOCAL_IP = '10.241.244.60';
const LOCAL_IP: string =
  (process.env.EXPO_PUBLIC_API_HOST as string) ||
  getExpoGoHostIp() ||
  FALLBACK_LOCAL_IP;

// Backend port (must match the backend server)
const API_PORT = 3000;

// ============================================
// AUTO-DETECT ENVIRONMENT
// ============================================

const getApiUrl = (): string => {
  const isDevelopment = __DEV__;

  if (!isDevelopment) {
    // Production URL — replace with your real production API URL
    return 'https://api.your-production-domain.com/api';
  }

  // Development environment — always use LOCAL_IP for physical devices
  // (Expo Go on a real phone cannot reach 10.0.2.2 or localhost)
  if (Platform.OS === 'android' || Platform.OS === 'ios') {
    return `http://${LOCAL_IP}:${API_PORT}/api`;
  }

  // Web dev server
  return `http://localhost:${API_PORT}/api`;
};

// ============================================
// EXPORTS
// ============================================

export const API_URL = getApiUrl();

// Pre-built endpoint helpers
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
  // Cart
  CART: `${API_URL}/cart`,
  // Health check
  HEALTH: `http://${LOCAL_IP}:${API_PORT}/health`,
};

// Debug log in dev
if (__DEV__) {
  console.log('🌐 API Configuration:', {
    platform: Platform.OS,
    apiUrl: API_URL,
    localIp: LOCAL_IP,
    envHost: process.env.EXPO_PUBLIC_API_HOST,
  });
}

export default {
  API_URL,
  API_ENDPOINTS,
  LOCAL_IP,
  API_PORT,
};
