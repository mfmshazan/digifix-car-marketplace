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
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import MapView, { AnimatedRegion, Marker, Polyline } from "react-native-maps";
import { getCustomerOrders, cancelOrder, getRiderLiveLocation, Order } from "../../src/api/orders";
import { submitReviews } from "../../src/api/reviews";
import { connectSocket } from "../../src/lib/socket";
import { loginOneSignal } from "../../src/lib/onesignal";
import { formatCurrency } from "../../src/lib/currency";
import { getToken } from "../../src/api/storage";

// Order badge colors are reused across the list, the tracking stepper, and socket updates.
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
    case "REFUND_REQUESTED":
      return "#FF5722";
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

type Coordinate = { latitude: number; longitude: number };
type RoadRoute = {
  provider: string;
  coordinates: Coordinate[];
  distanceMeters: number;
  durationSeconds: number;
  etaMinutes: number;
  generatedAt: string;
};
const DELIVERY_STEPS = [
  { key: "pending", title: "Placed" },
  { key: "confirmed", title: "Confirmed" },
  { key: "processing", title: "Processing" },
  { key: "shipped", title: "Shipped" },
  { key: "delivered", title: "Delivered" },
];

const RIDER_DELIVERY_STEPS = [
  { key: "assigned", title: "Assigned" },
  { key: "accepted", title: "Accepted" },
  { key: "arrived_at_pickup", title: "At Shop" },
  { key: "picked_up", title: "Picked Up" },
  { key: "in_transit", title: "En Route" },
  { key: "arrived_at_dropoff", title: "Arrived" },
  { key: "delivered", title: "Delivered" },
];

const RIDER_DELIVERY_STEP_KEYS = new Set(
  RIDER_DELIVERY_STEPS.map((step) => step.key)
);

// Labels shown in the tracking card's status heading (detailed rider step labels)
const DELIVERY_STATUS_LABELS: Record<string, string> = {
  // Order-level statuses (from DB)
  pending: "Order Placed",
  confirmed: "Order Confirmed",
  processing: "Preparing Your Order",
  shipped: "On Its Way to You",
  delivered: "Delivered!",
  cancelled: "Order Cancelled",
  failed: "Delivery Failed",
  refund_requested: "Refund Under Review",
  // Detailed rider steps (from riderStep field in socket payload)
  accepted: "Rider Accepted",
  arrived_at_pickup: "Rider at Shop",
  picked_up: "Package Collected",
  in_transit: "On the Way",
  arrived_at_dropoff: "Rider at Your Door",
  available: "Finding Rider",
  assigned: "Rider Assigned",
};

// Maps rider sub-steps to the correct stepper step key
// so the 5-step progress bar always shows the right position.
// Mirrors the backend userFacingStatusMap exactly.
const riderStepToStepperKey = (status: string): string => {
  const s = status.toLowerCase();
  switch (s) {
    case 'accepted':
    case 'arrived_at_pickup':
    case 'processing':
      return 'processing';          // Rider collecting from shop → Processing
    case 'picked_up':
    case 'in_transit':
    case 'arrived_at_dropoff':
    case 'shipped':
      return 'shipped';             // Package physically on its way → Shipped
    case 'delivered':
      return 'delivered';
    case 'confirmed':
      return 'confirmed';
    case 'pending':
    default:
      return 'pending';
  }
};

const normalizeDeliveryStatus = (status: string | null | undefined) =>
  String(status || "pending").trim().toLowerCase();

const formatEta = (minutes: number | null) => {
  if (minutes === null) return "GPS pending";
  if (minutes <= 1) return "Arriving now";
  if (minutes < 60) return `${Math.ceil(minutes)} min`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.ceil(minutes % 60);
  return `${hours}h ${mins}m`;
};

