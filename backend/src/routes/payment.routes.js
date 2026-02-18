/**
 * Payment Routes - PayHere Integration
 * Handles payment checkout, callbacks, and payment management
 */

import express from 'express';
import {
  generateCheckoutParams,
  processPaymentCallback,
  cancelPayment,
  getPaymentDetails,
  getOrderPayments,
  createPayment,
  generateMerchantHash,
  getCheckoutURL,
} from '../services/paymentService.js';
import { authenticate } from '../middleware/auth.middleware.js';
import prisma from '../lib/prisma.js';

const router = express.Router();

// ========================================
// Payment Checkout Routes
// ========================================

/**
 * POST /api/payments/initiate
 * Initiate payment for an order
 * Returns checkout URL and parameters for redirect
 */
router.post('/initiate', authenticate, async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user.id;

    // Verify order exists and belongs to user
    // orderId may be the orderNumber (e.g. ORD-XXX) or the database id
    const isOrderNumber = orderId.startsWith('ORD-');
    const order = await prisma.order.findUnique({
      where: isOrderNumber ? { orderNumber: orderId } : { id: orderId },
      include: {
        customer: true,
        items: {
          include: {
            product: true,
            carPart: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.customerId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: This order does not belong to you',
      });
    }

    if (order.paymentStatus === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'This order has already been paid',
      });
    }

    // Check if a pending payment already exists for this order (orderId is unique)
    let payment = await prisma.payment.findUnique({
      where: { orderId: order.id },
    });

    if (payment && payment.status === 'PENDING') {
      // Reuse existing pending payment
      console.log('Reusing existing pending payment:', payment.id);
    } else if (!payment) {
      // Create new payment record
      payment = await createPayment(order.id, {
        total: order.total,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone || 'N/A',
      });
    } else {
      // Payment exists but is not pending (FAILED, CANCELLED, etc.) - delete and recreate
      await prisma.payment.delete({ where: { id: payment.id } });
      payment = await createPayment(order.id, {
        total: order.total,
        customerName: order.customer.name,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone || 'N/A',
      });
    }

    // Generate checkout parameters
    const checkoutParams = await generateCheckoutParams(payment.id, {
      items: `Order ${order.orderNumber}`,
      address: 'Sri Lanka',
    });

    // Return checkout details
    return res.status(201).json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        checkoutUrl: getCheckoutURL(),
        checkoutParams,
        amount: order.total,
        currency: 'LKR',
      },
      message: 'Payment initiated successfully',
    });
  } catch (error) {
    console.error('Error initiating payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message,
    });
  }
});

// ========================================
// PayHere Checkout Form (renders auto-submitting POST form)
// ========================================

/**
 * GET /api/payments/checkout/:paymentId
 * Renders an HTML page that auto-submits a POST form to PayHere
 * This is needed because PayHere requires POST, not GET
 */
router.get('/checkout/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).send('Payment not found');
    }

    const checkoutParams = await generateCheckoutParams(paymentId, {
      items: `Order ${payment.order.orderNumber}`,
      address: 'Sri Lanka',
    });

    const checkoutUrl = getCheckoutURL();

    // Build hidden form fields
    const formFields = Object.entries(checkoutParams)
      .map(([key, value]) => `<input type="hidden" name="${key}" value="${String(value).replace(/"/g, '&quot;')}">`)
      .join('\n        ');

    // Render auto-submitting HTML form
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting to PayHere...</title>
        <style>
          body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; font-family: Arial, sans-serif; background: #f5f5f5; }
          .container { text-align: center; }
          .spinner { border: 4px solid #f3f3f3; border-top: 4px solid #00002E; border-radius: 50%; width: 40px; height: 40px; animation: spin 1s linear infinite; margin: 0 auto 16px; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="spinner"></div>
          <p>Redirecting to PayHere...</p>
        </div>
        <form id="payhere-form" method="POST" action="${checkoutUrl}">
          ${formFields}
        </form>
        <script>document.getElementById('payhere-form').submit();</script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('Error rendering checkout form:', error);
    res.status(500).send('Failed to load payment page. Please try again.');
  }
});

// ========================================
// Payment Callback Routes (No Auth Required)
// ========================================

/**
 * POST /api/payments/callback
 * PayHere payment callback (server-to-server)
 * Called by PayHere after payment processing
 */
router.post('/callback', async (req, res) => {
  try {
    console.log('PayHere Callback Received:', req.body);

    const result = await processPaymentCallback(req.body);

    // Return 200 OK to PayHere immediately
    res.status(200).json({
      status: 'ok',
      message: 'Callback processed',
    });

    return;
  } catch (error) {
    console.error('Error processing callback:', error);
    res.status(500).json({
      status: 'error',
      message: error.message,
    });
  }
});

/**
 * GET /api/payments/return
 * PayHere return URL (user gets redirected here after payment)
 * Used for displaying payment status to user
 */
router.get('/return', async (req, res) => {
  try {
    const { order_id, payment_id, status_code } = req.query;

    // Get payment details
    const payment = await prisma.payment.findFirst({
      where: { orderId: order_id },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    const isSuccess = status_code === '2';
    const paymentStatus = isSuccess ? 'COMPLETED' : status_code === '1' ? 'FAILED' : 'PENDING';

    return res.status(200).json({
      success: isSuccess,
      data: {
        orderId: payment.orderId,
        paymentId: payment.id,
        amount: payment.amount,
        status: paymentStatus,
        message: isSuccess ? 'Payment successful!' : 'Payment processing',
      },
    });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing payment return',
      error: error.message,
    });
  }
});

/**
 * POST /api/payments/cancel
 * Cancel a pending payment
 */
router.post('/:paymentId/cancel', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    // Verify payment belongs to user's order
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    if (payment.order.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const cancelled = await cancelPayment(paymentId);

    return res.status(200).json({
      success: true,
      data: cancelled,
      message: 'Payment cancelled successfully',
    });
  } catch (error) {
    console.error('Error cancelling payment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel payment',
      error: error.message,
    });
  }
});

// ========================================
// Payment Details Routes
// ========================================

/**
 * GET /api/payments/:paymentId
 * Get payment details with logs
 */
router.get('/:paymentId', authenticate, async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await getPaymentDetails(paymentId);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    // Verify user owns this payment
    if (payment.order.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment details',
      error: error.message,
    });
  }
});

/**
 * GET /api/payments/order/:orderId
 * Get all payments for an order
 */
router.get('/order/:orderId', authenticate, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Verify order belongs to user
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.customerId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized',
      });
    }

    const payments = await getOrderPayments(orderId);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching order payments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message,
    });
  }
});

export default router;
