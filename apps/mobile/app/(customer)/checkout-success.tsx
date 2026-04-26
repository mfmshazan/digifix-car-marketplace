import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router'; 
import { Ionicons } from "@expo/vector-icons";
import { useCart } from '../../src/store/cartStore'; 
import { LOCAL_IP, API_PORT } from "../../src/config/api.config";

interface VerifyResponse {
  success: boolean;
  status: string;
}

export default function SuccessScreen() {
  const { session_id } = useLocalSearchParams<{ session_id: string }>();
  const { clearCart } = useCart();
  
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying'); 

  useEffect(() => {
    if (session_id) {
      verifyPayment(session_id);
    } else {
      setStatus('failed');
    }
  }, [session_id]);

  const verifyPayment = async (id: string) => {
    try {
      const response = await fetch(`http://${LOCAL_IP}:${API_PORT}/api/verify-session/${id}`);
      const data: VerifyResponse = await response.json();

      if (data.success && data.status === 'paid') {
        clearCart(); // Important: Clear the cart only when payment is verified!
        setStatus('success');
      } else {
        setStatus('failed');
      }
    } catch (error) {
      console.error("Verification Error:", error);
      setStatus('failed');
    }
  };

  return (
    <View style={styles.container}>
      {status === 'verifying' && (
        <>
          <ActivityIndicator size="large" color="#00002E" />
          <Text style={styles.text}>Securing your payment...</Text>
          <Text style={styles.subText}>Please do not close the app.</Text>
        </>
      )}

      {status === 'success' && (
        <>
          <Ionicons name="checkmark-circle" size={80} color="#10B981" />
          <Text style={styles.successText}>Payment Successful!</Text>
          <Text style={styles.subText}>Your order has been placed securely.</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={() => router.push('/(customer)/orders')}
          >
            <Text style={styles.buttonText}>View My Orders</Text>
          </TouchableOpacity>
        </>
      )}

      {status === 'failed' && (
        <>
          <Ionicons name="close-circle" size={80} color="#EF4444" />
          <Text style={styles.errorText}>Verification Failed</Text>
          <Text style={styles.subText}>We couldn't confirm your payment.</Text>
          <TouchableOpacity 
            style={styles.buttonOutline} 
            onPress={() => router.push('/(customer)/cart')}
          >
            <Text style={styles.buttonOutlineText}>Return to Cart</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB', justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { color: '#1A1A2E', marginTop: 20, fontSize: 18, fontWeight: '600' },
  subText: { color: '#6B7280', fontSize: 14, marginTop: 8, marginBottom: 40, textAlign: 'center' },
  successText: { color: '#10B981', fontSize: 28, fontWeight: 'bold', marginTop: 16 },
  errorText: { color: '#EF4444', fontSize: 24, fontWeight: 'bold', marginTop: 16 },
  button: { backgroundColor: '#00002E', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
  buttonOutline: { borderColor: '#00002E', borderWidth: 2, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  buttonOutlineText: { color: '#00002E', fontWeight: 'bold', fontSize: 16 },
});