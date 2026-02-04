import { API_URL } from '../config/api.config';
import { getToken } from './storage';

// ================================
// Type Definitions
// ================================

export interface Car {
  id: string;
  numberPlate: string;
  make: string;
  model: string;
  year: number;
  engineType?: string;
  color?: string;
  images: string[];
}

export interface CarPart {
  id: string;
  name: string;
  description?: string;
  partNumber?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  images: string[];
  isActive: boolean;
  createdAt: string;
  category: {
    id: string;
    name: string;
    icon?: string;
  };
  seller: {
    id: string;
    name: string;
  };
  car: {
    id: string;
    numberPlate: string;
    make: string;
    model: string;
    year: number;
  };
}

export interface SearchByNumberPlateResponse {
  success: boolean;
  message?: string;
  data: {
    car: Car;
    parts: CarPart[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  } | null;
}

export interface GetAllCarsResponse {
  success: boolean;
  data: {
    cars: (Car & { _count: { parts: number } })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface GetAllCarPartsResponse {
  success: boolean;
  data: {
    parts: CarPart[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface CreateCarData {
  numberPlate: string;
  make: string;
  model: string;
  year: number;
  engineType?: string;
  color?: string;
  vinNumber?: string;
  description?: string;
  images?: string[];
}

export interface CreateCarPartData {
  name: string;
  description?: string;
  partNumber?: string;
  price: number;
  discountPrice?: number;
  stock?: number;
  condition?: 'NEW' | 'USED' | 'REFURBISHED';
  images?: string[];
  carId?: string;
  numberPlate?: string;
  categoryId: string;
}

// ================================
// Public API Functions (Customer)
// ================================

/**
 * Search for car parts by number plate
 * @param numberPlate - The car's number plate (e.g., "CAB-1234")
 * @param options - Optional filters
 */
export const searchPartsByNumberPlate = async (
  numberPlate: string,
  options?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: string;
    page?: number;
    limit?: number;
  }
): Promise<SearchByNumberPlateResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.category) queryParams.append('category', options.category);
    if (options?.minPrice) queryParams.append('minPrice', options.minPrice.toString());
    if (options?.maxPrice) queryParams.append('maxPrice', options.maxPrice.toString());
    if (options?.condition) queryParams.append('condition', options.condition);
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());

    const queryString = queryParams.toString();
    const url = `${API_URL}/car-parts/search/${encodeURIComponent(numberPlate)}${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Search by number plate error:', error);
    throw error;
  }
};

/**
 * Get all car parts with filters
 */
export const getAllCarParts = async (options?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: string;
  make?: string;
  model?: string;
  year?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<GetAllCarPartsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.category) queryParams.append('category', options.category);
    if (options?.search) queryParams.append('search', options.search);
    if (options?.minPrice) queryParams.append('minPrice', options.minPrice.toString());
    if (options?.maxPrice) queryParams.append('maxPrice', options.maxPrice.toString());
    if (options?.condition) queryParams.append('condition', options.condition);
    if (options?.make) queryParams.append('make', options.make);
    if (options?.model) queryParams.append('model', options.model);
    if (options?.year) queryParams.append('year', options.year.toString());
    if (options?.sortBy) queryParams.append('sortBy', options.sortBy);
    if (options?.sortOrder) queryParams.append('sortOrder', options.sortOrder);

    const queryString = queryParams.toString();
    const url = `${API_URL}/car-parts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get all car parts error:', error);
    throw error;
  }
};

/**
 * Get a single car part by ID
 */
export const getCarPartById = async (id: string): Promise<{ success: boolean; data: CarPart }> => {
  try {
    const response = await fetch(`${API_URL}/car-parts/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get car part error:', error);
    throw error;
  }
};

/**
 * Get all cars
 */
export const getAllCars = async (options?: {
  page?: number;
  limit?: number;
  search?: string;
  make?: string;
  model?: string;
  year?: number;
}): Promise<GetAllCarsResponse> => {
  try {
    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());
    if (options?.search) queryParams.append('search', options.search);
    if (options?.make) queryParams.append('make', options.make);
    if (options?.model) queryParams.append('model', options.model);
    if (options?.year) queryParams.append('year', options.year.toString());

    const queryString = queryParams.toString();
    const url = `${API_URL}/car-parts/cars${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get all cars error:', error);
    throw error;
  }
};

// ================================
// Salesman/Shop Owner API Functions (Authenticated)
// ================================

/**
 * Create a new car (Salesman only)
 */
export const createCar = async (data: CreateCarData): Promise<{ success: boolean; message: string; data: Car }> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/car-parts/cars`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create car');
    }

    return result;
  } catch (error) {
    console.error('Create car error:', error);
    throw error;
  }
};

/**
 * Create a new car part (Salesman only)
 */
export const createCarPart = async (data: CreateCarPartData): Promise<{ success: boolean; message: string; data: CarPart }> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/car-parts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create car part');
    }

    return result;
  } catch (error) {
    console.error('Create car part error:', error);
    throw error;
  }
};

/**
 * Update a car part (Salesman only - own parts)
 */
export const updateCarPart = async (
  id: string,
  data: Partial<CreateCarPartData> & { isActive?: boolean }
): Promise<{ success: boolean; message: string; data: CarPart }> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/car-parts/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update car part');
    }

    return result;
  } catch (error) {
    console.error('Update car part error:', error);
    throw error;
  }
};

/**
 * Delete a car part (Salesman only - own parts)
 */
export const deleteCarPart = async (id: string): Promise<{ success: boolean; message: string }> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const response = await fetch(`${API_URL}/car-parts/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete car part');
    }

    return result;
  } catch (error) {
    console.error('Delete car part error:', error);
    throw error;
  }
};

/**
 * Get salesman's own car parts (Salesman only)
 */
export const getMyCarParts = async (options?: {
  page?: number;
  limit?: number;
}): Promise<GetAllCarPartsResponse> => {
  try {
    const token = await getToken();
    if (!token) {
      throw new Error('Authentication required');
    }

    const queryParams = new URLSearchParams();
    if (options?.page) queryParams.append('page', options.page.toString());
    if (options?.limit) queryParams.append('limit', options.limit.toString());

    const queryString = queryParams.toString();
    const url = `${API_URL}/car-parts/salesman/my-parts${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Get my car parts error:', error);
    throw error;
  }
};
