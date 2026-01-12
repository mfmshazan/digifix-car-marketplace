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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  getBuyerOrders, 
  updateOrder, 
  confirmOrderDelivery,
  type Order,
  type OrderItem,
  type Address
} from "../../utils/orderManager";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Confirm", onPress: onConfirm },
    ]);
  }
};

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedNotes, setEditedNotes] = useState("");
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
    loadAddresses();
  }, [id]);

  const loadOrder = async () => {
    try {
      const savedOrders = await AsyncStorage.getItem('allOrders');
      let orders: Order[] = [];
      
      if (savedOrders) {
        orders = JSON.parse(savedOrders);
      } else {
        // Fallback to userOrders
        const userOrders = await AsyncStorage.getItem('userOrders');
        if (userOrders) orders = JSON.parse(userOrders);
      }
      
      const foundOrder = orders.find(o => o.id === id);
      if (foundOrder) {
        setOrder(foundOrder);
        setEditedNotes(foundOrder.notes || "");
        setSelectedAddress(foundOrder.address?.id || null);
      }
    } catch (error) {
      console.error("Error loading order:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAddresses = async () => {
    try {
      const savedAddresses = await AsyncStorage.getItem('userAddresses');
      if (savedAddresses) {
        setAddresses(JSON.parse(savedAddresses));
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
    }
  };

  const handleCancelOrder = () => {
    if (!order) return;

    if (order.status === "delivered" || order.status === "cancelled") {
      showAlert("Cannot Cancel", "This order cannot be cancelled.");
      return;
    }

    showConfirm(
      "Cancel Order",
      `Are you sure you want to cancel order ${order.id}? This action cannot be undone.`,
      async () => {
        try {
          const savedOrders = await AsyncStorage.getItem('userOrders');
          if (savedOrders) {
            const orders: Order[] = JSON.parse(savedOrders);
            const updatedOrders = orders.map(o =>
              o.id === order.id ? { ...o, status: "cancelled" as const } : o
            );
            await AsyncStorage.setItem('userOrders', JSON.stringify(updatedOrders));
            setOrder({ ...order, status: "cancelled" });
            showAlert("Order Cancelled", "Your order has been cancelled successfully.");
          }
        } catch (error) {
          console.error("Error cancelling order:", error);
          showAlert("Error", "Failed to cancel order. Please try again.");
        }
      }
    );
  };

  const handleSaveChanges = async () => {
    if (!order) return;

    try {
      const newAddress = addresses.find(a => a.id === selectedAddress);
      const updatedOrderData: Order = { 
        ...order, 
        notes: editedNotes, 
        address: newAddress,
        updatedAt: new Date().toISOString()
      };
      
      await updateOrder(updatedOrderData);
      setOrder(updatedOrderData);
      setEditing(false);
      showAlert("Success", "Order details updated successfully.");
    } catch (error) {
      console.error("Error updating order:", error);
      showAlert("Error", "Failed to update order. Please try again.");
    }
  };

  const handleConfirmDelivery = () => {
    if (!order) return;

    if (order.status !== "shipped") {
      showAlert("Cannot Confirm", "You can only confirm delivery for shipped orders.");
      return;
    }

    showConfirm(
      "Confirm Delivery",
      `Have you received order ${order.id}? Confirming will mark this order as delivered.`,
      async () => {
        try {
          await confirmOrderDelivery(order.id);
          // Reload order to get updated data
          await loadOrder();
          showAlert("Delivery Confirmed", "Thank you! Your order has been marked as delivered.");
        } catch (error) {
          console.error("Error confirming delivery:", error);
          showAlert("Error", "Failed to confirm delivery. Please try again.");
        }
      }
    );
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "#FFA000";
      case "confirmed": return "#4285F4";
      case "processing": return "#2196F3";
      case "shipped": return "#9C27B0";
      case "delivered": return "#34A853";
      case "cancelled": return "#EA4335";
      default: return "#999";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "time-outline";
      case "confirmed": return "checkmark-circle-outline";
      case "processing": return "construct-outline";
      case "shipped": return "airplane-outline";
      case "delivered": return "checkmark-done-outline";
      case "cancelled": return "close-circle-outline";
      default: return "help-circle-outline";
    }
  };

  const canEdit = order?.status && !["delivered", "cancelled"].includes(order.status);
  const canCancel = order?.status && !["delivered", "cancelled"].includes(order.status);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>Order not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
        {canEdit && !editing && (
          <TouchableOpacity onPress={() => setEditing(true)}>
            <Ionicons name="create-outline" size={24} color="#4285F4" />
          </TouchableOpacity>
        )}
        {editing && (
          <TouchableOpacity onPress={handleSaveChanges}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        )}
        {!editing && !canEdit && <View style={{ width: 40 }} />}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Order Status */}
        <View style={styles.section}>
          <View style={styles.statusHeader}>
            <View>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderDate}>
                {new Date(order.createdAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(order.status) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(order.status) as any}
                size={16}
                color="#fff"
              />
              <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Address</Text>
          {editing ? (
            <View>
              {addresses.map((address) => (
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
              ))}
              <TouchableOpacity
                style={styles.addAddressButton}
                onPress={() => router.push("/profile/addresses" as any)}
              >
                <Ionicons name="add-circle-outline" size={20} color="#4285F4" />
                <Text style={styles.addAddressText}>Add New Address</Text>
              </TouchableOpacity>
            </View>
          ) : order.address ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>{order.address.name}</Text>
              <Text style={styles.infoText}>
                {order.address.street}, {order.address.city}
                {order.address.state && `, ${order.address.state}`} {order.address.zipCode}
              </Text>
              <Text style={styles.infoText}>{order.address.phone}</Text>
            </View>
          ) : (
            <Text style={styles.emptyText}>No address saved</Text>
          )}
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({order.items.length})</Text>
          {order.items.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemIcon}>
                <Ionicons name="cube-outline" size={24} color="#4285F4" />
              </View>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSupplier}>by {item.supplier}</Text>
                <Text style={styles.itemQty}>Quantity: {item.quantity}</Text>
              </View>
              <Text style={styles.itemPrice}>${(item.price * item.quantity).toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* Order Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Notes</Text>
          {editing ? (
            <TextInput
              style={styles.notesInput}
              value={editedNotes}
              onChangeText={setEditedNotes}
              placeholder="Add delivery instructions or special requests..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />
          ) : (
            <Text style={styles.infoText}>
              {order.notes || "No notes added"}
            </Text>
          )}
        </View>

        {/* Order Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal</Text>
            <Text style={styles.summaryValue}>${order.subtotal.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Shipping</Text>
            <Text style={styles.summaryValue}>${order.shipping.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Tax</Text>
            <Text style={styles.summaryValue}>${order.tax.toFixed(2)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>${order.total.toFixed(2)}</Text>
          </View>
        </View>

        {/* Actions */}
        {order.status === "shipped" && !order.confirmedByBuyer && !editing && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmDelivery}
            >
              <Ionicons name="checkmark-circle-outline" size={20} color="#34A853" />
              <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {canCancel && !editing && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelOrder}
            >
              <Ionicons name="close-circle-outline" size={20} color="#EA4335" />
              <Text style={styles.cancelButtonText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#F5F5F5",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4285F4",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 20,
  },
  statusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: "#666",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  infoCard: {
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  infoText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
  },
  addressCard: {
    flexDirection: "row",
    padding: 12,
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
    fontSize: 14,
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
  addAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#4285F4",
    borderRadius: 8,
    borderStyle: "dashed",
  },
  addAddressText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4285F4",
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    marginBottom: 8,
  },
  itemIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 2,
  },
  itemSupplier: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  itemQty: {
    fontSize: 12,
    color: "#999",
  },
  itemPrice: {
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
    backgroundColor: "#fff",
  },
  summarySection: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 20,
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
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EA4335",
    backgroundColor: "#fff",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EA4335",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#34A853",
    marginBottom: 12,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});
