import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import MapView, { Marker } from "react-native-maps";
import { getSalesmanOrders, updateOrderStatus, createDeliveryRequest, getOrderDeliveryStatus, getAvailableRiders } from "../../src/api/orders";
import { usePendingOrders } from "../../src/store/pendingOrdersStore";

// ─── Delivery status label map ────────────────────────────────────────────────
const DELIVERY_LABEL: Record<string, string> = {
  pending: "Finding Rider…",
  available: "Awaiting Rider",
  assigned: "Rider Assigned",
  accepted: "Rider En Route",
  arrived_at_pickup: "Rider at Shop",
  picked_up: "Package Collected",
  in_transit: "In Transit",
  arrived_at_dropoff: "At Customer",
  delivered: "Delivered ✓",
  failed: "Delivery Failed",
};

interface AvailableRider {
  id: number;
  fullName: string;
  phone: string;
  vehicleType?: string;
  vehicleNumber?: string;
  rating?: number | null;
  totalDeliveries: number;
  distanceToPickupKm: number | null;
}

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({
  order,
  onClose,
  onDispatched,
}: {
  order: { id: string; orderNumber: string; customer?: { name?: string } };
  onClose: () => void;
  onDispatched: () => void;
}) {
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [paymentType, setPaymentType] = useState<"COD" | "PREPAID">("COD");
  const [notes, setNotes] = useState("");
  const [earnings, setEarnings] = useState("");
  const [gettingGps, setGettingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  // Map picker state for delivery location
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempPin, setTempPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [geocoding, setGeocoding] = useState(false);

  const getMyLocation = async () => {
    setGettingGps(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission is needed to auto-fill pickup coordinates.");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setPickupLat(loc.coords.latitude.toFixed(6));
      setPickupLng(loc.coords.longitude.toFixed(6));
    } catch {
      Alert.alert("Error", "Could not get location. Enter coordinates manually.");
    } finally {
      setGettingGps(false);
    }
  };

  const loadAvailableRiders = async () => {
    if (!pickupLat || !pickupLng) {
      Alert.alert("Missing Info", "Pickup coordinates are required before loading available riders.");
      return;
    }

    setLoadingRiders(true);
    setSelectedRiderId(null);
    try {
      const res = await getAvailableRiders(parseFloat(pickupLat), parseFloat(pickupLng));
      const riders = res?.data || [];
      setAvailableRiders(riders);
      if (!riders.length) {
        Alert.alert("No Riders", "No online delivery persons are available right now.");
      }
    } catch (err: any) {
      setAvailableRiders([]);
      Alert.alert("Error", err.message || "Failed to load available riders.");
    } finally {
      setLoadingRiders(false);
    }
  };

  const handleSubmit = async () => {
    if (!pickupLat || !pickupLng) {
      Alert.alert("Missing Info", "Pickup coordinates are required. Tap 'Use My Location' or enter manually.");
      return;
    }
    if (!deliveryLat || !deliveryLng) {
      Alert.alert("Missing Info", "Tap 'Choose on Map' to pin the customer delivery location.");
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert("Missing Info", "Please enter a delivery address label.");
      return;
    }
    if (!selectedRiderId) {
      Alert.alert("Missing Info", "Select an available delivery person before dispatching.");
      return;
    }
    setSubmitting(true);
    try {
      await createDeliveryRequest({
        orderId: order.id,
        pickupLatitude: parseFloat(pickupLat),
        pickupLongitude: parseFloat(pickupLng),
        pickupAddress: pickupAddress.trim() || undefined,
        deliveryLatitude: parseFloat(deliveryLat),
        deliveryLongitude: parseFloat(deliveryLng),
        deliveryAddress: deliveryAddress.trim(),
        paymentType,
        packageNotes: notes.trim() || undefined,
        estimatedEarnings: earnings ? parseFloat(earnings) : undefined,
        customerName: order.customer?.name,
        partnerId: selectedRiderId,
      });
      Alert.alert("Dispatched!", "Delivery request sent to the selected rider.");
      onDispatched();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to create delivery request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={dispatchStyles.container}>
        <View style={dispatchStyles.header}>
          <TouchableOpacity onPress={onClose} style={{ padding: 8 }}>
            <Ionicons name="close" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={dispatchStyles.title}>Dispatch Rider</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={dispatchStyles.body} keyboardShouldPersistTaps="handled">
          <Text style={dispatchStyles.orderRef}>
            Order {order.orderNumber} · {order.customer?.name ?? "Customer"}
          </Text>

          <Text style={dispatchStyles.label}>Pickup Location (Your Shop)</Text>
          <TouchableOpacity style={dispatchStyles.gpsBtn} onPress={getMyLocation} disabled={gettingGps}>
            {gettingGps ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="navigate" size={18} color="#FFF" />}
            <Text style={dispatchStyles.gpsBtnText}>{gettingGps ? "Getting GPS…" : "Use My Current Location"}</Text>
          </TouchableOpacity>
          <View style={dispatchStyles.row}>
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Latitude" keyboardType="decimal-pad" value={pickupLat} onChangeText={setPickupLat} />
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Longitude" keyboardType="decimal-pad" value={pickupLng} onChangeText={setPickupLng} />
          </View>
          <TextInput style={dispatchStyles.input} placeholder="Shop address (optional)" value={pickupAddress} onChangeText={setPickupAddress} />

          <Text style={[dispatchStyles.label, { marginTop: 14 }]}>Customer Delivery Location</Text>

          {/* Map picker button / selected location display */}
          {deliveryLat && deliveryLng ? (
            <View style={dispatchStyles.selectedLocationBox}>
              <Ionicons name="location" size={18} color="#00002E" style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={dispatchStyles.selectedLocationText} numberOfLines={2}>
                  {deliveryAddress || `${parseFloat(deliveryLat).toFixed(5)}, ${parseFloat(deliveryLng).toFixed(5)}`}
                </Text>
                <Text style={dispatchStyles.selectedCoords}>
                  {parseFloat(deliveryLat).toFixed(5)}, {parseFloat(deliveryLng).toFixed(5)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowMapPicker(true)} style={dispatchStyles.changeLocBtn}>
                <Text style={dispatchStyles.changeLocBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={dispatchStyles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
              <Ionicons name="map" size={18} color="#FFF" />
              <Text style={dispatchStyles.mapPickerBtnText}>Choose on Map</Text>
            </TouchableOpacity>
          )}

          {/* Optional: editable address label after pin is set */}
          {deliveryLat && deliveryLng && (
            <TextInput
              style={[dispatchStyles.input, { marginTop: 8 }]}
              placeholder="Edit address label (optional)"
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
            />
          )}

          {/* Full-screen map picker modal */}
          <Modal visible={showMapPicker} animationType="slide" onRequestClose={() => setShowMapPicker(false)}>
            <View style={{ flex: 1 }}>
              {/* Header */}
              <View style={dispatchStyles.mapHeader}>
                <TouchableOpacity onPress={() => setShowMapPicker(false)} style={{ padding: 8 }}>
                  <Ionicons name="close" size={24} color="#1A1A2E" />
                </TouchableOpacity>
                <Text style={dispatchStyles.mapHeaderTitle}>Choose Delivery Location</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Instruction banner */}
              <View style={dispatchStyles.mapHintBar}>
                <Ionicons name="information-circle-outline" size={15} color="#555" />
                <Text style={dispatchStyles.mapHintText}>
                  Tap anywhere on the map to drop a pin. You can drag it to adjust.
                </Text>
              </View>

              {/* Map */}
              <MapView
                style={{ flex: 1 }}
                initialRegion={
                  tempPin
                    ? { latitude: tempPin.latitude, longitude: tempPin.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 }
                    : { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.06, longitudeDelta: 0.06 }
                }
                onPress={(e) => setTempPin(e.nativeEvent.coordinate)}
              >
                {tempPin && (
                  <Marker
                    coordinate={tempPin}
                    draggable
                    onDragEnd={(e) => setTempPin(e.nativeEvent.coordinate)}
                    title="Delivery Location"
                    pinColor="#FF6B35"
                  />
                )}
              </MapView>

              {/* Footer */}
              <View style={dispatchStyles.mapFooter}>
                {tempPin ? (
                  <Text style={dispatchStyles.mapCoordsText}>
                    📍 {tempPin.latitude.toFixed(5)},  {tempPin.longitude.toFixed(5)}
                  </Text>
                ) : (
                  <Text style={dispatchStyles.mapPlaceholderText}>No location selected yet</Text>
                )}

                <TouchableOpacity
                  style={[dispatchStyles.confirmMapBtn, (!tempPin || geocoding) && { opacity: 0.5 }]}
                  disabled={!tempPin || geocoding}
                  onPress={async () => {
                    if (!tempPin) return;
                    setDeliveryLat(tempPin.latitude.toFixed(6));
                    setDeliveryLng(tempPin.longitude.toFixed(6));
                    // Reverse geocode via Nominatim (OSM, free)
                    setGeocoding(true);
                    try {
                      const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${tempPin.latitude}&lon=${tempPin.longitude}`,
                        { headers: { "Accept-Language": "en" } }
                      );
                      const data = await res.json();
                      if (data.display_name) setDeliveryAddress(data.display_name);
                    } catch { /* keep address empty, user can type it */ }
                    setGeocoding(false);
                    setShowMapPicker(false);
                  }}
                >
                  {geocoding ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                  )}
                  <Text style={dispatchStyles.confirmMapBtnText}>
                    {geocoding ? "Fetching Address…" : "Confirm Location"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          <Text style={[dispatchStyles.label, { marginTop: 14 }]}>Payment Type</Text>
          <View style={dispatchStyles.row}>
            {(["COD", "PREPAID"] as const).map((pt) => (
              <TouchableOpacity key={pt} style={[dispatchStyles.payBtn, paymentType === pt && dispatchStyles.payBtnActive]} onPress={() => setPaymentType(pt)}>
                <Text style={[dispatchStyles.payBtnText, paymentType === pt && dispatchStyles.payBtnTextActive]}>{pt === "COD" ? "Cash on Delivery" : "Prepaid"}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[dispatchStyles.row, { marginTop: 12 }]}>
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Rider pay (Rs)" keyboardType="decimal-pad" value={earnings} onChangeText={setEarnings} />
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Package notes" value={notes} onChangeText={setNotes} />
          </View>

          <View style={dispatchStyles.riderHeader}>
            <Text style={dispatchStyles.label}>Available Delivery Persons</Text>
            <TouchableOpacity style={dispatchStyles.loadRidersBtn} onPress={loadAvailableRiders} disabled={loadingRiders}>
              {loadingRiders ? <ActivityIndicator size="small" color="#00002E" /> : <Ionicons name="refresh" size={15} color="#00002E" />}
              <Text style={dispatchStyles.loadRidersText}>{loadingRiders ? "Loading" : "Load Riders"}</Text>
            </TouchableOpacity>
          </View>

          {availableRiders.map((rider) => {
            const selected = selectedRiderId === rider.id;
            return (
              <TouchableOpacity
                key={rider.id}
                style={[dispatchStyles.riderCard, selected && dispatchStyles.riderCardSelected]}
                onPress={() => setSelectedRiderId(rider.id)}
              >
                <View style={{ flex: 1 }}>
                  <View style={dispatchStyles.riderNameRow}>
                    <Text style={dispatchStyles.riderName} numberOfLines={1}>{rider.fullName}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={17} color="#16A34A" />}
                  </View>
                  <Text style={dispatchStyles.riderMeta} numberOfLines={1}>
                    {rider.vehicleType || "Vehicle"} {rider.vehicleNumber ? `- ${rider.vehicleNumber}` : ""}
                  </Text>
                  <Text style={dispatchStyles.riderPhone}>{rider.phone}</Text>
                </View>
                <View style={dispatchStyles.riderDistanceBox}>
                  <Text style={dispatchStyles.riderDistance}>
                    {rider.distanceToPickupKm !== null ? `${rider.distanceToPickupKm.toFixed(1)} km` : "Location pending"}
                  </Text>
                  <Text style={dispatchStyles.riderTrips}>
                    {rider.rating ? `${rider.rating.toFixed(1)} stars` : "New"} - {rider.totalDeliveries} trips
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={dispatchStyles.footer}>
          <TouchableOpacity style={dispatchStyles.cancelBtn} onPress={onClose}>
            <Text style={dispatchStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dispatchStyles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="send" size={16} color="#FFF" />}
            <Text style={dispatchStyles.submitBtnText}>{submitting ? "Dispatching…" : "Dispatch Rider"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Order type from API
interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  total: number;
  product?: {
    id: string;
    name: string;
    images: string[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  createdAt: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
}

const statusFilters = ["All", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING": return "#FF9800";
    case "CONFIRMED": return "#2196F3";
    case "PROCESSING": return "#2196F3";
    case "SHIPPED": return "#9C27B0";
    case "DELIVERED": return "#4CAF50";
    case "CANCELLED": return "#F44336";
    case "REFUNDED": return "#F44336";
    default: return "#666";
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function SalesmanOrdersScreen() {
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refreshPendingCount } = usePendingOrders();
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  // Maps orderId → delivery status string (loaded on demand)
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, string>>({});

  const loadDeliveryStatus = useCallback(async (orderId: string) => {
    try {
      const res = await getOrderDeliveryStatus(orderId);
      if (res?.success && res.data?.hasDelivery) {
        setDeliveryStatuses((prev) => ({ ...prev, [orderId]: res.data.deliveryStatus }));
      }
    } catch { /* silent */ }
  }, []);

  const fetchOrders = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const statusParam = selectedFilter === "All" ? undefined : selectedFilter;
      const response = await getSalesmanOrders(statusParam);

      if (response.success && response.data) {
        setOrders(response.data.orders || []);
      } else {
        setError(response.message || "Failed to load orders");
      }
    } catch (err: any) {
      console.error("Fetch orders error:", err);
      setError(err.message || "Failed to load orders");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await updateOrderStatus(orderId, newStatus);
      if (response.success) {
        Alert.alert("Success", `Order status updated to ${newStatus}`);
        fetchOrders(); // Refresh orders
        refreshPendingCount(); // Update badge count
      } else {
        Alert.alert("Error", response.message || "Failed to update status");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to update status");
    }
  };

  const confirmCancelOrder = (orderId: string, orderNumber: string) => {
    Alert.alert(
      "Cancel Order",
      `Are you sure you want to cancel order ${orderNumber}? This action cannot be undone.`,
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: () => handleUpdateStatus(orderId, "CANCELLED") 
        }
      ]
    );
  };

  const confirmStatusChange = (orderId: string, currentStatus: string) => {
    const nextStatus = getNextStatus(currentStatus);
    if (!nextStatus) return;

    Alert.alert(
      "Update Order Status",
      `Change status from ${currentStatus} to ${nextStatus}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => handleUpdateStatus(orderId, nextStatus) }
      ]
    );
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "PENDING": return "CONFIRMED";
      case "CONFIRMED": return "PROCESSING";
      case "PROCESSING": return "SHIPPED";
      case "SHIPPED": return "DELIVERED";
      default: return null;
    }
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    const canProgress = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED"].includes(item.status);
    const isPending = item.status === "PENDING";
    const canCancel = ["PENDING", "CONFIRMED"].includes(item.status);

    return (
      <TouchableOpacity style={[styles.orderCard, isPending && styles.pendingOrderCard]}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>{item.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusColor + "20" },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        <View style={styles.customerInfo}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.customerName}>
            {item.customer?.name || "Unknown Customer"}
          </Text>
        </View>

        <View style={styles.orderItems}>
          {item.items.map((orderItem, index) => (
            <Text key={index} style={styles.orderItemText}>
              {orderItem.quantity}x {orderItem.product?.name || "Product"}
            </Text>
          ))}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderTotal}>${item.total.toFixed(2)}</Text>
          <View style={styles.orderActions}>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="eye-outline" size={18} color="#666" />
            </TouchableOpacity>
            {canCancel && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => confirmCancelOrder(item.id, item.orderNumber)}
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {canProgress && !isPending && (
              <TouchableOpacity 
                style={[styles.actionButton, styles.progressButton]}
                onPress={() => confirmStatusChange(item.id, item.status)}
              >
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Prominent Confirm Order button for PENDING orders */}
        {isPending && (
          <TouchableOpacity
            style={styles.confirmOrderButton}
            onPress={() => confirmStatusChange(item.id, item.status)}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
            <Text style={styles.confirmOrderButtonText}>Confirm Order</Text>
          </TouchableOpacity>
        )}

        {/* Dispatch Rider button for CONFIRMED / PROCESSING orders */}
        {["CONFIRMED", "PROCESSING"].includes(item.status) && (
          <View style={styles.dispatchSection}>
            {deliveryStatuses[item.id] ? (
              <View style={styles.deliveryStatusRow}>
                <Ionicons name="bicycle" size={14} color="#00002E" />
                <Text style={styles.deliveryStatusText}>
                  {DELIVERY_LABEL[deliveryStatuses[item.id]] ?? deliveryStatuses[item.id]}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dispatchButton}
                onPress={() => {
                  loadDeliveryStatus(item.id);
                  setDispatchingOrder(item);
                }}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
                <Text style={styles.dispatchButtonText}>Dispatch Rider</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.loadingText}>Loading orders...</Text>
      </View>
    );
  }

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
          {orders.length} order(s)
        </Text>
      </View>

      {/* Orders List */}
      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#F44336" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={() => fetchOrders(true)}
              colors={["#00002E"]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#CCC" />
              <Text style={styles.emptyText}>No orders found</Text>
              <Text style={styles.emptySubtext}>
                Orders from customers will appear here
              </Text>
            </View>
          }
        />
      )}
      {/* Dispatch Modal */}
      {dispatchingOrder && (
        <DispatchModal
          order={dispatchingOrder}
          onClose={() => setDispatchingOrder(null)}
          onDispatched={() => {
            setDeliveryStatuses((prev) => ({ ...prev, [dispatchingOrder.id]: "pending" }));
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: "#F44336",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#00002E",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
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
    backgroundColor: "#00002E",
    borderColor: "#00002E",
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
    color: "#00002E",
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
  progressButton: {
    backgroundColor: "#2196F3",
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  pendingOrderCard: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  confirmOrderButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 12,
    gap: 8,
  },
  confirmOrderButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
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
  emptySubtext: {
    marginTop: 8,
    fontSize: 13,
    color: "#BBB",
    textAlign: "center",
  },
  dispatchSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 10,
  },
  dispatchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#00002E",
    borderRadius: 10,
    paddingVertical: 11,
  },
  dispatchButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  deliveryStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
  },
  deliveryStatusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#00002E",
  },
});

