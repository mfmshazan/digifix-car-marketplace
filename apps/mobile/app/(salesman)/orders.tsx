import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Sample orders data
const sampleOrders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    email: "john@example.com",
    date: "Dec 22, 2025",
    items: [
      { name: "Brake Pads Set", quantity: 2, price: 45.99 },
    ],
    total: 91.98,
    status: "Pending",
    statusColor: "#FF9800",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    email: "jane@example.com",
    date: "Dec 21, 2025",
    items: [
      { name: "Oil Filter Premium", quantity: 2, price: 12.99 },
    ],
    total: 25.98,
    status: "Processing",
    statusColor: "#2196F3",
  },
  {
    id: "ORD-003",
    customer: "Mike Johnson",
    email: "mike@example.com",
    date: "Dec 20, 2025",
    items: [
      { name: "Spark Plugs (4 Pack)", quantity: 2, price: 24.99 },
    ],
    total: 49.98,
    status: "Shipped",
    statusColor: "#9C27B0",
  },
  {
    id: "ORD-004",
    customer: "Sarah Williams",
    email: "sarah@example.com",
    date: "Dec 19, 2025",
    items: [
      { name: "Air Filter", quantity: 1, price: 19.99 },
      { name: "Oil Filter Premium", quantity: 1, price: 12.99 },
    ],
    total: 32.98,
    status: "Delivered",
    statusColor: "#4CAF50",
  },
  {
    id: "ORD-005",
    customer: "Tom Brown",
    email: "tom@example.com",
    date: "Dec 18, 2025",
    items: [
      { name: "Headlight Bulb H7", quantity: 2, price: 15.99 },
    ],
    total: 31.98,
    status: "Cancelled",
    statusColor: "#F44336",
  },
];

const statusFilters = ["All", "Pending", "Processing", "Shipped", "Delivered", "Cancelled"];

export default function SalesmanOrdersScreen() {
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filteredOrders = sampleOrders.filter((order) => {
    if (selectedFilter === "All") return true;
    return order.status === selectedFilter;
  });

  const renderOrder = ({ item }: { item: (typeof sampleOrders)[0] }) => (
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

      <View style={styles.customerInfo}>
        <Ionicons name="person-outline" size={16} color="#666" />
        <Text style={styles.customerName}>{item.customer}</Text>
      </View>

      <View style={styles.orderItems}>
        {item.items.map((orderItem, index) => (
          <Text key={index} style={styles.orderItemText}>
            {orderItem.quantity}x {orderItem.name}
          </Text>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
        <View style={styles.orderActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Ionicons name="eye-outline" size={18} color="#666" />
          </TouchableOpacity>
          {item.status === "Pending" && (
            <TouchableOpacity style={[styles.actionButton, styles.confirmButton]}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Status Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={statusFilters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                selectedFilter === item && styles.filterChipActive,
              ]}
              onPress={() => setSelectedFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilter === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Orders Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredOrders.length} order(s)
        </Text>
      </View>

      {/* Orders List */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No orders found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  filtersContainer: {
    paddingVertical: 12,
  },
  filtersList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: "#999",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
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
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  orderDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  customerName: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  orderItems: {
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F5F5F5",
    marginBottom: 12,
  },
  orderItemText: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  orderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  orderActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
});