const OrderStepper = ({ currentStatus, riderStep }: { currentStatus: string; riderStep?: string }) => {
  const normalizedRiderStep = normalizeDeliveryStatus(riderStep);
  const showsRiderProgress = RIDER_DELIVERY_STEP_KEYS.has(normalizedRiderStep);
  const steps = showsRiderProgress ? RIDER_DELIVERY_STEPS : DELIVERY_STEPS;
  const stepperKey = showsRiderProgress
    ? normalizedRiderStep
    : riderStepToStepperKey(currentStatus);
  let currentIndex = steps.findIndex((s) => s.key === stepperKey);
  if (currentIndex === -1) currentIndex = 0;

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
            <View
              style={[
                styles.stepWrapper,
                showsRiderProgress && styles.riderStepWrapper,
              ]}
            >
              <View
                style={[
                  styles.stepCircle,
                  showsRiderProgress && styles.riderStepCircle,
                  isCompleted && styles.stepCircleCompleted,
                  isActive && styles.stepCircleActive,
                  isInactive && styles.stepCircleInactive,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    showsRiderProgress && styles.riderStepNumber,
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
                  showsRiderProgress && styles.riderStepLabel,
                  (isCompleted || isActive) ? styles.stepLabelActive : styles.stepLabelInactive,
                ]}
                numberOfLines={showsRiderProgress ? 2 : 1}
              >
                {step.title}
              </Text>
            </View>

            {/* Connecting Line */}
            {!isLast && (
              <View
                style={[
                  styles.lineWrapper,
                  showsRiderProgress && styles.riderLineWrapper,
                ]}
              >
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
                      showsRiderProgress && styles.riderLineAnimated,
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
  const trackingMapRef = React.useRef<MapView | null>(null);
  const hasFitTrackingMap = React.useRef(false);
  const trackingOrderRef = React.useRef<Order | null>(null);
  const animatedRiderCoordinate = React.useRef(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0,
      longitudeDelta: 0,
    })
  ).current;
  const hasAnimatedRiderLocation = React.useRef(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  // Cancellation modal state
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionMenuOrderId, setActionMenuOrderId] = useState<string | null>(null);

  // Rating modal state
  const [ratingOrder, setRatingOrder] = useState<Order | null>(null);
  const [productRating, setProductRating] = useState<number>(0);
  const [productComment, setProductComment] = useState("");
  const [driverRating, setDriverRating] = useState<number>(0);
  const [driverComment, setDriverComment] = useState("");
  const [selectedDriverTags, setSelectedDriverTags] = useState<string[]>([]);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [deliveryRoute, setDeliveryRoute] = useState<{
    pickup: { latitude: number; longitude: number; address?: string };
    dropoff: { latitude: number; longitude: number; address?: string };
  } | null>(null);
  const [roadRoute, setRoadRoute] = useState<RoadRoute | null>(null);
  const [roadRouteError, setRoadRouteError] = useState<string | null>(null);
  const [liveDeliveryStatus, setLiveDeliveryStatus] = useState<string | null>(null);
  const [liveRiderStep, setLiveRiderStep] = useState<string | null>(null); // Detailed rider step for the label
  const [lastTrackingUpdate, setLastTrackingUpdate] = useState<Date | null>(null);

  const activeDeliveryStatus = normalizeDeliveryStatus(liveDeliveryStatus || trackingOrder?.status);
  const riderVisualStatus = normalizeDeliveryStatus(
    liveRiderStep || liveDeliveryStatus || trackingOrder?.status
  );
  const displayedRiderLocation = React.useMemo(() => {
    const customerTrackableStatuses = [
      "picked_up",
      "in_transit",
      "arrived_at_dropoff",
      "delivered",
    ];
    return customerTrackableStatuses.includes(riderVisualStatus)
      ? riderLocation
      : null;
  }, [riderLocation, riderVisualStatus]);
  const etaMinutes = roadRoute?.etaMinutes ?? null;
  const etaLabel = formatEta(etaMinutes);
  // Show detailed rider step label if available, otherwise fall back to order status label
  const activeDeliveryLabel =
    (liveRiderStep && DELIVERY_STATUS_LABELS[liveRiderStep]) ||
    DELIVERY_STATUS_LABELS[activeDeliveryStatus] ||
    formatStatus(activeDeliveryStatus);
  const locationAgeSeconds = lastTrackingUpdate
    ? Math.max(0, Math.floor((Date.now() - lastTrackingUpdate.getTime()) / 1000))
    : null;
  const isLocationStale = locationAgeSeconds === null || locationAgeSeconds > 30;
  const lastUpdatedLabel = locationAgeSeconds === null
    ? "waiting for GPS"
    : locationAgeSeconds < 5
      ? "just now"
      : locationAgeSeconds < 60
        ? `${locationAgeSeconds}s ago`
        : `${Math.floor(locationAgeSeconds / 60)}m ago`;
  const fallbackRouteCoordinates = React.useMemo(() => {
    if (!displayedRiderLocation || !deliveryRoute) return [];

    const nextStop = ["accepted", "arrived_at_pickup"].includes(activeDeliveryStatus)
      ? deliveryRoute.pickup
      : deliveryRoute.dropoff;

    return [displayedRiderLocation, nextStop];
  }, [activeDeliveryStatus, deliveryRoute, displayedRiderLocation]);

  useEffect(() => {
    trackingOrderRef.current = trackingOrder;
  }, [trackingOrder]);

  useEffect(() => {
    if (!displayedRiderLocation) return;

    if (!hasAnimatedRiderLocation.current) {
      animatedRiderCoordinate.setValue({
        latitude: displayedRiderLocation.latitude,
        longitude: displayedRiderLocation.longitude,
        latitudeDelta: 0,
        longitudeDelta: 0,
      });
      hasAnimatedRiderLocation.current = true;
      return;
    }

    (animatedRiderCoordinate.timing as any)({
      latitude: displayedRiderLocation.latitude,
      longitude: displayedRiderLocation.longitude,
      duration: 2500,
      useNativeDriver: false,
    }).start();
  }, [animatedRiderCoordinate, displayedRiderLocation]);

  // Poll rider's GPS every few seconds while the tracking modal is open.
  useEffect(() => {
    if (!trackingOrder) {
      setRiderLocation(null);
      setDeliveryRoute(null);
      setRoadRoute(null);
      setRoadRouteError(null);
      setLiveDeliveryStatus(null);
      setLiveRiderStep(null);
      setLastTrackingUpdate(null);
      hasFitTrackingMap.current = false;
      hasAnimatedRiderLocation.current = false;
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await getRiderLiveLocation(trackingOrder.id);
        if (cancelled) return;
        if (res?.success && res.data?.riderLocation) {
          setRiderLocation(res.data.riderLocation);
          setLastTrackingUpdate(
            res.data.riderLocation.recordedAt
              ? new Date(res.data.riderLocation.recordedAt)
              : null
          );
        }
        if (res?.success && res.data?.route?.pickup && res.data?.route?.dropoff) {
          setDeliveryRoute(res.data.route);
        }
        if (res?.success && res.data?.roadRoute?.coordinates?.length >= 2) {
          setRoadRoute(res.data.roadRoute);
          setRoadRouteError(null);
        } else if (res?.success) {
          setRoadRoute(null);
          setRoadRouteError(
            res.data?.routeError ||
            'A real road route is not available for these coordinates yet.'
          );
        }
        if (res?.success && res.data?.status) {
          setLiveDeliveryStatus(res.data.status);
          setLiveRiderStep(res.data.status);
        }
      } catch {
        // silently ignore network errors between polls
      }
    };

    poll();
    const intervalId = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [trackingOrder]);

  useEffect(() => {
    if (!trackingOrder || !deliveryRoute || !trackingMapRef.current || hasFitTrackingMap.current) return;

    const coordinates = roadRoute?.coordinates?.length
      ? roadRoute.coordinates
      : [
        deliveryRoute.pickup,
        ...(displayedRiderLocation ? [displayedRiderLocation] : []),
        deliveryRoute.dropoff,
      ];

    const timeoutId = setTimeout(() => {
      trackingMapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
      hasFitTrackingMap.current = true;
    }, 250);

    return () => clearTimeout(timeoutId);
  }, [trackingOrder, deliveryRoute, displayedRiderLocation, roadRoute]);

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

        // Register this device for push so order updates reach the customer
        // even when the app is closed (backend targets by this user id).
        loginOneSignal(userId);

        const socket = connectSocket(token);

        const handleStatusUpdate = (payload: {
          orderId: string;
          deliveryId?: number;
          riderId?: number | null;
          orderNumber?: string;
          status: string;
          riderStep?: string;    // Detailed rider step from the backend
          description?: string;
        }) => {
          // Update the order's main status (user-facing: SHIPPED, DELIVERED, etc.)
          setOrders((prev) =>
            prev.map((o) =>
              String(o.id) === String(payload.orderId)
                ? {
                    ...o,
                    status: payload.status,
                    ...(payload.deliveryId
                      ? {
                          riderDeliveryJobs: [
                            {
                              ...(o.riderDeliveryJobs?.[0] || {}),
                              id: payload.deliveryId,
                              status: payload.riderStep,
                              partnerId: payload.riderId,
                            },
                          ],
                        }
                      : {}),
                  }
                : o
            )
          );
          // Only change the open tracking panel when this event belongs to it.
          if (String(trackingOrderRef.current?.id) === String(payload.orderId)) {
            if (payload.riderStep) {
              setLiveRiderStep(payload.riderStep);
            }
            if (payload.status) {
              setLiveDeliveryStatus(payload.status);
            }
          }
        };

        socket.on('orderStatusUpdated', handleStatusUpdate);

        const handleRiderLocation = (payload: {
          orderId: string;
          deliveryId: number;
          status?: string;
          location?: {
            latitude: number;
            longitude: number;
            accuracy?: number | null;
            recordedAt?: string;
          };
        }) => {
          const currentTrackingOrder = trackingOrderRef.current;
          if (
            !currentTrackingOrder ||
            String(payload.orderId) !== String(currentTrackingOrder.id)
          ) {
            return;
          }

          if (
            payload.location &&
            Number.isFinite(Number(payload.location.latitude)) &&
            Number.isFinite(Number(payload.location.longitude))
          ) {
            setRiderLocation({
              latitude: Number(payload.location.latitude),
              longitude: Number(payload.location.longitude),
            });
            setLastTrackingUpdate(
              payload.location.recordedAt
                ? new Date(payload.location.recordedAt)
                : new Date()
            );
          }

          if (payload.status) {
            setLiveRiderStep(payload.status);
          }
        };

        socket.on('riderLocationUpdated', handleRiderLocation);

        // Listen for cancellation approval/rejection so the UI updates without manual refresh
        const handleCancellationApproved = (payload: { orderId: string; status: string }) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.orderId ? { ...o, status: payload.status } : o
            )
          );
        };

        const handleCancellationRejected = (payload: { orderId: string; status: string; message?: string }) => {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === payload.orderId ? { ...o, status: payload.status } : o
            )
          );
          Alert.alert('Cancellation Rejected', payload.message || 'Your cancellation request was rejected by the admin.');
        };

        socket.on('cancellationApproved', handleCancellationApproved);
        socket.on('cancellationRejected', handleCancellationRejected);

        return () => {
          socket.off('orderStatusUpdated', handleStatusUpdate);
          socket.off('riderLocationUpdated', handleRiderLocation);
          socket.off('cancellationApproved', handleCancellationApproved);
          socket.off('cancellationRejected', handleCancellationRejected);
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
    const normalizedStatus = item.status.toUpperCase();
    const isDelivered = normalizedStatus === 'DELIVERED';
    const isRefundRequested = normalizedStatus === 'REFUND_REQUESTED';
    const canRequestAction = ['PENDING', 'CONFIRMED', 'DELIVERED'].includes(normalizedStatus);
    const isMenuOpen = actionMenuOrderId === item.id;
    const hasReviews = item.reviews && item.reviews.length > 0;
    const deliveryJob = item.riderDeliveryJobs?.[0];
    const canTrackOrder = Boolean(
      deliveryJob?.partnerId &&
      !['awaiting_dispatch', 'pending', 'available', 'failed', 'cancelled'].includes(
        String(deliveryJob.status || '').toLowerCase()
      )
    );

    return (
      <TouchableOpacity style={[styles.orderCard, isMenuOpen && styles.orderCardMenuOpen]}>
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
                    <Text style={styles.itemPriceQty}>Qty: {orderItem.quantity} × {formatCurrency(orderItem.price)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.orderFooter}>
          <Text style={styles.orderItems}>{itemCount} item(s)</Text>
          <Text style={styles.orderTotal}>{formatCurrency(item.total)}</Text>
        </View>

        {isDelivered && (
          <View style={styles.deliveredHighlight}>
            <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
            <View style={styles.deliveredHighlightTextWrap}>
              <Text style={styles.deliveredHighlightTitle}>Item Delivered</Text>
              <Text style={styles.deliveredHighlightSubtitle}>
                If you have any concerns, please raise a complaint for the store to review.
              </Text>
            </View>
          </View>
        )}

        {hasReviews && item.reviews?.[0] && (
          <View style={styles.reviewSection}>
            <View style={styles.reviewHeader}>
              <Text style={styles.reviewTitle}>Your Rating</Text>
              <View style={styles.reviewStars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= (item.reviews?.[0]?.rating || 0) ? "star" : "star-outline"}
                    size={14}
                    color="#FF6B35"
                  />
                ))}
              </View>
            </View>
            {item.reviews?.[0]?.comment ? (
              <Text style={styles.reviewComment}>“{item.reviews?.[0]?.comment}”</Text>
            ) : null}

            {item.reviews?.[0]?.replies && item.reviews?.[0].replies.length > 0 && (
              <View style={styles.sellerReplyBox}>
                <Text style={styles.sellerReplyTitle}>Seller Reply</Text>
                <Text style={styles.sellerReplyText}>
                  {item.reviews?.[0].replies[0].replyText}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.actionRow}>
          {canTrackOrder && (
            <TouchableOpacity
              style={[styles.trackButton, { flex: 1 }]}
              onPress={() => {
                setActionMenuOrderId(null);
                setTrackingOrder(item);
              }}
            >
              <Ionicons name="location" size={16} color="#FF6B35" />
              <Text style={styles.trackButtonText}>
                {isDelivered && !hasReviews ? "Track" : "Track Order"}
              </Text>
            </TouchableOpacity>
          )}

          {isDelivered && !hasReviews && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => {
                setActionMenuOrderId(null);
                setRatingOrder(item);
              }}
            >
              <Ionicons name="star" size={16} color="#FFFFFF" />
              <Text style={styles.rateButtonText}>Rate Order</Text>
            </TouchableOpacity>
          )}
          {/* Overflow actions keep Track Order as the primary horizontal action. */}
          {canRequestAction && (
            <View style={styles.moreActionsWrap}>
              <TouchableOpacity
                style={styles.moreActionsButton}
                onPress={() => setActionMenuOrderId(isMenuOpen ? null : item.id)}
              >
                <Ionicons name="ellipsis-vertical" size={18} color="#1A1A2E" />
              </TouchableOpacity>

              {isMenuOpen && (
                <View style={styles.moreActionsMenu}>
                  <TouchableOpacity
                    style={styles.moreActionItem}
                    onPress={() => {
                      setActionMenuOrderId(null);
                      setCancellingOrder(item);
                      setCancelReason("");
                    }}
                  >
                    <Ionicons
                      name={isDelivered ? "alert-circle-outline" : "close-circle-outline"}
                      size={16}
                      color={isDelivered ? "#B45309" : "#EF4444"}
                    />
                    <Text style={[styles.moreActionText, isDelivered && styles.moreActionTextComplaint]}>
                      {isDelivered ? 'Raise Complaint' : 'Cancel Order'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>
        {/* Tells the customer their request is queued so they don't submit duplicates */}
        {isRefundRequested && (
          <View style={styles.refundRequestedBadge}>
            <Ionicons name="time-outline" size={14} color="#FF5722" />
            <Text style={styles.refundRequestedText}>Complaint Under Review</Text>
          </View>
        )}
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

          {deliveryRoute ? (
            <MapView
              ref={trackingMapRef}
              style={styles.map}
              initialRegion={{
                latitude: displayedRiderLocation?.latitude ?? deliveryRoute.pickup.latitude,
                longitude: displayedRiderLocation?.longitude ?? deliveryRoute.pickup.longitude,
                latitudeDelta: 0.035,
                longitudeDelta: 0.035,
              }}
            >
            {deliveryRoute && (
              <>
                {roadRoute && roadRoute.coordinates.length >= 2 && (
                  <Polyline
                    coordinates={roadRoute.coordinates}
                    strokeColor="#FF6B35"
                    strokeWidth={5}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                {!roadRoute && fallbackRouteCoordinates.length >= 2 && (
                  <Polyline
                    coordinates={fallbackRouteCoordinates}
                    strokeColor="#FF6B35"
                    strokeWidth={4}
                    lineDashPattern={[10, 7]}
                    lineCap="round"
                    lineJoin="round"
                  />
                )}
                <Marker
                  coordinate={deliveryRoute.pickup}
                  title="Pickup"
                  description={deliveryRoute.pickup.address || "Shop pickup location"}
                  pinColor="#2563EB"
                />
                <Marker
                  coordinate={deliveryRoute.dropoff}
                  title="Customer"
                  description={deliveryRoute.dropoff.address || "Customer delivery location"}
                  pinColor="#16A34A"
                />
              </>
            )}
            {displayedRiderLocation && (
              <Marker.Animated
                coordinate={animatedRiderCoordinate as any}
                title="Rider Location"
                description={`ETA ${etaLabel}`}
              >
                <View style={styles.markerContainer}>
                  <Ionicons name="bicycle" size={24} color="#FFF" />
                </View>
              </Marker.Animated>
            )}
            </MapView>
          ) : (
            <View style={[styles.map, styles.mapLoadingState]}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.noRiderText}>Loading delivery locations...</Text>
            </View>
          )}

          {!displayedRiderLocation && (
            <View style={styles.noRiderBanner} pointerEvents="none">
              <Ionicons name="location-outline" size={32} color="#999" />
              <Text style={styles.noRiderText}>Waiting for rider location…</Text>
            </View>
          )}

          {displayedRiderLocation && isLocationStale && (
            <View style={styles.routeErrorBanner} pointerEvents="none">
              <Ionicons name="cloud-offline-outline" size={18} color="#B45309" />
              <Text style={styles.routeErrorText}>
                Location temporarily unavailable. Last update: {lastUpdatedLabel}.
              </Text>
            </View>
          )}

          {roadRouteError && displayedRiderLocation && (
            <View style={styles.routeErrorBanner} pointerEvents="none">
              <Ionicons name="warning-outline" size={18} color="#B45309" />
              <Text style={styles.routeErrorText}>{roadRouteError}</Text>
            </View>
          )}

          <View style={styles.trackingInfoCard}>
            <View style={styles.trackingInfoHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.trackingStatusText}>{activeDeliveryLabel}</Text>
                <Text style={styles.trackingOrderText}>Order {trackingOrder?.orderNumber}</Text>
              </View>
              <View style={styles.etaPill}>
                <Ionicons name="time-outline" size={14} color="#FF6B35" />
                <Text style={styles.etaText}>{etaLabel}</Text>
              </View>
            </View>
            <View style={styles.liveMetaRow}>
              <View style={[styles.liveDot, isLocationStale && { backgroundColor: '#D97706' }]} />
              <Text style={styles.liveMetaText}>Rider GPS tracking</Text>
              <Text style={styles.liveMetaText}>Updated {lastUpdatedLabel}</Text>
            </View>
            <OrderStepper currentStatus={activeDeliveryStatus} riderStep={liveRiderStep ?? undefined} />
          </View>
        </View>
      </Modal>

      {/* Cancellation Reason Modal — customer must explain why they want to cancel */}
      <Modal
        visible={!!cancellingOrder}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCancellingOrder(null)}
      >
        <View style={styles.cancelModalOverlay}>
          <View style={styles.cancelModalContent}>
            <View style={styles.cancelModalHeader}>
              <Text style={styles.cancelModalTitle}>
                {cancellingOrder?.status?.toUpperCase() === 'DELIVERED' ? 'Raise Complaint' : 'Cancel Order'}
              </Text>
              <TouchableOpacity onPress={() => setCancellingOrder(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.cancelModalSubtitle}>
              Order: {cancellingOrder?.orderNumber}
            </Text>

            <Text style={styles.cancelModalLabel}>
              {cancellingOrder?.status?.toUpperCase() === 'DELIVERED'
                ? 'Please describe your concern clearly (this goes to the store):'
                : 'Please provide a reason for your request:'}
            </Text>

            <TextInput
              style={styles.cancelReasonInput}
              multiline
              numberOfLines={4}
              placeholder="Enter your reason here (minimum 5 characters)..."
              placeholderTextColor="#999"
              value={cancelReason}
              onChangeText={setCancelReason}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[
                styles.cancelSubmitButton,
                (cancelReason.trim().length < 5 || isCancelling) && styles.cancelSubmitDisabled
              ]}
              disabled={cancelReason.trim().length < 5 || isCancelling}
              onPress={async () => {
                if (!cancellingOrder) return;
                setIsCancelling(true);
                try {
                  await cancelOrder(cancellingOrder.id, cancelReason.trim());
                  // Update local state immediately so the badge shows
                  setOrders(prev =>
                    prev.map(o =>
                      o.id === cancellingOrder.id ? { ...o, status: 'REFUND_REQUESTED' } : o
                    )
                  );
                  setCancellingOrder(null);
                  Alert.alert(
                    'Request Submitted',
                    cancellingOrder.status?.toUpperCase() === 'DELIVERED'
                      ? 'Your complaint has been sent to the store for review.'
                      : 'Your cancellation request has been sent to the admin for review.'
                  );
                } catch (err: any) {
                  Alert.alert('Error', err.message || 'Failed to submit cancellation request.');
                } finally {
                  setIsCancelling(false);
                }
              }}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.cancelSubmitText}>Submit Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rating & Review Modal */}
      <Modal
        visible={!!ratingOrder}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setRatingOrder(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.ratingModalOverlay}
        >
          <View style={[styles.ratingModalContent, { flexShrink: 1, maxHeight: '90%' }]}>
            <View style={styles.ratingModalHeader}>
              <Text style={styles.ratingModalTitle}>Rate Your Order</Text>
              <TouchableOpacity onPress={() => setRatingOrder(null)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <Text style={styles.ratingModalSubtitle}>
              Order: {ratingOrder?.orderNumber}
            </Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
            >
              {/* 1. PRODUCT / PART CARD */}
              <View style={styles.ratingSectionCard}>
                <Text style={styles.ratingSectionTitle}>Rate the Items & Shop</Text>
                <Text style={styles.ratingSectionDesc}>How satisfied are you with the purchased item(s)?</Text>

                {/* Render order items preview */}
                <View style={styles.itemsPreviewRow}>
                  {ratingOrder?.items?.slice(0, 3).map((orderItem: any, idx: number) => {
                    const itemImage = orderItem.productImage || orderItem.product?.images?.[0];
                    return (
                      <View key={idx} style={styles.ratingItemPreview}>
                        {itemImage ? (
                          <Image source={{ uri: itemImage }} style={styles.ratingItemImage} />
                        ) : (
                          <View style={styles.ratingItemImagePlaceholder}>
                            <Ionicons name="car-sport-outline" size={16} color="#999" />
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {ratingOrder?.items && ratingOrder.items.length > 3 && (
                    <Text style={styles.moreItemsText}>+{ratingOrder.items.length - 3} more</Text>
                  )}
                </View>

                {/* Stars */}
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setProductRating(star)}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={productRating >= star ? "star" : "star-outline"}
                        size={32}
                        color={productRating >= star ? "#FFD700" : "#CCC"}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.ratingInput}
                  multiline
                  numberOfLines={3}
                  placeholder="Tell us about the quality of the item(s)..."
                  placeholderTextColor="#999"
                  value={productComment}
                  onChangeText={setProductComment}
                  textAlignVertical="top"
                />
              </View>

              {/* 2. DRIVER CARD (if driver is assigned) */}
              {(() => {
                const driverJob = ratingOrder?.riderDeliveryJobs?.[0];
                const driver = driverJob?.partner;
                if (!driver) return null;

                const tags = ["Fast", "Careful", "Polite", "On Time", "Friendly"];

                return (
                  <View style={styles.ratingSectionCard}>
                    <Text style={styles.ratingSectionTitle}>Rate your Driver</Text>
                    <Text style={styles.ratingSectionDesc}>How was your delivery by {driver.fullName}?</Text>

                    <View style={styles.driverProfileRow}>
                      {driver.profilePhotoUrl ? (
                        <Image source={{ uri: driver.profilePhotoUrl }} style={styles.driverAvatar} />
                      ) : (
                        <View style={styles.driverAvatarPlaceholder}>
                          <Ionicons name="person" size={24} color="#00002E" />
                        </View>
                      )}
                      <Text style={styles.driverName}>{driver.fullName}</Text>
                    </View>

                    {/* Driver Stars */}
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <TouchableOpacity
                          key={star}
                          onPress={() => setDriverRating(star)}
                          style={styles.starButton}
                        >
                          <Ionicons
                            name={driverRating >= star ? "star" : "star-outline"}
                            size={32}
                            color={driverRating >= star ? "#FFD700" : "#CCC"}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Tags selection */}
                    <View style={styles.tagsContainer}>
                      {tags.map((tag) => {
                        const isSelected = selectedDriverTags.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            style={[
                              styles.tagButton,
                              isSelected && styles.tagButtonSelected
                            ]}
                            onPress={() => {
                              if (isSelected) {
                                setSelectedDriverTags(prev => prev.filter(t => t !== tag));
                              } else {
                                setSelectedDriverTags(prev => [...prev, tag]);
                              }
                            }}
                          >
                            <Text
                              style={[
                                styles.tagText,
                                isSelected && styles.tagTextSelected
                              ]}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    <TextInput
                      style={styles.ratingInput}
                      multiline
                      numberOfLines={2}
                      placeholder="Optional comment about delivery..."
                      placeholderTextColor="#999"
                      value={driverComment}
                      onChangeText={setDriverComment}
                      textAlignVertical="top"
                    />
                  </View>
                );
              })()}

              {/* Submit button */}
              <TouchableOpacity
                style={[
                  styles.ratingSubmitButton,
                  (!productRating || isSubmittingReview) && styles.ratingSubmitDisabled
                ]}
                disabled={!productRating || isSubmittingReview}
                onPress={async () => {
                  if (!ratingOrder) return;
                  setIsSubmittingReview(true);
                  try {
                    const reviewsToSubmit: import('../../src/api/reviews').ReviewPayload[] = [];

                    // 1. Submit product review (always required if modal opens)
                    const storeOwnerId = ratingOrder.salesmanId;
                    if (storeOwnerId) {
                      reviewsToSubmit.push({
                        targetId: storeOwnerId,
                        targetType: 'SELLER' as const,
                        rating: productRating,
                        comment: productComment.trim() || undefined
                      });
                    }

                    // 2. Submit product/car-part items reviews (each item inside the order)
                    if (ratingOrder.items && ratingOrder.items.length > 0) {
                      for (const orderItem of ratingOrder.items) {
                        // Determine whether this item is a car part or a regular product
                        if (orderItem.carPartId) {
                          // Car part — use CAR_PART targetType so reviewWorker updates CarPart.averageRating
                          reviewsToSubmit.push({
                            targetId: orderItem.carPartId,
                            targetType: 'CAR_PART' as const,
                            rating: productRating,
                            comment: productComment.trim() || undefined
                          });
                        } else if (orderItem.productId) {
                          // Regular product — keep as PRODUCT
                          reviewsToSubmit.push({
                            targetId: orderItem.productId,
                            targetType: 'PRODUCT' as const,
                            rating: productRating,
                            comment: productComment.trim() || undefined
                          });
                        }
                      }
                    }

                    // 3. Submit driver review (if driver exists and is rated)
                    const driver = ratingOrder.riderDeliveryJobs?.[0]?.partner;
                    if (driver && driverRating > 0) {
                      // Combine comment and tags
                      const combinedComment = [
                        selectedDriverTags.length > 0 ? `[Tags: ${selectedDriverTags.join(', ')}]` : '',
                        driverComment.trim()
                      ].filter(Boolean).join(' - ');

                      reviewsToSubmit.push({
                        targetId: driver.id.toString(),
                        targetType: 'DELIVERY_PARTNER' as const,
                        rating: driverRating,
                        comment: combinedComment || undefined
                      });
                    }

                    await submitReviews(ratingOrder.id, reviewsToSubmit);

                    Alert.alert('Thank You', 'Your feedback was submitted successfully!');
                    setRatingOrder(null);

                    // Reset rating states
                    setProductRating(0);
                    setProductComment("");
                    setDriverRating(0);
                    setDriverComment("");
                    setSelectedDriverTags([]);

                    // Refresh orders list
                    await fetchOrders();
                  } catch (err: any) {
                    Alert.alert('Error', err.message || 'Failed to submit reviews');
                  } finally {
                    setIsSubmittingReview(false);
                  }
                }}
              >
                {isSubmittingReview ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.ratingSubmitText}>Submit Reviews</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
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
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  orderCardMenuOpen: {
    zIndex: 1000,
    elevation: 20,
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
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  trackButtonFull: {
    flex: 1,
  },
  trackButtonText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  moreActionsWrap: {
    position: "relative",
  },
  moreActionsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  moreActionsMenu: {
    position: "absolute",
    top: 48,
    right: 0,
    minWidth: 160,
    backgroundColor: "#FFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    zIndex: 30,
  },
  moreActionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 8,
  },
  moreActionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  moreActionTextComplaint: {
    color: "#B45309",
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
  mapLoadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#F3F4F6",
  },
  markerContainer: {
    backgroundColor: "#FF6B35",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
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
    marginBottom: 10,
    gap: 12,
  },
  etaPill: {
    minWidth: 92,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FFF3EE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    gap: 5,
  },
  etaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FF6B35",
  },
  liveMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 16,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  liveMetaText: {
    flexShrink: 1,
    fontSize: 11,
    color: "#6B7280",
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
  },
  stepWrapper: {
    alignItems: "center",
    width: 36,
  },
  riderStepWrapper: {
    width: 28,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    marginBottom: 6,
    backgroundColor: "#FFF",
  },
  riderStepCircle: {
    width: 21,
    height: 21,
    borderRadius: 11,
    marginBottom: 5,
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
  riderStepNumber: {
    fontSize: 10,
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
    fontSize: 9,
    textAlign: "center",
  },
  riderStepLabel: {
    fontSize: 7.5,
    lineHeight: 9,
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
    height: 24,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  riderLineWrapper: {
    height: 21,
    paddingHorizontal: 1,
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
  riderLineAnimated: {
    left: 1,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 12,
    height: 44,
    marginTop: 8,
  },
  complaintButton: {
    backgroundColor: "#FEF3C7",
  },
  cancelButtonText: {
    color: "#EF4444",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  complaintButtonText: {
    color: "#B45309",
  },
  deliveredHighlight: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#ECFDF3",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  deliveredHighlightTextWrap: {
    flex: 1,
    marginLeft: 8,
  },
  deliveredHighlightTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 2,
  },
  deliveredHighlightSubtitle: {
    fontSize: 12,
    color: "#166534",
    lineHeight: 17,
  },
  refundRequestedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    height: 40,
    marginTop: 8,
  },
  refundRequestedText: {
    color: "#FF5722",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  cancelModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  cancelModalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  cancelModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cancelModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  cancelModalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  cancelModalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  cancelReasonInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#1A1A2E",
    minHeight: 100,
    marginBottom: 16,
    backgroundColor: "#F9FAFB",
  },
  cancelSubmitButton: {
    backgroundColor: "#EF4444",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelSubmitDisabled: {
    backgroundColor: "#FECACA",
  },
  cancelSubmitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  noRiderBanner: {
    position: "absolute",
    top: 112,
    left: 16,
    right: 16,
    minHeight: 54,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 14,
    paddingHorizontal: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  noRiderText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  routeErrorBanner: {
    position: "absolute",
    top: 112,
    left: 16,
    right: 16,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  routeErrorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    lineHeight: 18,
    color: "#92400E",
    fontWeight: "500",
  },
  rateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    height: 44,
    flex: 1,
    gap: 6,
  },
  rateButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  ratingModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  ratingModalScroll: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  ratingModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  ratingModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  ratingModalSubtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
  ratingSectionCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ratingSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00002E",
    marginBottom: 4,
  },
  ratingSectionDesc: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  itemsPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 6,
  },
  ratingItemPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#E2E8F0",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  ratingItemImage: {
    width: "100%",
    height: "100%",
  },
  ratingItemImagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  moreItemsText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginVertical: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    fontSize: 14,
    color: "#1A1A2E",
    minHeight: 60,
  },
  driverProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  driverAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  driverName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    marginVertical: 12,
  },
  tagButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  tagButtonSelected: {
    backgroundColor: "#FF6B35",
  },
  tagText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  tagTextSelected: {
    color: "#FFFFFF",
  },
  ratingSubmitButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  ratingSubmitDisabled: {
    backgroundColor: "#FFBD9D",
  },
  ratingSubmitText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  reviewSection: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reviewTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  reviewStars: {
    flexDirection: "row",
    gap: 2,
  },
  reviewComment: {
    fontSize: 14,
    color: "#1E293B",
    fontStyle: "italic",
    marginBottom: 8,
  },
  sellerReplyBox: {
    backgroundColor: "#EFF6FF",
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
    padding: 10,
    borderRadius: 6,
    marginTop: 4,
  },
  sellerReplyTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
    marginBottom: 4,
  },
  sellerReplyText: {
    fontSize: 13,
    color: "#1E3A8A",
    lineHeight: 18,
  },
});
