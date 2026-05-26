import { getApiEndpoints } from '../config/api.config';
import { getToken } from './storage';

export const wishlistApi = {
  getWishlist: async () => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token found');

      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.WISHLIST.BASE, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error (getWishlist):', error);
      throw error;
    }
  },

  toggleWishlist: async (itemId: string, itemType: 'PRODUCT' | 'CAR_PART' = 'CAR_PART') => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token found');

      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.WISHLIST.TOGGLE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId, itemType }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error (toggleWishlist):', error);
      throw error;
    }
  },

  removeFromWishlist: async (id: string) => {
    try {
      const token = await getToken();
      if (!token) throw new Error('No authentication token found');

      const endpoints = getApiEndpoints();
      const response = await fetch(endpoints.WISHLIST.BY_ID(id), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('API Error (removeFromWishlist):', error);
      throw error;
    }
  },
};
