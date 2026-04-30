import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { getCustomerOrders, Order } from "../../src/api/orders";
import OrderTrackingMap from "../../src/components/OrderTrackingMap";
import { connectSocket } from "../../src/lib/socket";
import { getToken } from "../../src/api/storage";

// Status color mapping
const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case "DELIVERED":
    case "COMPLETED":
      return "#4CAF50";
    case "IN_TRANSIT":
    case "SHIPPED":
      return "#FF9800";
    case "PROCESSING":
    case "CONFIRMED":
      return "#2196F3";
    case "PENDING":
      return "#9E9E9E";
    case "CANCELLED":
      return "#F44336";
    default:
      return "#666666";
  }
};

// Format status for display
const formatStatus = (status: string) => {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const OrderStepper = ({ currentStatus }: { currentStatus: string }) => {
  const steps = [
    { key: "PENDING", title: "Placed" },
    { key: "CONFIRMED", title: "Confirmed" },
    { key: "PROCESSING", title: "Processing" },
    { key: "SHIPPED", title: "Shipped" },
    { key: "DELIVERED", title: "Delivered" },
  ];

  let currentIndex = steps.findIndex((s) => s.key === currentStatus.toUpperCase());
  if (currentIndex === -1) {
    if (currentStatus.toUpperCase() === "CANCELLED") currentIndex = 0; // Or handle separately
    else currentIndex = 0;
  }

  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.stepperContainer}>
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isActive = index === currentIndex;
        const isInactive = index > currentIndex;
        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={step.key}>
            {/* Step Circle & Label */}
            <View style={styles.stepWrapper}>
              <View
                style={[
                  styles.stepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isActive && styles.stepCircleActive,
                  isInactive && styles.stepCircleInactive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    isCompleted && styles.stepNumberCompleted,
                    isActive && styles.stepNumberActive,
                    isInactive && styles.stepNumberInactive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  (isCompleted || isActive) ? styles.stepLabelActive : styles.stepLabelInactive,
                ]}
                numberOfLines={1}
              >
                {step.title}
              </Text>
            </View>

            {/* Connecting Line */}
            {!isLast && (
              <View style={styles.lineWrapper}>
                <View
                  style={[
                    styles.lineBase,
                    isCompleted ? styles.lineCompleted : styles.lineInactive,
                  ]}
                />
                {isActive && (
                  <Animated.View
                    style={[
                      styles.lineAnimated,
                      {
                        width: pulseAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                )}
              </View>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);

  const fetchOrders = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const response = await getCustomerOrders();

      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      } else {
        setOrders([]);
      }
    } catch (err: any) {
      console.error("Failed to fetch orders:", err);
      setError(err.message || "Failed to load orders");
      setOrders([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Fetch orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [])
  );

  // ── Real-time socket: listen for order status changes ───────────────────────
  useEffect(() => {
    let connected = false;

    const setup = async () => {
      try {
        // Decode the user ID from the JWT stored on device
        const token = await getToken();
        if (!token) return;

        // Decode payload (middle section of JWT) to extract userId
        const payloadBase64 = token.split('.')[1];
        const decoded = JSON.parse(atob(payloadBase64));
        const userId: string = decoded?.userId || decoded?.id || decoded?.sub;
        if (!userId) return;

        const socket = connectSocket(userId);
        connected = true;

        const handleStatusUpdate = (payload: {
          orderId: string;
          orderNumber: string;
          status: string;
        }) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.orderId ? { ...o, status: payload.status } : o
            )
          );
        };

        socket.on('orderStatusUpdated', handleStatusUpdate);

        // Store cleanup reference
        return () => {
          socket.off('orderStatusUpdated', handleStatusUpdate);
        };
      } catch (err) {
        console.warn('Socket setup failed:', err);
      }
    };

    let cleanup: (() => void) | undefined;
    setup().then((fn) => { cleanup = fn; });

    return () => {
      cleanup?.();
    };
  }, []);

  const onRefresh = () => {
    fetchOrders(true);
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>{item.orderNumber || `ORD-${item.id.slice(-6).toUpperCase()}`}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {formatStatus(item.status)}
            </Text>
          </View>
        </View>
        <View style={styles.orderDivider} />
        
        {/* Render Order Items */}
        {item.items && item.items.length > 0 && (
          <View style={styles.itemsContainer}>
            {item.items.map((orderItem: any, index: number) => {
              const itemImage = orderItem.productImage || orderItem.product?.images?.[0];
              const itemName = orderItem.productName || orderItem.product?.name || orderItem.itemName || `Item ${index + 1}`;
              return (
                <View key={index} style={styles.itemRow}>
                  {itemImage ? (
                    <TouchableOpacity onPress={() => setSelectedImage(itemImage)}>
                      <Image source={{ uri: itemImage }} style={styles.itemImage} resizeMode="cover" />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Ionicons name="car-sport-outline" size={20} color="#999" />
                    </View>
                  )}
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName} numberOfLines={2}>{itemName}</Text>
                    <Text style={styles.itemPriceQty}>Qty: {orderItem.quantity} × Rs. {orderItem.price.toFixed(2)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.orderFooter}>
          <Text style={styles.orderItems}>{itemCount} item(s)</Text>
          <Text style={styles.orderTotal}>Rs. {item.total.toFixed(2)}</Text>
        </View>
        <TouchableOpacity style={styles.trackButton} onPress={() => setTrackingOrder(item)}>
          <Ionicons name="location" size={16} color="#FF6B35" />
          <Text style={styles.trackButtonText}>Track Order</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
        <Text style={styles.errorTitle}>Failed to load orders</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {orders.length > 0 ? (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={["#00002E"]}
              tintColor="#00002E"
            />
          }
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

      {/* Image Zoom Modal */}
      <Modal
        visible={!!selectedImage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseButton} 
            onPress={() => setSelectedImage(null)}
          >
            <Ionicons name="close" size={30} color="#FFF" />
          </TouchableOpacity>
          {selectedImage && (
            <Image 
              source={{ uri: selectedImage }} 
              style={styles.modalImage} 
              resizeMode="contain" 
            />
          )}
        </View>
      </Modal>

      {/* Tracking Modal */}
      <Modal
        visible={!!trackingOrder}
        animationType="slide"
        onRequestClose={() => setTrackingOrder(null)}
      >
        <View style={styles.trackingModalContainer}>
          <View style={styles.trackingModalHeader}>
            <TouchableOpacity onPress={() => setTrackingOrder(null)}>
              <Ionicons name="close" size={28} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.trackingModalTitle}>Tracking Order</Text>
            <View style={{ width: 28 }} />
          </View>
          
          <OrderTrackingMap
            style={styles.map}
            latitude={6.9271}
            longitude={79.8612}
          />
          
          <View style={styles.trackingInfoCard}>
            <View style={styles.trackingInfoHeader}>
               <Text style={styles.trackingStatusText}>Order Status</Text>
               <Text style={styles.trackingOrderText}>Order {trackingOrder?.orderNumber}</Text>
            </View>
            <OrderStepper currentStatus={trackingOrder?.status || 'PENDING'} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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
    marginVertical: 12,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#FAFAFA",
  },
  itemImagePlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    color: "#1A1A2E",
    fontWeight: "500",
    marginBottom: 2,
  },
  itemPriceQty: {
    fontSize: 13,
    color: "#666",
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
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: "#00002E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  modalImage: {
    width: "100%",
    height: "80%",
  },
  trackingModalContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  trackingModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingTop: 50,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  trackingModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  map: {
    flex: 1,
  },
  trackingInfoCard: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  trackingStatusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  trackingOrderText: {
    fontSize: 14,
    color: "#666",
  },
  trackingInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  stepWrapper: {
    alignItems: "center",
    width: 44, // Fixed width to center text properly
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 6,
    backgroundColor: "#FFF",
  },
  stepCircleCompleted: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  stepCircleActive: {
    borderColor: "#00002E",
  },
  stepCircleInactive: {
    borderColor: "#E0E0E0",
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "bold",
  },
  stepNumberCompleted: {
    color: "#FFF",
  },
  stepNumberActive: {
    color: "#00002E",
  },
  stepNumberInactive: {
    color: "#999",
  },
  stepLabel: {
    fontSize: 10,
    textAlign: "center",
  },
  stepLabelActive: {
    color: "#00002E",
    fontWeight: "600",
  },
  stepLabelInactive: {
    color: "#999",
    fontWeight: "500",
  },
  lineWrapper: {
    flex: 1,
    height: 28, // Matches circle height to center vertically
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  lineBase: {
    height: 3,
    borderRadius: 2,
    width: "100%",
  },
  lineCompleted: {
    backgroundColor: "#00002E",
  },
  lineInactive: {
    backgroundColor: "#E0E0E0",
  },
  lineAnimated: {
    position: "absolute",
    left: 4,
    height: 3,
    backgroundColor: "#00002E",
    borderRadius: 2,
  },
});



