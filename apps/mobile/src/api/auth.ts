import { getApiUrl } from '../config/api.config';

export interface RegisterData {
  email: string;
  password: string;
  name: string;
  phone: string;
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
      phone?: string;
      role: string;
      avatar?: string;
      store?: any;
    };
    token: string;
  };
}

// Register new user
export const registerUser = async (data: RegisterData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/auth/register`, {
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

    return result;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

// Login user
export const loginUser = async (data: LoginData): Promise<AuthResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/auth/login`, {
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

    return result;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

// Get user profile (requires token)
export const getUserProfile = async (token: string) => {
  try {
    const response = await fetch(`${getApiUrl()}/auth/profile`, {
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

// Update user profile (requires token)
export const updateUserProfile = async (
  token: string,
  data: { name?: string; phone?: string }
) => {
  try {
    const response = await fetch(`${getApiUrl()}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to update profile');
    }

    return result;
  } catch (error) {
    console.error('Update profile error:', error);
    throw error;
  }
};
