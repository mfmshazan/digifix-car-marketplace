// API base URL - Using Android emulator IP
const API_URL = 'http://10.0.2.2:3000/api';

// For testing on physical device, use your computer's local IP:
// const API_URL = 'http://192.168.1.XXX:3000/api'; // Replace XXX with your IP
// For iOS Simulator or Web:
// const API_URL = 'http://localhost:3000/api';

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

    return result;
  } catch (error) {
    console.error('Login error:', error);
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
