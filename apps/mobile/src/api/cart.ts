import { getApiUrl } from '../config/api.config';
import { clearAuthData, getToken } from './storage';
import { router } from 'expo-router';

export class SessionExpiredError extends Error {
  constructor() {
    super('Your session has expired. Please log in again.');
    this.name = 'SessionExpiredError';
  }
}

const readJsonResponse = async (response: Response): Promise<any> => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
};

const requireSuccessfulResponse = async (response: Response): Promise<any> => {
  const result = await readJsonResponse(response);

  if (response.status === 401) {
    await clearAuthData();
    router.replace('/(auth)/login');
    throw new SessionExpiredError();
  }

  if (!response.ok) {
    throw new Error(result.message || 'Request failed');
  }

  return result;
};

export interface BackendCartItem {
  id: string;           // backend CartItem ID (used for update/delete)
  cartItemId: string;
  productId: string;    // actual Product or CarPart ID
  itemType: 'PRODUCT' | 'CAR_PART';
  name: string;
  price: number;
  discountPrice?: number | null;
  quantity: number;
  image?: string | null;
  categoryName?: string | null;
  carInfo?: string | null;
  sellerName?: string | null;
}

export interface CartResponse {
  success: boolean;
  message?: string;
  data?: {
    items: BackendCartItem[];
    total: number;
    itemCount: number;
  };
}

// Helper: get auth headers
const getAuthHeaders = async (): Promise<HeadersInit> => {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// Fetch the cart from backend
export const fetchCart = async (): Promise<CartResponse> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiUrl()}/cart`, { method: 'GET', headers });
    return await requireSuccessfulResponse(response);
  } catch (error) {
    console.error('Fetch cart error:', error);
    throw error;
  }
};

// Add item to backend cart
// We send the item type because the backend uses one endpoint for both regular
// products and car parts, and it needs to know which table to read from.
export const addItemToCart = async (
  productId: string,
  quantity: number = 1,
  itemType: 'PRODUCT' | 'CAR_PART' = 'PRODUCT'
): Promise<{ success: boolean; message?: string; data?: BackendCartItem }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiUrl()}/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, quantity, itemType }),
    });
    return await requireSuccessfulResponse(response);
  } catch (error) {
    console.error('Add to cart error:', error);
    throw error;
  }
};

// Update item quantity (by backend cartItemId)
export const updateCartItemQty = async (
  cartItemId: string,
  quantity: number
): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiUrl()}/cart/${cartItemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ quantity }),
    });
    return await requireSuccessfulResponse(response);
  } catch (error) {
    console.error('Update cart item error:', error);
    throw error;
  }
};

// Remove item from cart (by backend cartItemId)
export const removeCartItem = async (
  cartItemId: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiUrl()}/cart/${cartItemId}`, {
      method: 'DELETE',
      headers,
    });
    return await requireSuccessfulResponse(response);
  } catch (error) {
    console.error('Remove cart item error:', error);
    throw error;
  }
};

// Clear entire cart
export const clearCartApi = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${getApiUrl()}/cart`, {
      method: 'DELETE',
      headers,
    });
    return await requireSuccessfulResponse(response);
  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
};
