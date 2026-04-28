import { getApiUrl } from '../config/api.config';
import { getToken } from './storage';

export interface OrderItem {
  id?: string;
  productName: string;
  productImage?: string;
  category?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  customer: string;
  customerEmail?: string;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
}

export interface SalesmanSalesSummary {
  today: {
    date: string;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
    completedOrders: number;
    totalItems: number;
    orders: Order[];
  };
  weekly: {
    totalRevenue: number;
    totalOrders: number;
  };
  monthly: {
    totalRevenue: number;
    totalOrders: number;
  };
  topSellingProducts: {
    id: string;
    uniqueId?: string;
    name: string;
    images: string[];
    price: number;
    category?: { name: string };
    totalSold: number;
    totalRevenue: number;
  }[];
}

export interface SalesSummaryResponse {
  success: boolean;
  message?: string;
  data?: SalesmanSalesSummary;
}

// Get salesman sales summary
export const getSalesmanSalesSummary = async (date?: string): Promise<SalesSummaryResponse> => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = date 
      ? `${getApiUrl()}/orders/salesman/summary?date=${date}`
      : `${getApiUrl()}/orders/salesman/summary`;

    console.log('Fetching sales summary from:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    // Get raw text first to handle non-JSON responses
    const text = await response.text();
    
    // Check if response is HTML (server not reachable or wrong endpoint)
    if (text.startsWith('<') || text.startsWith('<!')) {
      console.error('Received HTML instead of JSON. Server may not be reachable.');
      console.error('Response preview:', text.substring(0, 200));
      throw new Error('Cannot connect to server. Make sure backend is running and phone is on same WiFi.');
    }

    let result;
    try {
      result = JSON.parse(text);
    } catch {
      console.error('Invalid JSON response:', text.substring(0, 200));
      throw new Error('Invalid server response');
    }
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get sales summary');
    }

    return result;
  } catch (error) {
    console.error('Get sales summary error:', error);
    throw error;
  }
};

// Get salesman orders
export const getSalesmanOrders = async (
  status?: string,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    let url = `${getApiUrl()}/orders/salesman/orders?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get orders');
    }

    return result;
  } catch (error) {
    console.error('Get salesman orders error:', error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${getApiUrl()}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update order status');
    }

    return result;
  } catch (error) {
    console.error('Update order status error:', error);
    throw error;
  }
};

// Get customer orders
export const getCustomerOrders = async (
  status?: string,
  page: number = 1,
  limit: number = 20
) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    let url = `${getApiUrl()}/orders?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to get orders');
    }

    return result;
  } catch (error) {
    console.error('Get customer orders error:', error);
    throw error;
  }
};

// Create order (address is optional)
export const createOrder = async (
  items: { productId: string; quantity: number }[],
  paymentMethod: string,
  addressId?: string,
  notes?: string
) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const orderData: {
      items: { productId: string; quantity: number }[];
      paymentMethod: string;
      addressId?: string;
      notes?: string;
    } = {
      items,
      paymentMethod
    };

    if (addressId) {
      orderData.addressId = addressId;
    }
    if (notes) {
      orderData.notes = notes;
    }

    const response = await fetch(`${getApiUrl()}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(orderData),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create order');
    }

    return result;
  } catch (error) {
    console.error('Create order error:', error);
    throw error;
  }
};

// Get rider's live location for a given order (customer live tracking)
export const getRiderLiveLocation = async (orderId: string) => {
  try {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${getApiUrl()}/tracking/order/${orderId}/rider-location`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Failed to get rider location');
    return result;
  } catch (error) {
    console.warn('getRiderLiveLocation error:', error);
    throw error;
  }
};

// Get full delivery status for a given order (customer + salesman)
export const getOrderDeliveryStatus = async (orderId: string) => {
  try {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${getApiUrl()}/tracking/order/${orderId}/delivery-status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || result.message || 'Failed to get delivery status');
    return result;
  } catch (error) {
    console.warn('getOrderDeliveryStatus error:', error);
    throw error;
  }
};

// Create a delivery request for an order (salesman dispatches a rider from mobile)
export const createDeliveryRequest = async (data: {
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
}) => {
  try {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');

    const response = await fetch(`${getApiUrl()}/delivery-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      // Prefer the detailed backend error over the generic outer message
      const detail = result.error || result.message || 'Failed to create delivery request';
      throw new Error(detail);
    }
    return result;
  } catch (error) {
    console.error('createDeliveryRequest error:', error);
    throw error;
  }
};

// Request cancellation — requires a reason so admin can evaluate the request
export const cancelOrder = async (orderId: string, reason: string) => {
  try {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${getApiUrl()}/orders/${orderId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to submit cancellation request');
    }

    return result;
  } catch (error) {
    console.error('Cancel order error:', error);
    throw error;
  }
};
