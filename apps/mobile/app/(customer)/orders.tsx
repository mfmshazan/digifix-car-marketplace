import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../../config/firebase";
import { getBuyerOrders, type Order, type OrderItem } from "../../utils/orderManager";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

const mockOrders: Order[] = [
  {
    id: "ORD-2024-001",
    userId: "mock-user",
    userEmail: "user@example.com",
    userName: "Mock User",
    sellerEmail: "seller@example.com",
    items: [
      { id: "1", name: "Brake Pads Set", price: 45.99, quantity: 2, supplier: "AutoParts Pro" },
      { id: "2", name: "LED Headlight Bulbs", price: 29.99, quantity: 1, supplier: "LightTech" },
    ],
    subtotal: 121.97,
    shipping: 15.00,
    tax: 9.76,
    total: 146.73,
    status: "delivered",
    createdAt: "2024-01-15T10:30:00Z",
    updatedAt: "2024-01-15T10:30:00Z",
    confirmedByBuyer: true,
  },
  {
    id: "ORD-2024-002",
    userId: "mock-user",
    userEmail: "user@example.com",
    userName: "Mock User",
    sellerEmail: "seller@example.com",
    items: [
      { id: "3", name: "Oil Filter Premium", price: 24.99, quantity: 3, supplier: "FilterMax" },
    ],
    subtotal: 74.97,
    shipping: 15.00,
    tax: 6.00,
    total: 95.97,
    status: "shipped",
    createdAt: "2024-01-18T14:20:00Z",
    updatedAt: "2024-01-18T14:20:00Z",
    confirmedByBuyer: false,
  },
];

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    loadOrders();
  }, []);

  // Reload orders when screen is focused (e.g., after editing/cancelling order)
  useFocusEffect(
    React.useCallback(() => {
      loadOrders();
    }, [])
  );

  const loadOrders = async () => {
    try {
      if (!auth.currentUser?.uid) {
        setOrders(mockOrders);
        return;
      }
      
      const userOrders = await getBuyerOrders(auth.currentUser.uid);
      if (userOrders.length > 0) {
        setOrders(userOrders);
      } else {
        setOrders(mockOrders);
      }
    } catch (error) {
      console.error("Error loading orders:", error);
      setOrders(mockOrders);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadOrders();
      setRefreshing(false);
    }, 1000);
  }, []);

  const handleViewOrder = (order: Order) => {
    router.push(`/order/${order.id}` as any);
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "#FFA000";
      case "processing":
        return "#2196F3";
      case "shipped":
        return "#673AB7";
      case "delivered":
        return "#4CAF50";
      case "cancelled":
        return "#F44336";
      default:
        return "#999";
    }
  };

  const getStatusIcon = (status: Order["status"]) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "processing":
        return "construct-outline";
      case "shipped":
        return "car-outline";
      case "delivered":
        return "checkmark-circle-outline";
      case "cancelled":
        return "close-circle-outline";
      default:
        return "ellipse-outline";
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (filter === "all") return true;
    if (filter === "active") return ["pending", "confirmed", "processing", "shipped"].includes(order.status);
    if (filter === "completed") return ["delivered", "cancelled"].includes(order.status);
    return true;
  });

  if (orders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My Orders</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#ccc" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptyText}>Your order history will appear here</Text>
          <TouchableOpacity
            style={styles.shopButton}
            onPress={() => router.push("/(customer)/categories")}
          >
            <Text style={styles.shopButtonText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        <TouchableOpacity
          style={[styles.filterTab, filter === "all" && styles.filterTabActive]}
          onPress={() => setFilter("all")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "all" && styles.filterTabTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "active" && styles.filterTabActive]}
          onPress={() => setFilter("active")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "active" && styles.filterTabTextActive,
            ]}
          >
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === "completed" && styles.filterTabActive]}
          onPress={() => setFilter("completed")}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === "completed" && styles.filterTabTextActive,
            ]}
          >
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOrders.map((order) => (
          <TouchableOpacity
            key={order.id}
            style={styles.orderCard}
            onPress={() => handleViewOrder(order)}
          >
            <View style={styles.orderHeader}>
              <View>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(order.status) + "20" },
                ]}
              >
                <Ionicons
                  name={getStatusIcon(order.status) as any}
                  size={16}
                  color={getStatusColor(order.status)}
                />
                <Text
                  style={[styles.statusText, { color: getStatusColor(order.status) }]}
                >
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Text>
              </View>
            </View>

            <View style={styles.orderDetails}>
              <View style={styles.orderDetailItem}>
                <Ionicons name="cube-outline" size={18} color="#666" />
                <Text style={styles.orderDetailText}>{order.items.length} items</Text>
              </View>
              <View style={styles.orderDetailItem}>
                <Ionicons name="cash-outline" size={18} color="#666" />
                <Text style={styles.orderDetailText}>${order.total.toFixed(2)}</Text>
              </View>
              <Ionicons name="chevron-forward-outline" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>
        ))}

        {filteredOrders.length === 0 && (
          <View style={styles.noResults}>
            <Text style={styles.noResultsText}>No orders found</Text>
          </View>
        )}
      </ScrollView>
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
  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  filterTabActive: {
    backgroundColor: "#E8F0FE",
  },
  filterTabText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: "#4285F4",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  orderDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  orderDetailText: {
    fontSize: 14,
    color: "#666",
  },
  noResults: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 14,
    color: "#666",
  },
});
