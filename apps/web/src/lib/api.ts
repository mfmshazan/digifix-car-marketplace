import axios from 'axios';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

/** Avatars are served from the API origin (e.g. /uploads/...), not the Next.js dev port. */
export function resolveMediaUrl(path: string | null | undefined): string | null { // exported function
  if (!path || typeof path !== 'string') return null;
  const trimmed = path.trim();
  if (!trimmed) return null;

  // Already-complete sources must be returned untouched — never prefix the API origin.
  // (data: base64 images and blob: object URLs are self-contained.)
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

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
        // Do not force redirect if already on login or register pages
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          window.location.href = '/login';
        }
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
export const productsApi = {
  // Get salesman's own products
  getSalesmanProducts: async () => {
    const response = await api.get('/products/salesman/my-products');
    return response.data;
  },

  // Create a new product
  createProduct: async (data: any) => {
    const response = await api.post('/products', data);
    return response.data;
  },

  // Update a product
  updateProduct: async (id: string, data: any) => {
    const response = await api.put(`/products/${id}`, data);
    return response.data;
  },
};

export const vehicleApi = {
  // Get all vehicle types
  getVehicleTypes: async () => {
    const response = await api.get('/vehicle/types');
    return response.data;
  },

  // Get all vehicle brands
  getVehicleBrands: async () => {
    const response = await api.get('/vehicle/brands');
    return response.data;
  },

  // Get vehicle brands filtered by vehicle type
  getVehicleBrandsByType: async (vehicleTypeId: string) => {
    const response = await api.get(`/vehicle/brands/by-type/${vehicleTypeId}`);
    return response.data;
  },

  // Get all vehicle models
  getVehicleModels: async () => {
    const response = await api.get('/vehicle/models');
    return response.data;
  },

  // Get vehicle models filtered by brand
  getVehicleModelsByBrand: async (brandId: string) => {
    const response = await api.get(`/vehicle/models/by-brand/${brandId}`);
    return response.data;
  },

  // Search vehicle by registration number
  searchVehicleByRegistration: async (registrationNumber: string) => {
    const response = await api.get(`/vehicle/search/${encodeURIComponent(registrationNumber)}`);
    return response.data;
  },
};

export const commonApi = {
  getStats: async () => {
    const response = await api.get('/stats');
    return response.data;
  },
};

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

  // Forgot Password Flow
  requestOtp: async (email: string) => {
    const response = await api.post('/auth/forgot-password', { email });
    return response.data;
  },

  verifyOtp: async (email: string, otp: string) => {
    const response = await api.post('/auth/verify-otp', { email, otp });
    return response.data;
  },

  resetPassword: async (resetToken: string, newPassword: string) => {
    const response = await api.post('/auth/reset-password', { resetToken, newPassword });
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

  // Manager accepts a post-delivery product complaint (approves the refund request)
  acceptComplaint: async (orderId: string) => {
    const response = await api.post(`/orders/${orderId}/accept-complaint`);
    return response.data;
  },

  // Manager rejects a post-delivery product complaint (order reverts to Delivered)
  rejectComplaint: async (orderId: string, message?: string) => {
    const response = await api.post(`/orders/${orderId}/reject-complaint`, { message });
    return response.data;
  },
};

