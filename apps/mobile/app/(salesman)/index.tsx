import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { clearAuthData } from "../../src/api/storage";
import { getSalesmanSalesSummary, SalesmanSalesSummary } from "../../src/api/orders";

export default function SalesmanDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salesData, setSalesData] = useState<SalesmanSalesSummary | null>(null);
  const [selectedDate] = useState(new Date().toISOString().split('T')[0]);

  const fetchSalesData = useCallback(async () => {
    try {
      const response = await getSalesmanSalesSummary(selectedDate);
      if (response.success && response.data) {
        setSalesData(response.data);
      }
    } catch (error) {
      console.error('Error fetching sales data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchSalesData();
  }, [fetchSalesData]);

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        { text: "Cancel", style: "cancel" },
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

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return '#FF9800';
      case 'CONFIRMED': return '#2196F3';
      case 'PROCESSING': return '#9C27B0';
      case 'SHIPPED': return '#03A9F4';
      case 'DELIVERED': return '#4CAF50';
      case 'CANCELLED': return '#F44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.loadingText}>Loading sales data...</Text>
      </View>
    );
  }

  const today = salesData?.today;
  const weekly = salesData?.weekly;
  const monthly = salesData?.monthly;

  return (
    <ScrollView 
      style={styles.container} 
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#00002E"]} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.welcomeText}>Sales Dashboard</Text>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="notifications" size={24} color="#FFFFFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.badgeText}>{today?.pendingOrders || 0}</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Today&apos;s Revenue</Text>
          <View style={styles.todayBadge}>
            <Ionicons name="calendar" size={14} color="#00002E" />
            <Text style={styles.todayBadgeText}>Today</Text>
          </View>
        </View>
        <Text style={styles.revenueAmount}>
          {formatCurrency(today?.totalRevenue || 0)}
        </Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStatItem}>
            <Ionicons name="receipt" size={20} color="#4CAF50" />
            <Text style={styles.summaryStatValue}>{today?.totalOrders || 0}</Text>
            <Text style={styles.summaryStatLabel}>Orders</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Ionicons name="cube" size={20} color="#2196F3" />
            <Text style={styles.summaryStatValue}>{today?.totalItems || 0}</Text>
            <Text style={styles.summaryStatLabel}>Items Sold</Text>
          </View>
          <View style={styles.summaryStatDivider} />
          <View style={styles.summaryStatItem}>
            <Ionicons name="time" size={20} color="#FF9800" />
            <Text style={styles.summaryStatValue}>{today?.pendingOrders || 0}</Text>
            <Text style={styles.summaryStatLabel}>Pending</Text>
          </View>
        </View>
      </View>

      {/* Revenue Comparison */}
      <View style={styles.comparisonSection}>
        <Text style={styles.sectionTitle}>Revenue Overview</Text>
        <View style={styles.comparisonCards}>
          <View style={styles.comparisonCard}>
            <View style={[styles.comparisonIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="calendar-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.comparisonLabel}>This Week</Text>
            <Text style={styles.comparisonValue}>
              {formatCurrency(weekly?.totalRevenue || 0)}
            </Text>
            <Text style={styles.comparisonOrders}>
              {weekly?.totalOrders || 0} orders
            </Text>
          </View>
          <View style={styles.comparisonCard}>
            <View style={[styles.comparisonIcon, { backgroundColor: '#F3E5F5' }]}>
              <Ionicons name="trending-up" size={24} color="#9C27B0" />
            </View>
            <Text style={styles.comparisonLabel}>This Month</Text>
            <Text style={styles.comparisonValue}>
              {formatCurrency(monthly?.totalRevenue || 0)}
            </Text>
            <Text style={styles.comparisonOrders}>
              {monthly?.totalOrders || 0} orders
            </Text>
          </View>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActionsSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(salesman)/add-car-part')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="add-circle" size={28} color="#4CAF50" />
            </View>
            <Text style={styles.quickActionText}>Add Part</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(salesman)/orders')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="list" size={28} color="#2196F3" />
            </View>
            <Text style={styles.quickActionText}>Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickAction}
            onPress={() => router.push('/(salesman)/products')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="cube" size={28} color="#FF9800" />
            </View>
            <Text style={styles.quickActionText}>Products</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickAction}>
            <View style={[styles.quickActionIcon, { backgroundColor: '#FCE4EC' }]}>
              <Ionicons name="bar-chart" size={28} color="#E91E63" />
            </View>
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Today's Orders */}
      <View style={styles.ordersSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today&apos;s Sales</Text>
          <TouchableOpacity onPress={() => router.push('/(salesman)/orders')}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {today?.orders && today.orders.length > 0 ? (
          today.orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderIdContainer}>
                  <Text style={styles.orderId}>#{order.orderNumber.slice(-8).toUpperCase()}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) + '20' }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
                      {order.status}
                    </Text>
                  </View>
                </View>
                <Text style={styles.orderTime}>
                  {new Date(order.createdAt).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </Text>
              </View>

              <View style={styles.customerInfo}>
                <Ionicons name="person-circle" size={20} color="#666" />
                <Text style={styles.customerName}>{order.customer}</Text>
              </View>

              {/* Order Items */}
              <View style={styles.itemsList}>
                {order.items.map((item, idx) => (
                  <View key={idx} style={styles.orderItem}>
                    <View style={styles.itemImageContainer}>
                      {item.productImage ? (
                        <Image 
                          source={{ uri: item.productImage }} 
                          style={styles.itemImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.itemImagePlaceholder}>
                          <Ionicons name="cube" size={20} color="#999" />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemDetails}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                      <Text style={styles.itemQty}>Qty: {item.quantity}</Text>
                    </View>
                    <Text style={styles.itemPrice}>
                      {formatCurrency(item.total)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Order Total */}
              <View style={styles.orderFooter}>
                <View style={styles.orderTotalRow}>
                  <Text style={styles.orderTotalLabel}>Subtotal</Text>
                  <Text style={styles.orderTotalValue}>{formatCurrency(order.subtotal)}</Text>
                </View>
                {order.deliveryFee > 0 && (
                  <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalLabel}>Delivery Fee</Text>
                    <Text style={styles.orderTotalValue}>{formatCurrency(order.deliveryFee)}</Text>
                  </View>
                )}
                {order.discount > 0 && (
                  <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalLabel}>Discount</Text>
                    <Text style={[styles.orderTotalValue, { color: '#4CAF50' }]}>
                      -{formatCurrency(order.discount)}
                    </Text>
                  </View>
                )}
                <View style={[styles.orderTotalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Total Received</Text>
                  <Text style={styles.grandTotalValue}>{formatCurrency(order.total)}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="receipt-outline" size={48} color="#DDD" />
            <Text style={styles.emptyStateText}>No sales today yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Your orders will appear here when customers make purchases
            </Text>
          </View>
        )}
      </View>

      {/* Top Products */}
      {salesData?.topSellingProducts && salesData.topSellingProducts.length > 0 && (
        <View style={styles.topProductsSection}>
          <Text style={styles.sectionTitle}>Top Selling Products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {salesData.topSellingProducts.map((product) => (
              <View key={product.id} style={styles.topProductCard}>
                {product.images?.[0] ? (
                  <Image 
                    source={{ uri: product.images[0] }} 
                    style={styles.topProductImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.topProductImagePlaceholder}>
                    <Ionicons name="cube" size={32} color="#999" />
                  </View>
                )}
                <Text style={styles.topProductName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.topProductSold}>{product.totalSold} sold</Text>
                <Text style={styles.topProductRevenue}>
                  {formatCurrency(product.totalRevenue)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 30 }} />
    </ScrollView>
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
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#00002E",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingTop: 10,
  },
  headerContent: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  dateText: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 4,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
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
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: -10,
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  summaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 14,
    color: "#666",
  },
  todayBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  todayBadgeText: {
    fontSize: 12,
    color: "#00002E",
    fontWeight: "600",
  },
  revenueAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#00002E",
    marginTop: 8,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  summaryStatItem: {
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginTop: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  summaryStatDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
  },
  comparisonSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  comparisonCards: {
    flexDirection: "row",
    gap: 12,
  },
  comparisonCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  comparisonIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  comparisonLabel: {
    fontSize: 13,
    color: "#666",
  },
  comparisonValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginTop: 4,
  },
  comparisonOrders: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  quickActionsSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  quickActionsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  quickAction: {
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
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  ordersSection: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#00002E",
    fontWeight: "500",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderIdContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orderId: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  orderTime: {
    fontSize: 13,
    color: "#999",
  },
  customerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  customerName: {
    fontSize: 14,
    color: "#666",
  },
  itemsList: {
    gap: 10,
  },
  orderItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  itemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#F5F5F5",
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1A1A2E",
  },
  itemCategory: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  itemQty: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00002E",
  },
  orderFooter: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  orderTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  orderTotalLabel: {
    fontSize: 13,
    color: "#999",
  },
  orderTotalValue: {
    fontSize: 13,
    color: "#666",
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#00002E",
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 13,
    color: "#999",
    textAlign: "center",
    marginTop: 8,
  },
  topProductsSection: {
    marginTop: 24,
    paddingLeft: 16,
  },
  topProductCard: {
    width: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topProductImage: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  topProductImagePlaceholder: {
    width: "100%",
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  topProductName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A2E",
  },
  topProductSold: {
    fontSize: 11,
    color: "#4CAF50",
    marginTop: 4,
  },
  topProductRevenue: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#00002E",
    marginTop: 4,
  },
});



