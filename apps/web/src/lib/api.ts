import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('digifix_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('digifix_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Types
export interface CarPart {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  condition: 'NEW' | 'USED' | 'RECONDITIONED';
  stock: number;
  car: {
    id: string;
    make: string;
    model: string;
    year: number;
    numberPlate: string;
    engineType?: string;
  };
  category: {
    id: string;
    name: string;
  };
  seller: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  _count?: {
    carParts: number;
  };
}

// API Functions
export const carPartsApi = {
  // Get all car parts
  getAll: async (params?: { limit?: number; page?: number; categoryId?: string; condition?: string }) => {
    const response = await api.get('/car-parts', { params });
    return response.data;
  },

  // Get car part by ID
  getById: async (id: string) => {
    const response = await api.get(`/car-parts/${id}`);
    return response.data;
  },

  // Search by number plate
  searchByNumberPlate: async (numberPlate: string) => {
    const response = await api.get(`/car-parts/search/${encodeURIComponent(numberPlate)}`);
    return response.data;
  },

  // Get all cars
  getCars: async () => {
    const response = await api.get('/car-parts/cars');
    return response.data;
  },
};

export const categoriesApi = {
  // Get all categories
  getAll: async () => {
    const response = await api.get('/categories');
    return response.data;
  },
};

export const authApi = {
  // Login
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },

  // Register
  register: async (data: { name: string; email: string; password: string; role?: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
};

export const cartApi = {
  // Get cart items
  getCart: async () => {
    const response = await api.get('/cart');
    return response.data;
  },

  // Add item to cart
  addToCart: async (productId: string, quantity: number = 1, type: 'product' | 'carpart' = 'carpart') => {
    const response = await api.post('/cart', { productId, quantity, type });
    return response.data;
  },

  // Update cart item
  updateCartItem: async (itemId: string, quantity: number) => {
    const response = await api.put(`/cart/${itemId}`, { quantity });
    return response.data;
  },

  // Remove from cart
  removeFromCart: async (itemId: string) => {
    const response = await api.delete(`/cart/${itemId}`);
    return response.data;
  },

  // Clear cart
  clearCart: async () => {
    const response = await api.delete('/cart');
    return response.data;
  },
};
