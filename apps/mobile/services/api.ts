// Backend API configuration
// Update this URL with your backend server URL
const API_BASE_URL = 'http://localhost:3000'; // Change this to your backend URL

export interface UserData {
  firebaseUid: string;
  email: string;
  name: string;
  role: 'CUSTOMER' | 'SALESMAN';
}

export interface UserResponse {
  success: boolean;
  data?: {
    id: string;
    email: string;
    name: string;
    role: 'CUSTOMER' | 'SALESMAN';
  };
  message?: string;
}

/**
 * Save user to backend after Firebase registration
 */
export const saveUserToBackend = async (
  firebaseUid: string,
  email: string,
  name: string,
  role: 'CUSTOMER' | 'SALESMAN'
): Promise<UserResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseUid,
        email,
        name,
        role,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving user to backend:', error);
    throw error;
  }
};

/**
 * Get user data from backend
 */
export const getUserFromBackend = async (
  firebaseUid: string
): Promise<UserResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/users/${firebaseUid}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching user from backend:', error);
    throw error;
  }
};

/**
 * Login with backend (optional - for syncing with your existing auth system)
 */
export const loginWithBackend = async (
  email: string,
  password: string
): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error logging in with backend:', error);
    throw error;
  }
};

/**
 * Register with backend (optional - for syncing with your existing auth system)
 */
export const registerWithBackend = async (
  email: string,
  password: string,
  name: string,
  role: 'CUSTOMER' | 'SALESMAN'
): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        name,
        role,
      }),
    });

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error registering with backend:', error);
    throw error;
  }
};
