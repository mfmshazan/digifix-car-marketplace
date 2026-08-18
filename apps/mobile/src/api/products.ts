import { getApiUrl } from '../config/api.config';
import { CompatibleProduct } from './vehicle';

// ================================
// Type Definitions
// ================================

export interface GetProductsData {
  products: CompatibleProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GetProductsResponse {
  success: boolean;
  message?: string;
  data: GetProductsData | null;
}

// ================================
// API Functions
// ================================

/**
 * Fetch active products (used to show a "popular parts" preview on the
 * customer dashboard before a vehicle registration has been searched).
 */
export const getProducts = async (
  options?: { limit?: number; page?: number; category?: string }
): Promise<GetProductsResponse> => {
  try {
    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', String(options.limit));
    if (options?.page) params.append('page', String(options.page));
    if (options?.category) params.append('category', options.category);

    const url = `${getApiUrl()}/products${params.toString() ? `?${params}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Failed to load products',
        data: null,
      };
    }

    return result as GetProductsResponse;
  } catch (error) {
    console.error('getProducts error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
      data: null,
    };
  }
};