export const deliveryRequestsApi = {
  getShopLocation: async () => {
    const response = await api.get('/delivery-requests/shop-location');
    return response.data as {
      success: boolean;
      data: {
        configured: boolean;
        storeName: string | null;
        address: string | null;
        latitude: number | null;
        longitude: number | null;
      };
    };
  },

  updateShopLocation: async (data: {
    latitude: number;
    longitude: number;
    address?: string;
  }) => {
    const response = await api.put('/delivery-requests/shop-location', data);
    return response.data as {
      success: boolean;
      data: {
        configured: boolean;
        storeName: string | null;
        address: string | null;
        latitude: number;
        longitude: number;
      };
    };
  },

  // Create a delivery request for an order (salesman dispatches a rider)
  create: async (data: {
    orderId: string;
    pickupLatitude: number;
    pickupLongitude: number;
    pickupAddress?: string;
    pickupContactName?: string;
    pickupContactPhone?: string;
    deliveryLatitude: number;
    deliveryLongitude: number;
    deliveryAddress: string;
    packageNotes?: string;
    paymentType: 'PREPAID' | 'COD';
    estimatedEarnings?: number;
    customerName?: string;
    customerPhone?: string;
    partnerId?: number;
  }) => {
    const response = await api.post('/delivery-requests', data);
    return response.data;
  },

  // Get online riders who can receive a delivery request from this pickup point
  getAvailableRiders: async (pickupLatitude: number, pickupLongitude: number) => {
    const response = await api.get('/delivery-requests/available-riders', {
      params: { pickupLatitude, pickupLongitude },
    });
    return response.data;
  },

  retry: async (orderId: string) => {
    const response = await api.post(`/delivery-requests/${orderId}/retry`);
    return response.data;
  },

  // Get full delivery job status for an order (salesman / customer)
  getDeliveryStatus: async (orderId: string) => {
    const response = await api.get(`/tracking/order/${orderId}/delivery-status`);
    return response.data;
  },

  // Get rider's latest GPS location for an order (customer live tracking)
  getRiderLocation: async (orderId: string) => {
    const response = await api.get(`/tracking/order/${orderId}/rider-location`);
    return response.data;
  },
};

export const adminApi = {
  // Get system stats for overview
  getStats: async () => {
    const response = await api.get('/admin/stats');
    return response.data;
  },

  // Get users for management
  getUsers: async (params?: { role?: string }) => {
    const response = await api.get('/admin/users', { params });
    return response.data;
  },

  // Update user status (ACTIVE/SUSPENDED)
  updateUserStatus: async (userId: string, status: string, additionalInfo?: any) => {
    const response = await api.patch(`/admin/users/${userId}/status`, { status, ...additionalInfo });
    return response.data;
  },


  // Get finance records (order ledger)
  getFinances: async (params?: { status?: string; paymentStatus?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
    const response = await api.get('/admin/finances', { params });
    return response.data;
  },

  // Get global catalog
  getCatalog: async (params?: { type?: string; status?: string }) => {
    const response = await api.get('/admin/catalog', { params });
    return response.data;
  },

  // Update catalog item status
  updateCatalogItemStatus: async (id: string, type: string, isActive: boolean) => {
    const response = await api.patch(`/admin/catalog/${id}/status`, { type, isActive });
    return response.data;
  },

  // Approve customer cancellation/refund request
  approveCancellation: async (orderId: string) => {
    const response = await api.post(`/orders/${orderId}/approve-cancel`);
    return response.data;
  },

  // Reject customer cancellation/refund request
  rejectCancellation: async (orderId: string, message?: string) => {
    const response = await api.post(`/orders/${orderId}/reject-cancel`, { message });
    return response.data;
  },

  // Get all reviews for moderation (admin only)
  getReviews: async (params?: { status?: string; targetType?: string; page?: number; limit?: number }) => {
    const response = await api.get('/reviews/admin/all', { params });
    return response.data;
  },

  // Approve or hide a review (admin only)
  moderateReview: async (reviewId: string, status: 'PUBLISHED' | 'HIDDEN') => {
    const response = await api.patch(`/reviews/admin/${reviewId}/status`, { status });
    return response.data;
  },
};

// ─── Reviews Types ────────────────────────────────────────────────────────────

export interface ReviewReply {
  id: string;
  replyText: string;
  createdAt: string;
  seller: { id: string; name: string; avatar: string | null };
}

export interface Review {
  id: string;
  targetId: string;
  targetType: string;
  rating: number;
  comment: string | null;
  title: string | null;
  status: string;
  createdAt: string;
  user: { id: string; name: string; avatar: string | null };
  replies: ReviewReply[];
}

// ─── Reviews API ──────────────────────────────────────────────────────────────

export const reviewsApi = {
  /** Fetch all PUBLISHED reviews for a given target (store owner ID, product ID, etc.) */
  getTargetReviews: async (targetId: string): Promise<{ success: boolean; data: Review[] }> => {
    const response = await api.get(`/reviews/target/${targetId}`);
    return response.data;
  },

  /** Submit a salesman reply to a review */
  replyToReview: async (reviewId: string, replyText: string): Promise<{ success: boolean; data: ReviewReply }> => {
    const response = await api.post(`/reviews/${reviewId}/reply`, { replyText });
    return response.data;
  },
};

