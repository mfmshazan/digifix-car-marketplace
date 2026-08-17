import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  getSalesmanOrders,
  updateOrderStatus,
  createDeliveryRequest,
  getOrderDeliveryStatus,
  getAvailableRiders,
  getShopPickupLocation,
  saveShopPickupLocation,
  resolveComplaint,
} from "../../src/api/orders";
import { usePendingOrders } from "../../src/store/pendingOrdersStore";
import { getSocket } from "../../src/lib/socket";
import { getUser } from "../../src/api/storage";

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

// Rider delivery statuses meaning the package has physically left the shop —
// only then can the seller/manager mark the order SHIPPED.
const PICKED_UP_DELIVERY_STATES = ["picked_up", "in_transit", "arrived_at_dropoff", "delivered"];

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

const formatOrderAddress = (address?: Order["address"]) => [
  address?.street,
  address?.city,
  address?.state,
  address?.postalCode,
  address?.country,
].filter(Boolean).join(", ");

// ─── Dispatch Modal ───────────────────────────────────────────────────────────

function DispatchModal({
  order,
  onClose,
  onDispatched,
}: {
  order: Order;
  onClose: () => void;
  onDispatched: () => void;
}) {
  const savedDeliveryLatitude = order.deliveryLatitude ?? order.address?.latitude ?? null;
  const savedDeliveryLongitude = order.deliveryLongitude ?? order.address?.longitude ?? null;
  const hasSavedCustomerLocation =
    savedDeliveryLatitude !== null &&
    savedDeliveryLongitude !== null &&
    Number.isFinite(Number(savedDeliveryLatitude)) &&
    Number.isFinite(Number(savedDeliveryLongitude));
  const savedDeliveryAddress = order.deliveryAddress || formatOrderAddress(order.address);
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [deliveryLat, setDeliveryLat] = useState(
    hasSavedCustomerLocation ? String(savedDeliveryLatitude) : "",
  );
  const [deliveryLng, setDeliveryLng] = useState(
    hasSavedCustomerLocation ? String(savedDeliveryLongitude) : "",
  );
  const [deliveryAddress, setDeliveryAddress] = useState(savedDeliveryAddress);
  const [paymentType, setPaymentType] = useState<"COD" | "PREPAID">("COD");
  const [notes, setNotes] = useState("");
  const [earnings, setEarnings] = useState("");
  const [gettingGps, setGettingGps] = useState(false);
  const [shopLocationLoading, setShopLocationLoading] = useState(true);
  const [shopLocationSaving, setShopLocationSaving] = useState(false);
  const [shopLocationConfigured, setShopLocationConfigured] = useState(false);
  const [editingShopLocation, setEditingShopLocation] = useState(false);
  const [savedShopLocation, setSavedShopLocation] = useState<{
    latitude: number;
    longitude: number;
    address: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [availableRiders, setAvailableRiders] = useState<AvailableRider[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<number | null>(null);
  // Map picker state for delivery location
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [tempPin, setTempPin] = useState<{ latitude: number; longitude: number } | null>(
    hasSavedCustomerLocation
      ? { latitude: Number(savedDeliveryLatitude), longitude: Number(savedDeliveryLongitude) }
      : null,
  );
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    let mounted = true;
    getShopPickupLocation()
      .then((location) => {
        if (!mounted) return;
        if (location.configured && location.latitude !== null && location.longitude !== null) {
          setPickupLat(location.latitude.toFixed(6));
          setPickupLng(location.longitude.toFixed(6));
          setPickupAddress(location.address || "");
          setSavedShopLocation({
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address || "",
          });
          setShopLocationConfigured(true);
        } else {
          setEditingShopLocation(true);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        setEditingShopLocation(true);
        Alert.alert("Shop Location", error.message || "Could not load the saved shop location.");
      })
      .finally(() => {
        if (mounted) setShopLocationLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

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
      if (!pickupAddress.trim()) {
        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          const address = [place?.name, place?.street, place?.city, place?.region]
            .filter(Boolean)
            .join(", ");
          if (address) setPickupAddress(address);
        } catch {
          // Coordinates are sufficient; the salesman can enter the address.
        }
      }
    } catch {
      Alert.alert("Error", "Could not get location. Enter coordinates manually.");
    } finally {
      setGettingGps(false);
    }
  };

  const saveFixedShopLocation = async () => {
    const latitude = Number(pickupLat);
    const longitude = Number(pickupLng);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
        !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      Alert.alert("Invalid Location", "Enter valid shop latitude and longitude values.");
      return;
    }

    setShopLocationSaving(true);
    try {
      const saved = await saveShopPickupLocation({
        latitude,
        longitude,
        address: pickupAddress.trim() || undefined,
      });
      setPickupLat(Number(saved.latitude).toFixed(6));
      setPickupLng(Number(saved.longitude).toFixed(6));
      setPickupAddress(saved.address || "");
      setSavedShopLocation({
        latitude: Number(saved.latitude),
        longitude: Number(saved.longitude),
        address: saved.address || "",
      });
      setShopLocationConfigured(true);
      setEditingShopLocation(false);
      setAvailableRiders([]);
      setSelectedRiderId(null);
      Alert.alert("Shop Location Saved", "This pickup location will be used for every delivery.");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save the shop location.");
    } finally {
      setShopLocationSaving(false);
    }
  };

  const cancelShopLocationEdit = () => {
    if (savedShopLocation) {
      setPickupLat(savedShopLocation.latitude.toFixed(6));
      setPickupLng(savedShopLocation.longitude.toFixed(6));
      setPickupAddress(savedShopLocation.address);
    }
    setEditingShopLocation(false);
  };

  const loadAvailableRiders = async () => {
    if (!shopLocationConfigured || editingShopLocation) {
      Alert.alert("Shop Location Required", "Save the fixed shop location before loading riders.");
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
    if (!shopLocationConfigured || editingShopLocation || !pickupLat || !pickupLng) {
      Alert.alert("Shop Location Required", "Save the fixed shop location before dispatching a rider.");
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
          {shopLocationLoading ? (
            <View style={dispatchStyles.shopLocationLoading}>
              <ActivityIndicator size="small" color="#00002E" />
              <Text style={dispatchStyles.shopLocationLoadingText}>Loading saved shop location...</Text>
            </View>
          ) : shopLocationConfigured && !editingShopLocation ? (
            <View style={dispatchStyles.fixedShopCard}>
              <View style={dispatchStyles.fixedShopIcon}>
                <Ionicons name="storefront" size={20} color="#00002E" />
              </View>
              <View style={dispatchStyles.fixedShopCopy}>
                <Text style={dispatchStyles.fixedShopTitle}>Fixed pickup location</Text>
                <Text style={dispatchStyles.fixedShopAddress} numberOfLines={2}>
                  {pickupAddress || "Shop location"}
                </Text>
                <Text style={dispatchStyles.fixedShopCoords}>
                  {Number(pickupLat).toFixed(5)}, {Number(pickupLng).toFixed(5)}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Change fixed shop location"
                onPress={() => setEditingShopLocation(true)}
                style={dispatchStyles.editShopBtn}
              >
                <Ionicons name="pencil" size={17} color="#FF6B35" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={dispatchStyles.shopSetupCard}>
              <Text style={dispatchStyles.shopSetupTitle}>
                {shopLocationConfigured ? "Change shop location" : "Set your shop location"}
              </Text>
              <Text style={dispatchStyles.shopSetupText}>
                Save this once. It will be the pickup point for every delivery.
              </Text>
              <TouchableOpacity style={dispatchStyles.gpsBtn} onPress={getMyLocation} disabled={gettingGps}>
                {gettingGps ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="navigate" size={18} color="#FFF" />}
                <Text style={dispatchStyles.gpsBtnText}>{gettingGps ? "Getting GPS..." : "Use Current Location for Shop"}</Text>
              </TouchableOpacity>
              <View style={dispatchStyles.row}>
                <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Latitude" keyboardType="decimal-pad" value={pickupLat} onChangeText={setPickupLat} />
                <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Longitude" keyboardType="decimal-pad" value={pickupLng} onChangeText={setPickupLng} />
              </View>
              <TextInput style={dispatchStyles.input} placeholder="Shop address" value={pickupAddress} onChangeText={setPickupAddress} />
              <View style={dispatchStyles.shopSetupActions}>
                {shopLocationConfigured ? (
                  <TouchableOpacity style={dispatchStyles.shopSetupCancel} onPress={cancelShopLocationEdit}>
                    <Text style={dispatchStyles.shopSetupCancelText}>Cancel</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={[dispatchStyles.saveShopBtn, shopLocationSaving && { opacity: 0.6 }]}
                  onPress={saveFixedShopLocation}
                  disabled={shopLocationSaving}
                >
                  {shopLocationSaving ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="save" size={17} color="#FFF" />}
                  <Text style={dispatchStyles.saveShopBtnText}>{shopLocationSaving ? "Saving..." : "Save Shop Location"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <Text style={[dispatchStyles.label, { marginTop: 14 }]}>Customer Delivery Location</Text>

          {/* Map picker button / selected location display */}
          {deliveryLat && deliveryLng ? (
            <>
              <View style={dispatchStyles.selectedLocationBox}>
                <Ionicons name="location" size={18} color="#00002E" style={{ marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  {hasSavedCustomerLocation && (
                    <Text style={dispatchStyles.savedLocationLabel}>CUSTOMER SAVED LOCATION</Text>
                  )}
                  <Text style={dispatchStyles.selectedLocationText} numberOfLines={2}>
                    {deliveryAddress || `${parseFloat(deliveryLat).toFixed(5)}, ${parseFloat(deliveryLng).toFixed(5)}`}
                  </Text>
                  <Text style={dispatchStyles.selectedCoords}>
                    {parseFloat(deliveryLat).toFixed(5)}, {parseFloat(deliveryLng).toFixed(5)}
                  </Text>
                </View>
                {!hasSavedCustomerLocation && (
                  <TouchableOpacity onPress={() => setShowMapPicker(true)} style={dispatchStyles.changeLocBtn}>
                    <Text style={dispatchStyles.changeLocBtnText}>Change</Text>
                  </TouchableOpacity>
                )}
              </View>
              {hasSavedCustomerLocation && (
                <MapView
                  style={dispatchStyles.customerMapPreview}
                  provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                  initialRegion={{
                    latitude: Number(deliveryLat),
                    longitude: Number(deliveryLng),
                    latitudeDelta: 0.012,
                    longitudeDelta: 0.012,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  rotateEnabled={false}
                  pitchEnabled={false}
                  toolbarEnabled={false}
                >
                  <Marker
                    coordinate={{ latitude: Number(deliveryLat), longitude: Number(deliveryLng) }}
                    title="Customer delivery location"
                  />
                </MapView>
              )}
            </>
          ) : (
            <TouchableOpacity style={dispatchStyles.mapPickerBtn} onPress={() => setShowMapPicker(true)}>
              <Ionicons name="map" size={18} color="#FFF" />
              <Text style={dispatchStyles.mapPickerBtnText}>Choose on Map</Text>
            </TouchableOpacity>
          )}

          {/* Optional: editable address label after pin is set */}
          {deliveryLat && deliveryLng && !hasSavedCustomerLocation && (
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
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
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
                    setGeocoding(true);
                    try {
                      const currentPermission = await Location.getForegroundPermissionsAsync();
                      const permission = currentPermission.status === "granted"
                        ? currentPermission
                        : await Location.requestForegroundPermissionsAsync();
                      if (permission.status === "granted") {
                        const [place] = await Location.reverseGeocodeAsync(tempPin);
                        const address = [
                          place?.streetNumber,
                          place?.street || place?.name,
                          place?.city || place?.subregion,
                          place?.region,
                          place?.postalCode,
                          place?.country,
                        ].filter(Boolean).join(", ");
                        if (address) setDeliveryAddress(address);
                      }
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
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Rider pay ($)" keyboardType="decimal-pad" value={earnings} onChangeText={setEarnings} />
            <TextInput style={[dispatchStyles.input, dispatchStyles.half]} placeholder="Package notes" value={notes} onChangeText={setNotes} />
          </View>

          <View style={dispatchStyles.riderHeader}>
            <Text style={dispatchStyles.label}>Available Delivery Persons</Text>
            <TouchableOpacity
              style={[
                dispatchStyles.loadRidersBtn,
                (!shopLocationConfigured || editingShopLocation || shopLocationLoading) && { opacity: 0.5 },
              ]}
              onPress={loadAvailableRiders}
              disabled={loadingRiders || !shopLocationConfigured || editingShopLocation || shopLocationLoading}
            >
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
          <TouchableOpacity
            style={[
              dispatchStyles.submitBtn,
              (submitting || !shopLocationConfigured || editingShopLocation || shopLocationLoading) && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={submitting || !shopLocationConfigured || editingShopLocation || shopLocationLoading}
          >
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
  cancellationReason?: string | null;
  deliveryAddress?: string | null;
  deliveryLatitude?: number | null;
  deliveryLongitude?: number | null;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  isComplaint?: boolean;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  items: OrderItem[];
}

const statusFilters = ["All", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "REFUND_REQUESTED", "CANCELLED"];

// Friendly labels for the filter chips (raw status values are otherwise shown).
const FILTER_LABELS: Record<string, string> = {
  REFUND_REQUESTED: "Complaints",
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "PENDING": return "#FF9800";
    case "CONFIRMED": return "#2196F3";
    case "PROCESSING": return "#2196F3";
    case "SHIPPED": return "#9C27B0";
    case "DELIVERED": return "#4CAF50";
    case "REFUND_REQUESTED": return "#D97706";
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
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState("All");
  const { refreshPendingCount } = usePendingOrders();
  const [dispatchingOrder, setDispatchingOrder] = useState<Order | null>(null);
  // Maps orderId → delivery status string (loaded on demand)
  const [deliveryStatuses, setDeliveryStatuses] = useState<Record<string, string>>({});
  const [resolvingComplaintId, setResolvingComplaintId] = useState<string | null>(null);
  // Post-delivery complaints are reviewed by the manager (shop owner).
  const [isManager, setIsManager] = useState(false);

  useEffect(() => {
    getUser().then((u) => setIsManager(u?.role === 'SHOP_MANAGER')).catch(() => {});
  }, []);

  // Orders are cached per filter via React Query: navigating away and back is instant,
  // with a background refresh. Socket events and actions patch this cache in place.
  const ordersKey = ['salesman-orders-mobile', selectedFilter];
  const {
    data: orders = [],
    isLoading,
    isRefetching: isRefreshing,
    error: queryError,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ordersKey,
    queryFn: async () => {
      const statusParam = selectedFilter === "All" ? undefined : selectedFilter;
      const response = await getSalesmanOrders(statusParam);
      if (response.success && response.data) return response.data.orders || [];
      throw new Error(response.message || "Failed to load orders");
    },
  });
  const error = queryError ? ((queryError as any).message || "Failed to load orders") : null;

  const fetchOrders = useCallback(() => { refetch(); }, [refetch]);

  // Patch the currently-cached orders list in place (used by socket + action handlers).
  const patchOrders = useCallback(
    (updater: (prev: Order[]) => Order[]) => {
      queryClient.setQueryData<Order[]>(['salesman-orders-mobile', selectedFilter], (prev) => updater(prev ?? []));
    },
    [queryClient, selectedFilter]
  );

  const loadDeliveryStatus = useCallback(async (orderId: string) => {
    try {
      const res = await getOrderDeliveryStatus(orderId);
      if (res?.success && res.data?.hasDelivery) {
        setDeliveryStatuses((prev) => ({ ...prev, [orderId]: res.data.deliveryStatus }));
      }
    } catch { /* silent */ }
  }, []);

  // Listen for real-time new orders + order/delivery status updates.
  useEffect(() => {
    const socket = getSocket();
    const handleNewOrder = () => {
      fetchOrders();
    };
    // Backend emits orderStatusUpdated with the order status AND the detailed
    // rider step (riderStep) to every shop member — use it to update the order
    // status and the per-order delivery status live (e.g. rider picked up).
    const handleStatusUpdate = (payload: { orderId: string; status?: string; riderStep?: string }) => {
      if (!payload?.orderId) return;
      if (payload.status) {
        patchOrders((prev) => prev.map((o) => (o.id === payload.orderId ? { ...o, status: payload.status as string } : o)));
      }
      if (payload.riderStep) {
        setDeliveryStatuses((prev) => ({ ...prev, [payload.orderId]: payload.riderStep as string }));
      }
    };
    // Customer raised a complaint, or a complaint was resolved elsewhere → refresh.
    const handleComplaint = () => {
      fetchOrders();
    };
    socket.on('newOrder', handleNewOrder);
    socket.on('orderStatusUpdated', handleStatusUpdate);
    socket.on('complaintRaised', handleComplaint);
    socket.on('complaintResolved', handleComplaint);
    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderStatusUpdated', handleStatusUpdate);
      socket.off('complaintRaised', handleComplaint);
      socket.off('complaintResolved', handleComplaint);
    };
  }, [fetchOrders, patchOrders]);

  // Load delivery status for orders that already have a rider in play, so the
  // dispatch button, pickup cue and ship-gating reflect reality on first render.
  useEffect(() => {
    orders.forEach((o) => {
      if (["PROCESSING", "SHIPPED"].includes(o.status) && deliveryStatuses[o.id] === undefined) {
        loadDeliveryStatus(o.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, loadDeliveryStatus]);

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

  const handleResolveComplaint = (orderId: string, orderNumber: string, action: 'accept' | 'reject') => {
    Alert.alert(
      action === 'accept' ? 'Accept Complaint' : 'Reject Complaint',
      action === 'accept'
        ? `Approve the refund request for order ${orderNumber}? The customer should return the product to the warehouse.`
        : `Reject the complaint for order ${orderNumber}? The order will remain marked as Delivered.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'accept' ? 'Accept' : 'Reject',
          style: action === 'accept' ? 'default' : 'destructive',
          onPress: async () => {
            setResolvingComplaintId(orderId);
            try {
              await resolveComplaint(orderId, action);
              Alert.alert('Done', action === 'accept' ? 'Refund approved. Customer notified.' : 'Complaint rejected. Customer notified.');
              fetchOrders();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to resolve complaint');
            } finally {
              setResolvingComplaintId(null);
            }
          },
        },
      ]
    );
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
    // Cancelling is only allowed while the order is still Pending.
    const canCancel = item.status === "PENDING";
    const deliveryStatus = deliveryStatuses[item.id];
    // SHIPPED needs a rider pickup; DELIVERED needs the rider to have completed delivery.
    const canShip = deliveryStatus ? PICKED_UP_DELIVERY_STATES.includes(deliveryStatus) : false;
    const canDeliver = deliveryStatus === "delivered";
    const nextStatus = getNextStatus(item.status);
    const shipBlocked = nextStatus === "SHIPPED" && !canShip;
    const deliverBlocked = nextStatus === "DELIVERED" && !canDeliver;
    const progressBlocked = shipBlocked || deliverBlocked;

    return (
      <TouchableOpacity style={[styles.orderCard, isPending && styles.pendingOrderCard]}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{(item.orderNumber || item.id).slice(-8).toUpperCase()}</Text>
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
                style={[styles.actionButton, styles.progressButton, progressBlocked && { opacity: 0.4 }]}
                onPress={() => {
                  if (shipBlocked) {
                    Alert.alert(
                      "Rider hasn't picked up yet",
                      "You can mark this order as Shipped only after a rider has been assigned and has collected the package."
                    );
                    return;
                  }
                  if (deliverBlocked) {
                    Alert.alert(
                      "Rider hasn't delivered yet",
                      "You can mark this order as Delivered only after the rider completes the delivery."
                    );
                    return;
                  }
                  confirmStatusChange(item.id, item.status);
                }}
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

        {/* Product complaint — manager reviews and accepts/rejects the refund request */}
        {isManager && item.status === "REFUND_REQUESTED" && item.isComplaint && (
          <View style={styles.complaintBox}>
            <View style={styles.complaintHeaderRow}>
              <Ionicons name="alert-circle" size={16} color="#B45309" />
              <Text style={styles.complaintTitle}>Product Complaint</Text>
            </View>
            <Text style={styles.complaintReason}>
              {item.cancellationReason || "The customer reported an issue with this delivered order."}
            </Text>
            <Text style={styles.complaintHint}>
              The customer should return the product to the warehouse. Accept to approve the refund, or reject to decline.
            </Text>
            <View style={styles.complaintActions}>
              <TouchableOpacity
                style={[styles.complaintAcceptBtn, resolvingComplaintId === item.id && { opacity: 0.6 }]}
                disabled={resolvingComplaintId === item.id}
                onPress={() => handleResolveComplaint(item.id, item.orderNumber, 'accept')}
              >
                <Ionicons name="checkmark-circle" size={16} color="#FFFFFF" />
                <Text style={styles.complaintAcceptText}>Accept Refund</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.complaintRejectBtn, resolvingComplaintId === item.id && { opacity: 0.6 }]}
                disabled={resolvingComplaintId === item.id}
                onPress={() => handleResolveComplaint(item.id, item.orderNumber, 'reject')}
              >
                <Ionicons name="close" size={16} color="#DC2626" />
                <Text style={styles.complaintRejectText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Dispatch Rider appears only once the order is PROCESSING; delivery
            status keeps showing through SHIPPED. */}
        {["PROCESSING", "SHIPPED"].includes(item.status) && (
          <View style={styles.dispatchSection}>
            {deliveryStatus ? (
              <>
                <View style={styles.deliveryStatusRow}>
                  <Ionicons name="bicycle" size={14} color="#00002E" />
                  <Text style={styles.deliveryStatusText}>
                    {DELIVERY_LABEL[deliveryStatus] ?? deliveryStatus}
                  </Text>
                </View>
                {canShip && item.status !== "SHIPPED" && (
                  <View style={styles.readyToShipBox}>
                    <Ionicons name="cube" size={14} color="#15803D" />
                    <Text style={styles.readyToShipText}>
                      Rider picked up the package — tap the → button above to mark this order Shipped.
                    </Text>
                  </View>
                )}
              </>
            ) : item.status === "PROCESSING" ? (
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
            ) : null}
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
          // Complaints filter is manager-only (post-delivery complaints go to the manager).
          data={statusFilters.filter((f) => f !== "REFUND_REQUESTED" || isManager)}
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
                {FILTER_LABELS[item] ?? item}
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
              onRefresh={() => refetch()}
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
  readyToShipBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  readyToShipText: {
    flex: 1,
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },
  complaintBox: {
    marginTop: 12,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
  },
  complaintHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  complaintTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B45309",
  },
  complaintReason: {
    fontSize: 14,
    color: "#92400E",
  },
  complaintHint: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 4,
  },
  complaintActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  complaintAcceptBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 10,
  },
  complaintAcceptText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  complaintRejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingVertical: 10,
  },
  complaintRejectText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
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
  shopLocationLoading: {
    minHeight: 82,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#F9FAFB",
    marginBottom: 10,
  },
  shopLocationLoadingText: { fontSize: 13, color: "#6B7280" },
  fixedShopCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    marginBottom: 10,
  },
  fixedShopIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#DBEAFE",
  },
  fixedShopCopy: { flex: 1 },
  fixedShopTitle: { fontSize: 13, lineHeight: 18, fontWeight: "700", color: "#111827" },
  fixedShopAddress: { fontSize: 12, lineHeight: 17, color: "#4B5563", marginTop: 2 },
  fixedShopCoords: { fontSize: 11, lineHeight: 16, color: "#6B7280", marginTop: 2 },
  editShopBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#FFF7ED",
  },
  shopSetupCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 10,
    backgroundColor: "#FFF7ED",
    marginBottom: 10,
  },
  shopSetupTitle: { fontSize: 14, lineHeight: 20, fontWeight: "700", color: "#111827" },
  shopSetupText: { fontSize: 12, lineHeight: 18, color: "#6B7280", marginTop: 2, marginBottom: 10 },
  shopSetupActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8 },
  shopSetupCancel: {
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    backgroundColor: "#FFF",
  },
  shopSetupCancelText: { fontSize: 13, fontWeight: "700", color: "#4B5563" },
  saveShopBtn: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#00002E",
  },
  saveShopBtnText: { fontSize: 13, fontWeight: "700", color: "#FFF" },
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
  savedLocationLabel: { fontSize: 10, color: "#166534", fontWeight: "700", marginBottom: 3 },
  customerMapPreview: {
    width: "100%",
    height: 170,
    borderRadius: 8,
    marginTop: 8,
  },
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



