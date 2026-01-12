import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { auth } from "../../config/firebase";
import { getSellerOrders, getSellerProducts, type Order } from "../../utils/orderManager";

const quickActions = [
  { id: "1", title: "Add Product", icon: "add-circle", color: "#FF6B35", route: "/(salesman)/add-product" },
  { id: "2", title: "View Orders", icon: "list", color: "#4ECDC4", route: "/(salesman)/orders" },
  { id: "3", title: "Products", icon: "cube", color: "#45B7D1", route: "/(salesman)/products" },
  { id: "4", title: "Profile", icon: "person", color: "#96CEB4", route: "/(salesman)/profile" },
];

export default function SalesmanDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersCount: 0,
    productsCount: 0,
    customersCount: 0,
    pendingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
    }, [])
  );

  const loadDashboardData = async () => {
    try {
      if (!auth.currentUser?.email) {
        setLoading(false);
        return;
      }

      const [sellerOrders, sellerProducts] = await Promise.all([
        getSellerOrders(auth.currentUser.email),
        getSellerProducts(auth.currentUser.email),
      ]);

      setOrders(sellerOrders);
      setProducts(sellerProducts);

      // Calculate statistics
      const totalSales = sellerOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, order) => sum + order.total, 0);

      const uniqueCustomers = new Set(sellerOrders.map(o => o.userId));

      setStats({
        totalSales,
        ordersCount: sellerOrders.length,
        productsCount: sellerProducts.length,
        customersCount: uniqueCustomers.size,
        pendingOrders: sellerOrders.filter(o => o.status === "pending").length,
        shippedOrders: sellerOrders.filter(o => o.status === "shipped").length,
        deliveredOrders: sellerOrders.filter(o => o.status === "delivered").length,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const dashboardStats = [
    {
      id: "1",
      title: "Total Sales",
      value: `$${stats.totalSales.toFixed(2)}`,
      subValue: `${stats.deliveredOrders} delivered`,
      icon: "trending-up",
      color: "#4CAF50",
    },
    {
      id: "2",
      title: "Orders",
      value: stats.ordersCount.toString(),
      subValue: `${stats.pendingOrders} pending`,
      icon: "receipt",
      color: "#2196F3",
    },
    {
      id: "3",
      title: "Products",
      value: stats.productsCount.toString(),
      subValue: "Active listings",
      icon: "cube",
      color: "#FF6B35",
    },
    {
      id: "4",
      title: "Customers",
      value: stats.customersCount.toString(),
      subValue: "Unique buyers",
      icon: "people",
      color: "#9C27B0",
    },
  ];

  const recentOrders = orders.slice(0, 5);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "#FF9800";
      case "confirmed": return "#4285F4";
      case "processing": return "#2196F3";
      case "shipped": return "#9C27B0";
      case "delivered": return "#4CAF50";
      case "cancelled": return "#EA4335";
      default: return "#999";
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{auth.currentUser?.email || "Seller"}</Text>
        </View>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications" size={24} color="#FFFFFF" />
          {stats.pendingOrders > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>{stats.pendingOrders}</Text>
            </View>
          )}
        </TouchableOpacity>
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
            <Text style={styles.statSubValue}>{stat.subValue}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map((action) => (
            <TouchableOpacity 
              key={action.id} 
              style={styles.quickActionItem}
              onPress={() => router.push(action.route as any)}
            >
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
          <TouchableOpacity onPress={() => router.push("/(salesman)/orders")}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        {recentOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          <View style={styles.ordersContainer}>
            {recentOrders.map((order) => (
              <TouchableOpacity 
                key={order.id} 
                style={styles.orderCard}
                onPress={() => router.push(`/order/${order.id}`)}
              >
                <View style={styles.orderInfo}>
                  <Text style={styles.orderId}>{order.id}</Text>
                  <Text style={styles.orderCustomer}>{order.userName}</Text>
                  <Text style={styles.orderProduct}>
                    {order.items.length} item{order.items.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                  <View
                    style={[
                      styles.orderStatus,
                      { backgroundColor: getStatusColor(order.status) + "20" },
                    ]}
                  >
                    <Text style={[styles.orderStatusText, { color: getStatusColor(order.status) }]}>
                      {order.status}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FF6B35",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 50,
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
    fontSize: 18,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginTop: 4,
  },
  notificationButton: {
    position: "relative",
    padding: 8,
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: "#999",
    marginBottom: 4,
  },
  statSubValue: {
    fontSize: 11,
    color: "#666",
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
    color: "#FF6B35",
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    paddingHorizontal: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 12,
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
    color: "#FF6B35",
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

