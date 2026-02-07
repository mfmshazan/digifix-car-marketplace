import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const orders = [
  {
    id: "ORD-001",
    date: "Dec 20, 2025",
    status: "Delivered",
    total: 104.97,
    items: 3,
    statusColor: "#4CAF50",
  },
  {
    id: "ORD-002",
    date: "Dec 18, 2025",
    status: "In Transit",
    total: 58.98,
    items: 2,
    statusColor: "#FF9800",
  },
  {
    id: "ORD-003",
    date: "Dec 15, 2025",
    status: "Processing",
    total: 32.99,
    items: 1,
    statusColor: "#2196F3",
  },
];

export default function OrdersScreen() {
  const renderOrder = ({ item }: { item: (typeof orders)[0] }) => (
    <TouchableOpacity style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{item.id}</Text>
          <Text style={styles.orderDate}>{item.date}</Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: item.statusColor + "20" },
          ]}
        >
          <Text style={[styles.statusText, { color: item.statusColor }]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.orderDivider} />
      <View style={styles.orderFooter}>
        <Text style={styles.orderItems}>{item.items} item(s)</Text>
        <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
      </View>
      <TouchableOpacity style={styles.trackButton}>
        <Ionicons name="location" size={16} color="#FF6B35" />
        <Text style={styles.trackButtonText}>Track Order</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="receipt-outline" size={80} color="#CCC" />
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>
            Your order history will appear here
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  list: {
    padding: 16,
  },
  orderCard: {
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
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  orderDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 16,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  orderItems: {
    fontSize: 14,
    color: "#666",
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  trackButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3EE",
    borderRadius: 12,
    height: 44,
  },
  trackButtonText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  },
});


