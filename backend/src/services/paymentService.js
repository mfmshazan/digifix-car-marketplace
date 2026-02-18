/**
 * PayHere Payment Gateway Service
 * Handles payment processing with PayHere Sandbox Mode
 * 
 * PayHere Sandbox:
 * - Merchant ID: Demo Merchant (1218678)
 * - Website: https://sandbox.payhere.lk
 * - Test Cards available in PayHere dashboard
 */

import crypto from 'crypto';
import prisma from '../lib/prisma.js';

// ========================================
// PayHere Configuration
// ========================================

const PAYHERE_CONFIG = {
  MODE: process.env.PAYHERE_MODE || 'SANDBOX',
  MERCHANT_ID: process.env.PAYHERE_MERCHANT_ID || '1218678', // Demo Merchant ID
  MERCHANT_SECRET: process.env.PAYHERE_MERCHANT_SECRET || 'MjAwMzk0MjIzNDEwODAxMzMwOTA0MDc1OTc5MzY3NDc5MzI3MTM2OA==',
  SANDBOX_URL: 'https://sandbox.payhere.lk/pay/checkout',
  PRODUCTION_URL: 'https://www.payhere.lk/pay/checkout',
  RETURN_URL: process.env.PAYHERE_RETURN_URL || 'http://localhost:3000/api/payments/callback',
  NOTIFY_URL: process.env.PAYHERE_NOTIFY_URL || 'http://localhost:3000/api/payments/notify',
  CANCEL_URL: process.env.PAYHERE_CANCEL_URL || 'exp://localhost:8081',
};

export const getCheckoutURL = () => {
  return PAYHERE_CONFIG.MODE === 'SANDBOX' 
    ? PAYHERE_CONFIG.SANDBOX_URL 
    : PAYHERE_CONFIG.PRODUCTION_URL;
};

// ========================================
// Hash Generation for Security
// ========================================

/**
 * Generate MD5 hash for PayHere security validation
 * @param {string} str - String to hash
 * @returns {string} MD5 hash
 */
export const generateMD5Hash = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

/**
 * Generate merchant hash for payment request
 * PayHere required formula:
 * hash = strtoupper(md5(merchant_id + order_id + amount + currency + strtoupper(md5(merchant_secret))))
 */
export const generateMerchantHash = (orderId, amount, currency = 'LKR') => {
  const hashedSecret = generateMD5Hash(PAYHERE_CONFIG.MERCHANT_SECRET).toUpperCase();
  const str = `${PAYHERE_CONFIG.MERCHANT_ID}${orderId}${parseFloat(amount).toFixed(2)}${currency}${hashedSecret}`;
  return generateMD5Hash(str).toUpperCase();
};

/**
 * Verify response hash from PayHere
 * Hash verification from return URL
 */
export const verifyResponseHash = (data) => {
  const { merchant_id, order_id, amount, payment_id, status_code, md5sig } = data;
  
  const str = `${merchant_id}${order_id}${amount}${status_code}${PAYHERE_CONFIG.MERCHANT_SECRET}`;
  const calculatedHash = generateMD5Hash(str);
  
  return calculatedHash === md5sig;
};

// ========================================
// Payment Creation & Management
// ========================================

/**
 * Create a payment record for an order
 */
export const createPayment = async (orderId, orderData) => {
  try {
    const payment = await prisma.payment.create({
      data: {
        orderId,
        merchantId: PAYHERE_CONFIG.MERCHANT_ID,
        amount: orderData.total,
        currency: 'LKR',
        status: 'PENDING',
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
      },
    });

    // Log the payment creation
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        action: 'INITIATED',
        statusBefore: null,
        statusAfter: 'PENDING',
        message: `Payment initiated for order ${orderId}`,
      },
    });

    return payment;
  } catch (error) {
    console.error('Error creating payment:', error);
    throw error;
  }
};

/**
 * Generate PayHere checkout parameters
 */
