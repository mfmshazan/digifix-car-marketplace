import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/** Avatars are served from the API origin (e.g. /uploads/...), not the Next.js dev port. */
export function resolveMediaUrl(path: string | null | undefined): string | null {
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // If it's already a full URL, return as is
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;

  // Extract base origin from API_BASE_URL (e.g., http://localhost:3000/api -> http://localhost:3000)
  let origin = '';
  try {
    // Attempt to parse as absolute URL
    const url = new URL(API_BASE_URL);
    origin = url.origin;
  } catch (e) {
    // Fallback to manual stripping if relative or invalid
    origin = API_BASE_URL.replace(/\/api\/?$/, '');
  }

  // Ensure path starts with a slash for clean concatenation
  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;

  return `${origin}${normalizedPath}`;
}

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

  // Get category by ID with parts
  getById: async (categoryId: string, options?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryString = params.toString();
    const response = await api.get(`/categories/${categoryId}${queryString ? `?${queryString}` : ''}`);
    return response.data;
  },

  // Get parts by category name (e.g., "Brakes", "Filters")
  getPartsByName: async (categoryName: string, options?: { page?: number; limit?: number }) => {
    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    const queryString = params.toString();
    const response = await api.get(`/categories/name/${encodeURIComponent(categoryName)}/parts${queryString ? `?${queryString}` : ''}`);
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
  register: async (data: { name: string; email: string; password: string; phone: string; role?: string }) => {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  // Get profile
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  updateProfile: async (payload: { name?: string; phone?: string | null }) => {
    const response = await api.put('/auth/profile', payload);
    return response.data;
  },
};

export async function uploadProfilePicture(file: File) {
  const formData = new FormData();
  formData.append('avatar', file);
  const token = typeof window !== 'undefined' ? localStorage.getItem('digifix_token') : null;
  if (!token) {
    throw new Error('Not authenticated');
  }
  const res = await fetch(`${API_BASE_URL}/users/profile-picture`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { message?: string }).message || 'Failed to upload image');
  }
  return data as { success: boolean; data?: { id: string; avatar: string | null } };
}

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
};

export const ordersApi = {
  // Get all salesman orders (filterable by status)
  getSalesmanOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
    const response = await api.get('/orders/salesman/orders', { params });
    return response.data;
  },

  // Get salesman sales summary (stats + today's orders + top selling products)
  getSalesmanSummary: async (date?: string) => {
    const response = await api.get('/orders/salesman/summary', { params: date ? { date } : undefined });
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (id: string, status: string) => {
    const response = await api.put(`/orders/${id}/status`, { status });
    return response.data;
  },
};
