import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCartStore } from "../../store/cartStore";

export default function CartScreen() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  const subtotal = getTotalPrice();
  const shipping = subtotal > 0 ? 15.00 : 0;
  const total = subtotal + shipping;

  const handleClearCart = () => {
    Alert.alert(
      "Clear Cart",
      "Are you sure you want to remove all items from your cart?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => clearCart(),
        },
      ]
    );
  };

  const handleCheckout = () => {
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart before checkout.");
      return;
    }
    router.push("/checkout/" as any);
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Cart</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>Add some parts to get started!</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/(customer)/categories")}
          >
            <Text style={styles.shopButtonText}>Browse Parts</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart ({items.length} items)</Text>
        <TouchableOpacity onPress={handleClearCart}>
          <Ionicons name="trash-outline" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Cart Items */}
        {items.map((item) => (
          <View key={item.id} style={styles.cartItem}>
            <View style={styles.itemImage}>
              <Ionicons name="car-outline" size={40} color="#ccc" />
            </View>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemSupplier}>by {item.supplier}</Text>
              <View style={styles.itemFooter}>
                <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
                <View style={styles.quantityControl}>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity - 1)}
                  >
                    <Ionicons name="remove" size={16} color="#4285F4" />
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  >
                    <Ionicons name="add" size={16} color="#4285F4" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeItem(item.id)}
            >
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>${shipping.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Checkout Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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
    fontSize: 20,
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
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
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
    paddingHorizontal: 20,
  },
  cartItem: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  itemSupplier: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285F4",
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  quantity: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    minWidth: 20,
    textAlign: "center",
  },
  removeButton: {
    padding: 4,
  },
  summary: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 15,
    color: "#666",
  },
  summaryValue: {
    fontSize: 15,
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
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  checkoutButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
