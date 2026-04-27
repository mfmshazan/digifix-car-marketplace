import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCart, CartItem } from "../../src/store/cartStore";
import { useRouter } from "expo-router";
import { createOrder } from "../../src/api/orders";

export default function CartScreen() {
  const { items, updateQuantity, removeItem, clearCart, getTotalPrice, isLoading } = useCart();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  const subtotal = getTotalPrice();
  // 10% platform service charge — matches backend calculation
  const serviceCharge = parseFloat((subtotal * 0.10).toFixed(2));
  // Delivery fee will be added once distance calculation is integrated
  const total = subtotal + serviceCharge;

  const handleIncreaseQuantity = async (id: string, currentQty: number) => {
    try {
      await updateQuantity(id, currentQty + 1);
    } catch (error: any) {
      Alert.alert("Update Failed", error?.message || "Please try again.");
    }
  };

  const handleDecreaseQuantity = async (id: string, currentQty: number) => {
    if (currentQty <= 1) {
      Alert.alert(
        "Remove Item",
        "Are you sure you want to remove this item from cart?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Remove", style: "destructive", onPress: async () => {
            try {
              await removeItem(id);
            } catch (error: any) {
              Alert.alert("Remove Failed", error?.message || "Please try again.");
            }
          } },
        ]
      );
    } else {
      try {
        await updateQuantity(id, currentQty - 1);
      } catch (error: any) {
        Alert.alert("Update Failed", error?.message || "Please try again.");
      }
    }
  };

  const handleRemoveItem = (id: string) => {
    Alert.alert(
      "Remove Item",
      "Are you sure you want to remove this item from cart?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: async () => {
          try {
            await removeItem(id);
          } catch (error: any) {
            Alert.alert("Remove Failed", error?.message || "Please try again.");
          }
        } },
      ]
    );
  };

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert("Empty Cart", "Please add items to your cart first.");
      return;
    }

    setIsCheckingOut(true);
    
    try {
      // Prepare order items
      const orderItems = items.map(item => ({
        productId: item.productId,
        quantity: item.quantity
      }));

      // Create the order (no address required)
      const orderResponse = await createOrder(
        orderItems,
        "CASH_ON_DELIVERY" // Default payment method
      );

      if (orderResponse.success) {
        // Clear local cart after successful order
        await clearCart();
        
        const orderNum = Array.isArray(orderResponse.data)
          ? orderResponse.data[0]?.orderNumber
          : orderResponse.data?.orderNumber || orderResponse.data?.orders?.[0]?.orderNumber;
        const orderTotal = Array.isArray(orderResponse.data)
          ? orderResponse.data[0]?.total
          : orderResponse.data?.total || orderResponse.data?.orders?.[0]?.total;
        Alert.alert(
          "Order Placed! 🎉",
          `Your order ${orderNum} has been placed successfully!\n\nTotal: Rs. ${orderTotal?.toLocaleString()}\n\nThe seller has been notified.`,
          [
            { 
              text: "View Orders", 
              onPress: () => router.push("/(customer)/orders") 
            },
            { 
              text: "Continue Shopping", 
              onPress: () => router.push("/(customer)") 
            }
          ]
        );
      } else {
        throw new Error(orderResponse.message || "Failed to create order");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      Alert.alert(
        "Checkout Failed",
        error.message || "Something went wrong. Please try again."
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  const renderCartItem = ({ item }: { item: CartItem }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemImage}>
        {item.image ? (
          <TouchableOpacity
            style={styles.imageTouchable}
            activeOpacity={0.9}
            onPress={() => setSelectedImage(item.image || null)}
          >
            <Image source={{ uri: item.image }} style={styles.productImage} />
          </TouchableOpacity>
        ) : (
          <Ionicons name="car-sport" size={32} color="#00002E" />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemCategory}>{item.categoryName || "Car Part"}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemCarInfo} numberOfLines={1}>{item.carInfo}</Text>
        <View style={styles.priceRow}>
          {item.discountPrice ? (
            <>
              <Text style={styles.itemPrice}>Rs. {item.discountPrice.toLocaleString()}</Text>
              <Text style={styles.originalPrice}>Rs. {item.price.toLocaleString()}</Text>
            </>
          ) : (
            <Text style={styles.itemPrice}>Rs. {item.price.toLocaleString()}</Text>
          )}
        </View>
      </View>
      <View style={styles.rightSection}>
        <TouchableOpacity 
          style={styles.removeButton} 
          onPress={() => handleRemoveItem(item.id)}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </TouchableOpacity>
        <View style={styles.quantityContainer}>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleDecreaseQuantity(item.id, item.quantity)}
          >
            <Ionicons name="remove" size={16} color="#00002E" />
          </TouchableOpacity>
          <Text style={styles.quantityText}>{item.quantity}</Text>
          <TouchableOpacity 
            style={styles.quantityButton}
            onPress={() => handleIncreaseQuantity(item.id, item.quantity)}
          >
            <Ionicons name="add" size={16} color="#00002E" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {items.length > 0 ? (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{items.length} item{items.length > 1 ? 's' : ''} in cart</Text>
            <TouchableOpacity onPress={() => {
              Alert.alert(
                "Clear Cart",
                "Are you sure you want to clear your cart?",
                [
                  { text: "Cancel", style: "cancel" },
                  { text: "Clear", style: "destructive", onPress: async () => {
                    try {
                      await clearCart();
                    } catch (error: any) {
                      Alert.alert("Clear Cart Failed", error?.message || "Please try again.");
                    }
                  } },
                ]
              );
            }}>
              <Text style={styles.clearText}>Clear All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.summaryContainer}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>Rs. {subtotal.toLocaleString()}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Service Charge (10%)</Text>
              <Text style={styles.summaryValue}>Rs. {serviceCharge.toLocaleString()}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>Rs. {total.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.checkoutButton, isCheckingOut && styles.checkoutButtonDisabled]} 
              onPress={handleCheckout}
              disabled={isCheckingOut}
            >
              {isCheckingOut ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={[styles.checkoutButtonText, { marginLeft: 8 }]}>Processing...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
                  <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Add some parts to get started
          </Text>
          <TouchableOpacity 
            style={styles.shopButton}
            onPress={() => router.push("/(customer)")}
          >
            <Text style={styles.shopButtonText}>Browse Parts</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.imageModalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(event) => event.stopPropagation()}
            style={styles.imageModalContent}
          >
            <TouchableOpacity
              style={styles.imageModalCloseButton}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageModalImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  clearText: {
    fontSize: 14,
    color: "#EF4444",
    fontWeight: "500",
  },
  list: {
    padding: 16,
    paddingBottom: 200,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  itemImage: {
    width: 72,
    height: 72,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  imageTouchable: {
    width: "100%",
    height: "100%",
  },
  itemInfo: {
    flex: 1,
  },
  itemCategory: {
    fontSize: 10,
    color: "#00002E",
    textTransform: "uppercase",
    fontWeight: "600",
    marginBottom: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 2,
  },
  itemCarInfo: {
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00002E",
  },
  originalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  rightSection: {
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 72,
  },
  removeButton: {
    padding: 4,
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    width: 28,
    height: 28,
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 14,
    fontWeight: "600",
    marginHorizontal: 10,
    color: "#1A1A2E",
    minWidth: 20,
    textAlign: "center",
  },
  summaryContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A2E",
  },
  freeDelivery: {
    color: "#10B981",
    fontWeight: "600",
  },
  freeDeliveryHint: {
    fontSize: 12,
    color: "#F59E0B",
    textAlign: "center",
    marginBottom: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  totalValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00002E",
  },
  checkoutButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  checkoutButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  checkoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1A1A2E",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
  shopButton: {
    marginTop: 24,
    backgroundColor: "#00002E",
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  shopButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalCloseButton: {
    position: "absolute",
    top: 40,
    right: 8,
    zIndex: 2,
    padding: 8,
  },
  imageModalImage: {
    width: "100%",
    height: "85%",
  },
});



