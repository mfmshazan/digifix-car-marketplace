/**
 * Checkout Screen with PayHere Payment Integration
 * Handles order review and payment processing
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
  Linking,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { initiatePayment, getPaymentDetails } from '../../src/api/payment';
import { API_URL } from '../../src/config/api.config';

interface OrderData {
  orderId: string;
  items: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
}

// Generate human-readable order ID: ORD-YYYYMMDD-XXXXX
const generateHumanReadableOrderId = () => {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substr(2, 5).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

const CheckoutScreen = () => {
  const router = useRouter();
  // ✅ Call hooks at top level, not inside other functions
  const { orderId: orderIdParam, orderData: orderDataParam } = useLocalSearchParams();

  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [generatedOrderId] = useState(() => generateHumanReadableOrderId());

  // Handle orderId being string or string array
  const orderId = Array.isArray(orderIdParam) ? orderIdParam[0] : orderIdParam;

  // Load order data from cart or from route params
  useEffect(() => {
    loadOrderData();
  }, []);

  const loadOrderData = async () => {
    try {
      console.log('📦 Loading order data...');
      
      // Try to get cart data from route params
      if (orderDataParam) {
        try {
          const parsedCartData = JSON.parse(String(orderDataParam));
          console.log('✅ Using cart data from params:', parsedCartData);
          setOrderData({
            orderId: orderId || generatedOrderId, // Use passed ID or generated one
            items: parsedCartData.itemCount || 2,
            subtotal: parsedCartData.subtotal || 8500,
            deliveryFee: parsedCartData.deliveryFee || 500,
            discount: 0,
            total: parsedCartData.total || 9000,
          });
          return;
        } catch (e) {
          console.log('ℹ️ Could not parse cart data:', e);
        }
      }

      // Generate order data with generated order ID
      const finalOrderId = orderId || generatedOrderId;
      console.log('✅ Order ID set to:', finalOrderId);
      
      setOrderData({
        orderId: finalOrderId,
        items: 2,
        subtotal: 8500,
        deliveryFee: 0,
        discount: 0,
        total: 9000,
      });
    } catch (error) {
      console.error('Error loading order:', error);
      Alert.alert('Error', 'Failed to load order details');
    }
  };

  const handleCheckout = async () => {
    // Use orderId from orderData (this is always set when loading order data)
    if (!orderData?.orderId) {
      Alert.alert('Error', 'Order ID is still missing. Please try again.');
      return;
    }

    setLoading(true);
    try {
      console.log('Initiating PayHere payment for order:', orderData.orderId);

      // Step 1: Initiate payment on backend with the actual order ID
      const paymentResponse = await initiatePayment(orderData.orderId);

      const { checkoutUrl, checkoutParams } = paymentResponse.data;

      console.log('Payment initiated. Redirecting to PayHere...');
      setPaymentInitiated(true);

      // Step 2: Open the backend checkout form endpoint
      // This renders an auto-submitting POST form to PayHere (PayHere requires POST)
      const { paymentId } = paymentResponse.data;
      const API_BASE = API_URL.replace('/api', '');
      const paymentUrl = `${API_BASE}/api/payments/checkout/${paymentId}`;

      console.log('🌐 Opening PayHere checkout...');

      // On web: open in a new tab (WebBrowser doesn't work in browser)
      // On mobile: open in in-app browser
      if (Platform.OS === 'web') {
        window.open(paymentUrl, '_blank');
      } else {
        const result = await WebBrowser.openBrowserAsync(paymentUrl);
        if (result.type === WebBrowser.WebBrowserResultType.DISMISS) {
          console.log('❌ Payment cancelled by user');
          Alert.alert('Payment Cancelled', 'You cancelled the payment process');
        }
      }
    } catch (error) {
      console.error('❌ Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'An error occurred during payment. Please try again.';
      Alert.alert(
        'Payment Error',
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  if (!orderData) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Summary</Text>
      </View>

      {/* Order Details */}
      <View style={styles.section}>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Order ID:</Text>
          <Text style={styles.value}>{orderData.orderId}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.label}>Items:</Text>
          <Text style={styles.value}>{orderData.items}</Text>
        </View>
      </View>

      {/* Price Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Price Breakdown</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.label}>Subtotal:</Text>
          <Text style={styles.value}>LKR {orderData.subtotal.toLocaleString()}</Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.label}>Delivery Fee:</Text>
          <Text style={styles.value}>LKR {orderData.deliveryFee.toLocaleString()}</Text>
        </View>

        {orderData.discount > 0 && (
          <View style={styles.summaryRow}>
            <Text style={[styles.label, styles.discount]}>Discount:</Text>
            <Text style={[styles.value, styles.discount]}>
              -LKR {orderData.discount.toLocaleString()}
            </Text>
          </View>
        )}

        <View style={[styles.summaryRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>LKR {orderData.total.toLocaleString()}</Text>
        </View>
      </View>

      {/* Payment Method */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.paymentMethodBox}>
          <Text style={styles.paymentMethodText}>💳 PayHere Payment Gateway</Text>
          <Text style={styles.paymentMethodSubtext}>
            Secure online payment with PayHere (SANDBOX MODE)
          </Text>
        </View>
      </View>

      {/* Info Box */}
      <View style={[styles.section, styles.infoBox]}>
        <Text style={styles.infoTitle}>ℹ️ Sandbox Mode</Text>
        <Text style={styles.infoText}>
          This is a test environment. You can use PayHere sandbox test cards for payment.{'\n'}
          {'\n'}
          Test Card: 4111 1111 1111 1111{'\n'}
          Expiry: Any future date (MM/YY){'\n'}
          CVV: Any 3 digits
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.button, styles.proceedButton, loading && styles.buttonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.buttonText}>💳 Proceed to Payment</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.cancelButton]}
          onPress={() => router.back()}
          disabled={loading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Status Indicator */}
      {paymentInitiated && (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#007AFF" />
          <Text style={styles.statusText}>Processing payment...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  section: {
    backgroundColor: '#FFF',
    margin: 12,
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  label: {
    fontSize: 14,
    color: '#666',
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  discount: {
    color: '#4CAF50',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingVertical: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  paymentMethodBox: {
    backgroundColor: '#E8F4FD',
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  paymentMethodSubtext: {
    fontSize: 12,
    color: '#666',
  },
  infoBox: {
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA500',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#CC8800',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  proceedButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#DDD',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  statusBox: {
    flexDirection: 'row',
    backgroundColor: '#E8F4FD',
    padding: 16,
    margin: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 12,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default CheckoutScreen;
