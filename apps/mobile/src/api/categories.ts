import { getApiUrl } from '../config/api.config';

// ================================
// Type Definitions
// ================================

export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  image?: string;
  parentId?: string;
  children?: Category[];
  _count?: {
    products: number;
    carParts: number;
  };
  totalPartsCount?: number;
}

export interface CategoryWithParts {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  products: any[];
  carParts: any[];
  pagination: {
    page: number;
    limit: number;
    totalProducts: number;
    totalCarParts: number;
    total: number;
  };
}

export interface GetCategoriesResponse {
  success: boolean;
  data: Category[];
}

export interface GetCategoryByIdResponse {
  success: boolean;
  data: CategoryWithParts;
}

export interface GetCategoryPartsByNameResponse {
  success: boolean;
  data: {
    category: Category;
    carParts: any[];
    products: any[];
    pagination: {
      page: number;
      limit: number;
      totalCarParts: number;
      totalProducts: number;
      total: number;
    };
  };
}

// ================================
// API Functions
// ================================

/**
 * Get all categories
 */
export const getAllCategories = async (): Promise<GetCategoriesResponse> => {
  try {
    const response = await fetch(`${getApiUrl()}/categories`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
};

/**
 * Get category by ID with its parts
 */
export const getCategoryById = async (
  categoryId: string,
  options?: { page?: number; limit?: number }
): Promise<GetCategoryByIdResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());

    const queryString = queryParams.toString();
    const url = `${getApiUrl()}/categories/${categoryId}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get category by ID error:', error);
    throw error;
  }
};

/**
 * Get parts by category name (e.g., "Brakes", "Filters")
 */
export const getPartsByCategoryName = async (
  categoryName: string,
  options?: { page?: number; limit?: number }
): Promise<GetCategoryPartsByNameResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());

    const queryString = queryParams.toString();
    const url = `${getApiUrl()}/categories/name/${encodeURIComponent(categoryName)}/parts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get parts by category name error:', error);
    throw error;
  }
};
