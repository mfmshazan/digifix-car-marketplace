import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { auth } from "../../config/firebase";
import { getSellerOrders, updateOrderStatus, type Order } from "../../utils/orderManager";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

const showPrompt = (title: string, message: string, onConfirm: (value: string) => void) => {
  if (Platform.OS === 'web') {
    const value = window.prompt(`${title}\n\n${message}`);
    if (value) onConfirm(value);
  } else {
    // For mobile, we'll show an alert first then navigate to a dedicated screen
    showAlert(title, message);
  }
};

export default function SellerOrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "shipped" | "delivered">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      if (!auth.currentUser?.email) {
        setOrders([]);
        return;
      }

      const sellerOrders = await getSellerOrders(auth.currentUser.email);
      setOrders(sellerOrders);
    } catch (error) {
      console.error("Error loading seller orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleShipOrder = (order: Order) => {
    if (order.status !== "pending" && order.status !== "confirmed" && order.status !== "processing") {
      showAlert("Cannot Ship", "This order cannot be shipped.");
      return;
    }

    showPrompt(
      "Ship Order",
      `Enter tracking number for order ${order.id}:`,
      async (trackingNumber: string) => {
        try {
          await updateOrderStatus(order.id, "shipped", trackingNumber);
          await loadOrders();
          showAlert("Success", `Order ${order.id} has been marked as shipped with tracking number: ${trackingNumber}`);
        } catch (error) {
          console.error("Error shipping order:", error);
          showAlert("Error", "Failed to ship order. Please try again.");
        }
      }
    );
  };

  const handleCancelOrder = async (order: Order) => {
    if (order.status === "delivered" || order.status === "cancelled") {
      showAlert("Cannot Cancel", "This order cannot be cancelled.");
      return;
    }

    if (Platform.OS === 'web') {
      if (!window.confirm(`Are you sure you want to cancel order ${order.id}?`)) return;
    }

    try {
      await updateOrderStatus(order.id, "cancelled");
      await loadOrders();
      showAlert("Success", `Order ${order.id} has been cancelled.`);
    } catch (error) {
      console.error("Error cancelling order:", error);
      showAlert("Error", "Failed to cancel order. Please try again.");
    }
  };

  const handleConfirmOrder = async (order: Order) => {
    if (order.status !== "pending") {
      showAlert("Cannot Confirm", "Only pending orders can be confirmed.");
      return;
    }

    try {
      await updateOrderStatus(order.id, "confirmed");
      await loadOrders();
      showAlert("Success", `Order ${order.id} has been confirmed and is ready for processing.`);
    } catch (error) {
      console.error("Error confirming order:", error);
      showAlert("Error", "Failed to confirm order. Please try again.");
    }
  };

  const handleProcessOrder = async (order: Order) => {
    if (order.status !== "confirmed") {
      showAlert("Cannot Process", "Only confirmed orders can be processed.");
      return;
    }

    try {
      await updateOrderStatus(order.id, "processing");
      await loadOrders();
      showAlert("Success", `Order ${order.id} is now being processed.`);
    } catch (error) {
      console.error("Error processing order:", error);
      showAlert("Error", "Failed to process order. Please try again.");
    }
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

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "pending") return order.status === "pending" || order.status === "confirmed" || order.status === "processing";
    if (filter === "shipped") return order.status === "shipped";
    if (filter === "delivered") return order.status === "delivered" || order.status === "cancelled";
    return true;
  });

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Orders Management</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{orders.length}</Text>
          <Text style={styles.statLabel}>Total Orders</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#FFA000" }]}>
            {orders.filter(o => o.status === "pending").length}
          </Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#9C27B0" }]}>
            {orders.filter(o => o.status === "shipped").length}
          </Text>
          <Text style={styles.statLabel}>Shipped</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: "#34A853" }]}>
            {orders.filter(o => o.status === "delivered").length}
          </Text>
          <Text style={styles.statLabel}>Delivered</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text style={[styles.filterText, filter === "all" && styles.filterTextActive]}>
            All ({orders.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "pending" && styles.filterTabActive]}
          onPress={() => setFilter("pending")}
        >
          <Text style={[styles.filterText, filter === "pending" && styles.filterTextActive]}>
            Pending ({orders.filter(o => ["pending", "confirmed", "processing"].includes(o.status)).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "shipped" && styles.filterTabActive]}
          onPress={() => setFilter("shipped")}
        >
          <Text style={[styles.filterText, filter === "shipped" && styles.filterTextActive]}>
            Shipped ({orders.filter(o => o.status === "shipped").length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "delivered" && styles.filterTabActive]}
          onPress={() => setFilter("delivered")}
        >
          <Text style={[styles.filterText, filter === "delivered" && styles.filterTextActive]}>
            Completed ({orders.filter(o => o.status === "delivered" || o.status === "cancelled").length})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Orders List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No orders found</Text>
            <Text style={styles.emptyText}>Orders from customers will appear here</Text>
          </View>
        ) : (
          filteredOrders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.customerName}>{order.userName}</Text>
                  <Text style={styles.orderDate}>
                    {new Date(order.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
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
                    size={14}
                    color="#fff"
                  />
                  <Text style={styles.statusText}>{order.status.toUpperCase()}</Text>
                </View>
              </View>

              <View style={styles.orderBody}>
                <View style={styles.orderInfo}>
                  <Ionicons name="cube-outline" size={16} color="#666" />
                  <Text style={styles.orderInfoText}>{order.items.length} items</Text>
                </View>
                <View style={styles.orderInfo}>
                  <Ionicons name="cash-outline" size={16} color="#666" />
                  <Text style={styles.orderInfoText}>${order.total.toFixed(2)}</Text>
                </View>
                {order.address && (
                  <View style={styles.orderInfo}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.orderInfoText} numberOfLines={1}>
                      {order.address.city}, {order.address.state}
                    </Text>
                  </View>
                )}
              </View>

              {/* Order Items */}
              <View style={styles.itemsContainer}>
                {order.items.map((item, index) => (
                  <Text key={index} style={styles.itemText}>
                    • {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                  </Text>
                ))}
              </View>

              {/* Action Buttons */}
              <View style={styles.actionsContainer}>
                {order.status === "pending" && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.confirmButton]}
                      onPress={() => handleConfirmOrder(order)}
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.actionButtonText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancelOrder(order)}
                    >
                      <Ionicons name="close-circle" size={18} color="#EA4335" />
                      <Text style={[styles.actionButtonText, { color: "#EA4335" }]}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
                {order.status === "confirmed" && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.processButton]}
                    onPress={() => handleProcessOrder(order)}
                  >
                    <Ionicons name="construct" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Start Processing</Text>
                  </TouchableOpacity>
                )}
                {(order.status === "processing" || order.status === "confirmed") && (
                  <TouchableOpacity
                    style={[styles.actionButton, styles.shipButton]}
                    onPress={() => handleShipOrder(order)}
                  >
                    <Ionicons name="airplane" size={18} color="#fff" />
                    <Text style={styles.actionButtonText}>Ship Order</Text>
                  </TouchableOpacity>
                )}
                {order.status === "shipped" && (
                  <View style={styles.trackingInfo}>
                    <Ionicons name="information-circle" size={16} color="#9C27B0" />
                    <Text style={styles.trackingText}>
                      {order.trackingNumber ? `Tracking: ${order.trackingNumber}` : "In transit"}
                    </Text>
                  </View>
                )}
                {order.status === "delivered" && order.confirmedByBuyer && (
                  <View style={styles.deliveredInfo}>
                    <Ionicons name="checkmark-done-circle" size={16} color="#34A853" />
                    <Text style={styles.deliveredText}>Confirmed by customer</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
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
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#4285F4",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
  },
  filterContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 4,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: "#4285F4",
  },
  filterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#4285F4",
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
  orderCard: {
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    height: 28,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  orderBody: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  orderInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderInfoText: {
    fontSize: 13,
    color: "#666",
  },
  itemsContainer: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  itemText: {
    fontSize: 13,
    color: "#333",
    marginBottom: 4,
  },
  actionsContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    minWidth: 120,
    justifyContent: "center",
  },
  confirmButton: {
    backgroundColor: "#4285F4",
  },
  processButton: {
    backgroundColor: "#2196F3",
  },
  shipButton: {
    backgroundColor: "#9C27B0",
  },
  cancelButton: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#EA4335",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  trackingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  trackingText: {
    fontSize: 13,
    color: "#9C27B0",
    fontWeight: "500",
  },
  deliveredInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  deliveredText: {
    fontSize: 13,
    color: "#34A853",
    fontWeight: "500",
  },
});
