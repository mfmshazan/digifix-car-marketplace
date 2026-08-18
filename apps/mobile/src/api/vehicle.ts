import { getApiUrl } from '../config/api.config';

// ================================
// Type Definitions
// ================================

export interface VehicleTypeInfo {
  id: string;
  name: string; // e.g. "Passenger Car"
}

export interface VehicleBrandInfo {
  id: string;
  name: string; // e.g. "Toyota"
}

export interface VehicleModelInfo {
  id: string;
  name: string; // e.g. "Corolla"
}

export interface VehicleInfo {
  type: VehicleTypeInfo;
  brand: VehicleBrandInfo;
  model: VehicleModelInfo;
}

export interface CompatibleProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  images: string[];
  sku?: string;
  isActive: boolean;
  averageRating: number;
  totalReviews: number;
  createdAt: string;
  vehicleModelId?: string;
  category?: {
    id: string;
    name: string;
    icon?: string;
  };
  salesman?: {
    id: string;
    name: string;
  };
  store?: {
    id: string;
    name: string;
  };
}

export interface CompatiblePartType {
  id: string;
  name: string;
  icon?: string | null;
  productCount: number;
}

export interface VehicleRegistrationInfo {
  id: string;
  registrationNumber: string;
  vehicleModelId: string;
}

export interface VehicleSearchData {
  registration: VehicleRegistrationInfo;
  vehicleInfo: VehicleInfo;
  compatibleProducts: CompatibleProduct[];
  compatiblePartTypes: CompatiblePartType[];
}

export interface VehicleSearchResponse {
  success: boolean;
  message?: string;
  data: VehicleSearchData | null;
}

// ================================
// API Functions
// ================================

/**
 * Search for a vehicle by registration number.
 * Returns vehicle info + all compatible products + compatible part types.
 *
 * @param registrationNumber - e.g. "ABC123"
 */
export const searchVehicleByRegistration = async (
  registrationNumber: string
): Promise<VehicleSearchResponse> => {
  try {
    const url = `${getApiUrl()}/vehicle/search/${encodeURIComponent(
      registrationNumber.trim().toUpperCase()
    )}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    // Normalise non-2xx to a typed failure
    if (!response.ok) {
      return {
        success: false,
        message: result.message || 'Vehicle not found',
        data: null,
      };
    }

    return result as VehicleSearchResponse;
  } catch (error) {
    console.error('searchVehicleByRegistration error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.',
      data: null,
    };
  }
};
