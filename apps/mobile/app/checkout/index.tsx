import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCartStore } from "../../store/cartStore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../config/firebase";
import { saveOrder, type Order } from "../../utils/orderManager";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

interface PaymentMethod {
  id: string;
  type: "credit" | "debit" | "paypal";
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  isDefault: boolean;
}

export default function CheckoutScreen() {
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [orderNotes, setOrderNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when screen is focused (e.g., returning from add address/payment)
  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      // Load addresses
      const savedAddresses = await AsyncStorage.getItem('userAddresses');
      if (savedAddresses) {
        const addressList: Address[] = JSON.parse(savedAddresses);
        setAddresses(addressList);
        const defaultAddr = addressList.find(a => a.isDefault);
        if (defaultAddr) setSelectedAddress(defaultAddr.id);
      }

      // Load payment methods
      const savedPayments = await AsyncStorage.getItem('paymentMethods');
      if (savedPayments) {
        const paymentList: PaymentMethod[] = JSON.parse(savedPayments);
        setPaymentMethods(paymentList);
        const defaultPayment = paymentList.find(p => p.isDefault);
        if (defaultPayment) setSelectedPayment(defaultPayment.id);
      }
    } catch (error) {
      console.error("Error loading checkout data:", error);
    }
  };

  const subtotal = getTotalPrice();
  const shipping = 15.00;
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + shipping + tax;

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      showAlert("Missing Information", "Please select a delivery address");
      return;
    }

    if (!selectedPayment) {
      showAlert("Missing Information", "Please select a payment method");
      return;
    }

    setLoading(true);

    try {
      // Simulate API call to place order
      await new Promise(resolve => setTimeout(resolve, 2000));

      const selectedAddressData = addresses.find(a => a.id === selectedAddress);
      
      const orderData: Order = {
        id: `ORD-${Date.now()}`,
        userId: auth.currentUser?.uid || "",
        userEmail: auth.currentUser?.email || "",
        userName: auth.currentUser?.displayName || "Customer",
        items: items,
        address: selectedAddressData,
        subtotal: subtotal,
        shipping: shipping,
        tax: tax,
        total: total,
        notes: orderNotes,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Assign to first item's supplier as seller
        sellerEmail: items[0]?.supplier || "",
        confirmedByBuyer: false,
      };

      // Save order using shared order manager
      await saveOrder(orderData);

      // Clear cart
      clearCart();

      // Show success and navigate
      showAlert("Order Placed Successfully!", `Your order ${orderData.id} has been placed. You will receive a confirmation email shortly.`);
      router.replace("/(customer)/orders");
    } catch (error: any) {
      console.error("Order placement error:", error);
      showAlert("Error", "Failed to place order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const maskCardNumber = (number: string) => {
    if (number.length < 4) return number;
    return '**** **** **** ' + number.slice(-4);
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/(customer)/categories")}
          >
            <Text style={styles.shopButtonText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Delivery Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Delivery Address</Text>
            <TouchableOpacity onPress={() => router.push("/profile/addresses" as any)}>
              <Text style={styles.addText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push("/profile/addresses" as any)}
            >
              <Ionicons name="location-outline" size={32} color="#999" />
              <Text style={styles.emptyCardText}>No saved addresses</Text>
              <Text style={styles.emptyCardSubtext}>Add a delivery address</Text>
            </TouchableOpacity>
          ) : (
            addresses.map((address) => (
              <TouchableOpacity
                key={address.id}
                style={[
                  styles.addressCard,
                  selectedAddress === address.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedAddress(address.id)}
              >
                <Ionicons
                  name={selectedAddress === address.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color="#4285F4"
                />
                <View style={styles.addressInfo}>
                  <Text style={styles.addressName}>{address.name}</Text>
                  <Text style={styles.addressText}>
                    {address.street}, {address.city}
                    {address.state && `, ${address.state}`} {address.zipCode}
                  </Text>
                  <Text style={styles.addressPhone}>{address.phone}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <TouchableOpacity onPress={() => router.push("/profile/payment" as any)}>
              <Text style={styles.addText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyCard}
              onPress={() => router.push("/profile/payment" as any)}
            >
              <Ionicons name="card-outline" size={32} color="#999" />
              <Text style={styles.emptyCardText}>No saved payment methods</Text>
              <Text style={styles.emptyCardSubtext}>Add a payment method</Text>
            </TouchableOpacity>
          ) : (
            paymentMethods.map((payment) => (
              <TouchableOpacity
                key={payment.id}
                style={[
                  styles.paymentCard,
                  selectedPayment === payment.id && styles.selectedCard,
                ]}
                onPress={() => setSelectedPayment(payment.id)}
              >
                <Ionicons
                  name={selectedPayment === payment.id ? "radio-button-on" : "radio-button-off"}
                  size={20}
                  color="#4285F4"
                />
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentType}>
                    {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)} Card
                  </Text>
                  <Text style={styles.paymentNumber}>{maskCardNumber(payment.cardNumber)}</Text>
                  <Text style={styles.paymentExpiry}>Expires {payment.expiryDate}</Text>
                </View>
                <Ionicons name="card-outline" size={32} color="#4285F4" />
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({items.length})</Text>
          {items.map((item) => (
            <View key={item.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.name}</Text>
                <Text style={styles.orderItemSupplier}>by {item.supplier}</Text>
              </View>
              <View style={styles.orderItemRight}>
                <Text style={styles.orderItemQty}>x{item.quantity}</Text>
                <Text style={styles.orderItemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            value={orderNotes}
            onChangeText={setOrderNotes}
            placeholder="Add delivery instructions or special requests..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax (8%)</Text>
            <Text style={styles.summaryValue}>${tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Place Order Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.placeOrderButton, loading && styles.placeOrderButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.placeOrderButtonText}>Place Order - ${total.toFixed(2)}</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  addText: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "600",
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  emptyCardText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  emptyCardSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  addressCard: {
    flexDirection: "row",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: "#4285F4",
    backgroundColor: "#E8F0FE",
  },
  addressInfo: {
    marginLeft: 12,
    flex: 1,
  },
  addressName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 13,
    color: "#999",
  },
  paymentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    marginBottom: 12,
  },
  paymentInfo: {
    marginLeft: 12,
    flex: 1,
  },
  paymentType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  paymentNumber: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  paymentExpiry: {
    fontSize: 12,
    color: "#999",
  },
  orderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  orderItemSupplier: {
    fontSize: 12,
    color: "#666",
  },
  orderItemRight: {
    alignItems: "flex-end",
  },
  orderItemQty: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  orderItemPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#4285F4",
  },
  notesInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: "#000",
    minHeight: 100,
    textAlignVertical: "top",
  },
  summarySection: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  totalLabel: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#000",
  },
  totalValue: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#4285F4",
  },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  placeOrderButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  placeOrderButtonDisabled: {
    opacity: 0.6,
  },
  placeOrderButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
