/**
 * Payment API Client for PayHere Integration
 * Handles payment-related API calls
 */

import { API_URL } from '../config/api.config';
import { getToken } from './storage';

export interface InitiatePaymentResponse {
  success: boolean;
  data: {
    paymentId: string;
    orderId: string;
    checkoutUrl: string;
    checkoutParams: {
      merchant_id: string;
      order_id: string;
      items: string;
      amount: string;
      currency: string;
      first_name: string;
      last_name: string;
      email: string;
      phone: string;
      address: string;
      return_url: string;
      cancel_url: string;
      notify_url: string;
      hash: string;
    };
    amount: number;
    currency: string;
  };
  message: string;
}

export interface PaymentDetailsResponse {
  success: boolean;
  data: {
    id: string;
    orderId: string;
    amount: number;
    status: string;
    customerName: string;
    customerEmail: string;
    createdAt: string;
    logs: Array<{
      action: string;
      message: string;
      createdAt: string;
    }>;
  };
}

/**
 * Initiate payment for an order
 * @param orderId - The order ID to pay for
 * @returns Payment details and checkout parameters
 */
export const initiatePayment = async (orderId: string): Promise<InitiatePaymentResponse> => {
  try {
    const token = await getToken();
    console.log('📡 Initiating payment for order:', orderId);

    const response = await fetch(`${API_URL}/payments/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ orderId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Payment initiated:', result);

    return result;
  } catch (error) {
    console.error('❌ Error initiating payment:', error);
    throw error;
  }
};

/**
 * Get payment details
 * @param paymentId - The payment ID
 * @returns Payment details including status and logs
 */
export const getPaymentDetails = async (paymentId: string): Promise<PaymentDetailsResponse> => {
  try {
    const token = await getToken();
    console.log('📡 Fetching payment details:', paymentId);

    const response = await fetch(`${API_URL}/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Payment details fetched:', result);

    return result;
  } catch (error) {
    console.error('❌ Error fetching payment details:', error);
    throw error;
  }
};

/**
 * Cancel a payment
 * @param paymentId - The payment ID to cancel
 * @returns Updated payment details
 */
export const cancelPayment = async (paymentId: string) => {
  try {
    const token = await getToken();
    console.log('📡 Cancelling payment:', paymentId);

    const response = await fetch(`${API_URL}/payments/${paymentId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Payment cancelled:', result);

    return result;
  } catch (error) {
    console.error('❌ Error cancelling payment:', error);
    throw error;
  }
};

/**
 * Get all payments for an order
 * @param orderId - The order ID
 * @returns List of payments
 */
export const getOrderPayments = async (orderId: string) => {
  try {
    const token = await getToken();
    console.log('📡 Fetching payments for order:', orderId);

    const response = await fetch(`${API_URL}/payments/order/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Order payments fetched:', result);

    return result;
  } catch (error) {
    console.error('❌ Error fetching order payments:', error);
    throw error;
  }
};

/**
 * Check payment status from return URL
 * @param params - Query parameters from PayHere return URL
 * @returns Payment status
 */
export const checkPaymentStatus = async (params: {
  order_id: string;
  payment_id?: string;
  status_code?: string;
}) => {
  try {
    console.log('📡 Checking payment status:', params);

    const response = await fetch(
      `${API_URL.replace('/api', '')}/api/payments/return?order_id=${params.order_id}&payment_id=${params.payment_id || ''}&status_code=${params.status_code || ''}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Payment status checked:', result);

    return result;
  } catch (error) {
    console.error('❌ Error checking payment status:', error);
    throw error;
  }
};

export default {
  initiatePayment,
  getPaymentDetails,
  cancelPayment,
  getOrderPayments,
  checkPaymentStatus,
};
