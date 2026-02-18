import { API_URL } from '../config/api.config';
import * as SecureStore from 'expo-secure-store';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  role?: 'CUSTOMER' | 'SALESMAN';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      email: string;
      name: string;
      role: string;
      avatar?: string;
      store?: any;
    };
    token: string;
  };
}

// Save token securely
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('authToken', token);
  } catch (error) {
    console.error('Error saving token:', error);
  }
};

// Get saved token
export const getToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Clear token
export const clearToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('authToken');
  } catch (error) {
    console.error('Error clearing token:', error);
  }
};

// Save user data
export const saveUser = async (user: any): Promise<void> => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
  }
};

// Get saved user data
export const getUser = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const userJson = await AsyncStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Register new user
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Registration failed');
    }

    if (result.data?.token) {
      await saveToken(result.data.token);
    }

    return result;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    if (result.data?.token) {
      await saveToken(result.data.token);
    }

    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Clerk Google Sign-In Callback
export const clerkGoogleCallback = async (clerkToken: string): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/clerk/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Google sign-in failed');
    }

    if (result.data?.token) {
      await saveToken(result.data.token);
    }

    return result;
  } catch (error) {
    console.error('Clerk Google callback error:', error);
    throw error;
  }
};

// Direct Google Callback (for sign-up flow)
export const googleCallback = async (data: { email: string; name: string; googleId: string; avatar?: string }): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${API_URL}/auth/google/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Google sign-up failed');
    }

    if (result.data?.token) {
      await saveToken(result.data.token);
    }

    return result;
  } catch (error) {
    console.error('Google callback error:', error);
    throw error;
  }
};

// Get user profile (requires token)
export const getUserProfile = async (token: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get profile');
    }

    return result;
  } catch (error) {
    console.error('Get profile error:', error);
    throw error;
  }
};

// Get Clerk authenticated user
export const getClerkUser = async (clerkToken: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/clerk/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${clerkToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to get Clerk user');
    }

    return result;
  } catch (error) {
    console.error('Get Clerk user error:', error);
    throw error;
  }
};

// Logout user
export const logoutUser = async (): Promise<void> => {
  try {
    await clearToken();
  } catch (error) {
    console.error('Logout error:', error);
    throw error;
  }
};
