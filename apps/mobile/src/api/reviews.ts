import { getApiUrl } from '../config/api.config';
import { getToken } from './storage';

export interface ReviewPayload {
  targetId: string;
  targetType: 'PRODUCT' | 'SELLER' | 'DELIVERY_PARTNER';
  rating: number;
  comment?: string;
  title?: string;
  images?: string[];
}

export const submitReviews = async (orderId: string, reviews: ReviewPayload[]) => {
  try {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${getApiUrl()}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId, reviews }),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit reviews');
    }
    return result;
  } catch (error) {
    console.error('Submit reviews error:', error);
    throw error;
  }
};