// ─── Dispatch Modal Styles ────────────────────────────────────────────────────

const dispatchStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF", paddingTop: Platform.OS === "ios" ? 50 : 0 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  title: { fontSize: 17, fontWeight: "700", color: "#1A1A2E" },
  body: { flex: 1, padding: 20 },
  orderRef: { fontSize: 13, color: "#666", marginBottom: 18 },
  label: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", marginBottom: 8 },
  gpsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00002E",
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 10,
  },
  gpsBtnText: { fontSize: 14, fontWeight: "600", color: "#FFF" },
  row: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A2E",
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  half: { flex: 1 },
  payBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  payBtnActive: { backgroundColor: "#00002E", borderColor: "#00002E" },
  payBtnText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  payBtnTextActive: { color: "#FFF" },
  riderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  loadRidersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  loadRidersText: { fontSize: 12, fontWeight: "700", color: "#00002E" },
  riderCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: "#FFF",
  },
  riderCardSelected: {
    borderColor: "#00002E",
    backgroundColor: "#F0F4FF",
  },
  riderNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  riderName: { flex: 1, fontSize: 14, fontWeight: "700", color: "#111827" },
  riderMeta: { fontSize: 12, color: "#6B7280", marginTop: 3 },
  riderPhone: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  riderDistanceBox: { alignItems: "flex-end", maxWidth: 116 },
  riderDistance: { fontSize: 12, fontWeight: "700", color: "#111827", textAlign: "right" },
  riderTrips: { fontSize: 11, color: "#9CA3AF", marginTop: 3, textAlign: "right" },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontWeight: "600", color: "#374151" },
  submitBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00002E",
    borderRadius: 12,
    paddingVertical: 13,
  },
  submitBtnText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  // Map picker styles
  mapPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF6B35",
    borderRadius: 10,
    paddingVertical: 13,
    marginBottom: 10,
  },
  mapPickerBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  selectedLocationBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#F0F4FF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  selectedLocationText: { fontSize: 13, color: "#1A1A2E", fontWeight: "500" },
  selectedCoords: { fontSize: 11, color: "#6B7280", marginTop: 2 },
  changeLocBtn: { paddingLeft: 6, paddingTop: 2 },
  changeLocBtnText: { fontSize: 12, fontWeight: "700", color: "#FF6B35" },
  // Full-screen map modal
  mapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
    backgroundColor: "#FFF",
  },
  mapHeaderTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  mapHintBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#FFF9F0",
    borderBottomWidth: 1,
    borderBottomColor: "#FFE0C0",
  },
  mapHintText: { fontSize: 12, color: "#555", flex: 1 },
  mapFooter: {
    backgroundColor: "#FFF",
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: "#EEE",
    gap: 10,
  },
  mapCoordsText: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", textAlign: "center" },
  mapPlaceholderText: { fontSize: 13, color: "#999", textAlign: "center" },
  confirmMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#00002E",
    borderRadius: 12,
    paddingVertical: 14,
  },
  confirmMapBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});



