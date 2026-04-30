import { getApiUrl } from '../config/api.config';
import { getToken } from './storage';

// ================================
// Type Definitions
// ================================

export interface ProductStore {
  id: string;
  name: string;
  phone?: string;
  description?: string;
  logo?: string;
  rating?: number;
}

export interface ProductSalesman {
  id: string;
  name: string;
  email: string;
  store?: ProductStore;
}

export interface ProductCategory {
  id: string;
  name: string;
  icon?: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  condition?: string;
  images: string[];
  isActive: boolean;
  createdAt: string;
  category?: ProductCategory;
  salesman?: ProductSalesman;
}

export interface ProductsResponse {
  success: boolean;
  message?: string;
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface ProductResponse {
  success: boolean;
  message?: string;
  data: Product;
}

// ================================
// API Functions
// ================================

export const getAllProducts = async (params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
}): Promise<ProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams();
  if (params?.page) query.append('page', String(params.page));
  if (params?.limit) query.append('limit', String(params.limit));
  if (params?.category) query.append('category', params.category);
  if (params?.search) query.append('search', params.search);
  if (params?.minPrice !== undefined) query.append('minPrice', String(params.minPrice));
  if (params?.maxPrice !== undefined) query.append('maxPrice', String(params.maxPrice));

  const url = `${apiUrl}/products${query.toString() ? `?${query.toString()}` : ''}`;
  const response = await fetch(url);
  return response.json();
};

export const getProductById = async (id: string): Promise<ProductResponse> => {
  const apiUrl = getApiUrl();
  const response = await fetch(`${apiUrl}/products/${id}`);
  return response.json();
};
