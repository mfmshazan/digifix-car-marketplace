import { API_URL } from '../config/api.config';
import { getToken } from './storage';

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
    const response = await fetch(`${API_URL}/cart`, { method: 'GET', headers });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch cart');
    return result;
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
    const response = await fetch(`${API_URL}/cart`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ productId, quantity, itemType }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to add to cart');
    return result;
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
    const response = await fetch(`${API_URL}/cart/${cartItemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ quantity }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update cart item');
    return result;
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
    const response = await fetch(`${API_URL}/cart/${cartItemId}`, {
      method: 'DELETE',
      headers,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to remove cart item');
    return result;
  } catch (error) {
    console.error('Remove cart item error:', error);
    throw error;
  }
};

// Clear entire cart
export const clearCartApi = async (): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_URL}/cart`, {
      method: 'DELETE',
      headers,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to clear cart');
    return result;
  } catch (error) {
    console.error('Clear cart error:', error);
    throw error;
  }
};