export const generateCheckoutParams = async (paymentId, orderData) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    const merchantHash = generateMerchantHash(payment.orderId, payment.amount, payment.currency);

    return {
      merchant_id: PAYHERE_CONFIG.MERCHANT_ID,
      return_url: PAYHERE_CONFIG.RETURN_URL,
      cancel_url: PAYHERE_CONFIG.CANCEL_URL,
      notify_url: PAYHERE_CONFIG.NOTIFY_URL,

      // Order Details
      order_id: payment.orderId,
      items: orderData.items || 'Car Parts & Accessories',
      amount: parseFloat(payment.amount).toFixed(2),
      currency: payment.currency,

      // Customer Details
      first_name: payment.customerName.split(' ')[0],
      last_name: payment.customerName.split(' ').slice(1).join(' ') || 'Customer',
      email: payment.customerEmail,
      phone: payment.customerPhone.replace(/[^0-9]/g, '') || '0770000000', // Fallback if no digits
      address: orderData.address || 'Sri Lanka',
      city: orderData.city || 'Colombo',
      country: 'Sri Lanka',

      // Security
      hash: merchantHash,
    };
  } catch (error) {
    console.error('Error generating checkout params:', error);
    throw error;
  }
};

/**
 * Process payment callback from PayHere
 */
export const processPaymentCallback = async (data) => {
  try {
    console.log('Processing PayHere callback:', data);

    // Verify the hash for security
    if (!verifyResponseHash(data)) {
      throw new Error('Invalid payment hash signature');
    }

    const { order_id, payment_id, status_code, md5sig } = data;

    // Find the payment
    const payment = await prisma.payment.findFirst({
      where: { orderId: order_id },
    });

    if (!payment) {
      throw new Error(`Payment not found for order: ${order_id}`);
    }

    // Update payment status based on PayHere status_code
    // 2 = Success, 0 = Pending, 1 = Failed
    let newStatus = 'PENDING';
    let paystatus = 'PENDING';

    if (status_code === '2') {
      newStatus = 'COMPLETED';
      paystatus = 'PAID';
    } else if (status_code === '1') {
      newStatus = 'FAILED';
      paystatus = 'FAILED';
    }

    // Update payment record
    const updatedPayment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        paymentId: payment_id,
        status: newStatus,
        processedAt: new Date(),
        paymentGatewayResponse: JSON.stringify(data),
      },
    });

    // Update order payment status
    await prisma.order.update({
      where: { id: order_id },
      data: {
        paymentStatus: paystatus,
        status: paystatus === 'PAID' ? 'CONFIRMED' : 'PENDING',
      },
    });

    // Log the callback
    await prisma.paymentLog.create({
      data: {
        paymentId: payment.id,
        action: 'CALLBACK_RECEIVED',
        statusBefore: payment.status,
        statusAfter: newStatus,
        message: `PayHere callback received with status ${status_code}`,
        gatewayResponse: JSON.stringify(data),
      },
    });

    return {
      success: true,
      payment: updatedPayment,
      message: `Payment ${newStatus.toLowerCase()}`,
    };
  } catch (error) {
    console.error('Error processing payment callback:', error);
    throw error;
  }
};

/**
 * Handle payment cancellation
 */
export const cancelPayment = async (paymentId) => {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    // Update payment status
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CANCELLED',
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: 'FAILED',
        status: 'CANCELLED',
      },
    });

    // Log cancellation
    await prisma.paymentLog.create({
      data: {
        paymentId,
        action: 'PAYMENT_CANCELLED',
        statusBefore: payment.status,
        statusAfter: 'CANCELLED',
        message: 'Payment was cancelled by user',
      },
    });

    return updatedPayment;
  } catch (error) {
    console.error('Error cancelling payment:', error);
    throw error;
  }
};

/**
 * Get payment details with logs
 */
export const getPaymentDetails = async (paymentId) => {
  try {
    return await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
        },
        order: true,
      },
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    throw error;
  }
};

/**
 * Get all payments for an order
 */
export const getOrderPayments = async (orderId) => {
  try {
    return await prisma.payment.findMany({
      where: { orderId },
      include: {
        logs: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  } catch (error) {
    console.error('Error fetching order payments:', error);
    throw error;
  }
};

export default {
  PAYHERE_CONFIG,
  getCheckoutURL,
  generateMD5Hash,
  generateMerchantHash,
  verifyResponseHash,
  createPayment,
  generateCheckoutParams,
  processPaymentCallback,
  cancelPayment,
  getPaymentDetails,
  getOrderPayments,
};
