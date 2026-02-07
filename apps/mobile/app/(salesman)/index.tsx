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
import { clearAuthData } from "../../src/api/storage";

// Sample dashboard data
const dashboardStats = [
  {
    id: "1",
    title: "Total Sales",
    value: "$12,458",
    change: "+12.5%",
    isPositive: true,
    icon: "trending-up",
    color: "#4CAF50",
  },
  {
    id: "2",
    title: "Orders",
    value: "156",
    change: "+8.2%",
    isPositive: true,
    icon: "receipt",
    color: "#6B7280",
  },
  {
    id: "3",
    title: "Products",
    value: "48",
    change: "+3",
    isPositive: true,
    icon: "cube",
    color: "#00002E",
  },
  {
    id: "4",
    title: "Customers",
    value: "892",
    change: "+24",
    isPositive: true,
    icon: "people",
    color: "#1A1A1A",
  },
];

const recentOrders = [
  {
    id: "ORD-001",
    customer: "John Doe",
    product: "Brake Pads Set",
    total: 91.98,
    status: "Pending",
    statusColor: "#FF9800",
  },
  {
    id: "ORD-002",
    customer: "Jane Smith",
    product: "Oil Filter Premium",
    total: 25.98,
    status: "Shipped",
    statusColor: "#2196F3",
  },
  {
    id: "ORD-003",
    customer: "Mike Johnson",
    product: "Spark Plugs (4 Pack)",
    total: 49.98,
    status: "Delivered",
    statusColor: "#4CAF50",
  },
];

const quickActions = [
  { id: "1", title: "Add Product", icon: "add-circle", color: "#00002E" },
  { id: "2", title: "View Orders", icon: "list", color: "#1A1A1A" },
  { id: "3", title: "Analytics", icon: "bar-chart", color: "#00002E" },
  { id: "4", title: "Promotions", icon: "pricetag", color: "#6B7280" },
];

export default function SalesmanDashboard() {
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAuthData();
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Logout error:", error);
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>Auto Parts Store</Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {dashboardStats.map((stat) => (
          <TouchableOpacity key={stat.id} style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: stat.color + "20" }]}>
              <Ionicons name={stat.icon as any} size={24} color={stat.color} />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statTitle}>{stat.title}</Text>
            <View style={styles.statChange}>
              <Ionicons
                name={stat.isPositive ? "arrow-up" : "arrow-down"}
                size={12}
                color={stat.isPositive ? "#4CAF50" : "#F44336"}
              />
              <Text
                style={[
                  styles.statChangeText,
                  { color: stat.isPositive ? "#4CAF50" : "#F44336" },
                ]}
              >
                {stat.change}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity key={action.id} style={styles.quickActionItem}>
              <View
                style={[
                  styles.quickActionIcon,
                  { backgroundColor: action.color + "20" },
                ]}
              >
                <Ionicons name={action.icon as any} size={28} color={action.color} />
              </View>
              <Text style={styles.quickActionText}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Recent Orders */}
      <View style={[styles.section, styles.lastSection]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Orders</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.ordersContainer}>
          {recentOrders.map((order) => (
            <TouchableOpacity key={order.id} style={styles.orderCard}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.orderCustomer}>{order.customer}</Text>
                <Text style={styles.orderProduct}>{order.product}</Text>
              </View>
              <View style={styles.orderRight}>
                <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                <View
                  style={[
                    styles.orderStatus,
                    { backgroundColor: order.statusColor + "20" },
                  ]}
                >
                  <Text style={[styles.orderStatusText, { color: order.statusColor }]}>
                    {order.status}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#00002E",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 10,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  logoutButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FF4444",
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    marginTop: -20,
  },
  statCard: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    margin: "1.5%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 8,
  },
  statChange: {
    flexDirection: "row",
    alignItems: "center",
  },
  statChangeText: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 4,
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  lastSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  seeAllText: {
    fontSize: 14,
    color: "#00002E",
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickActionItem: {
    alignItems: "center",
    width: "23%",
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  ordersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  orderCustomer: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  orderProduct: {
    fontSize: 12,
    color: "#999",
  },
  orderRight: {
    alignItems: "flex-end",
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00002E",
    marginBottom: 8,
  },
  orderStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  orderStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
});



