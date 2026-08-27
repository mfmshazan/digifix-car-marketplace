/**
 * Customer Home Screen — Vehicle Registration-Based Product Discovery
 *
 * Flow:
 *  1. Customer enters a vehicle registration number (e.g. ABC123)
 *  2. Backend resolves → VehicleModel → VehicleBrand + VehicleType
 *  3. All compatible Products are returned in one response
 *  4. Part Types section shows only categories that have compatible products
 *  5. Product name search filters within compatible products only
 *  6. Cart, wishlist, auth, orders, profile are unchanged
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Animated,
  Platform,
  StatusBar,
  Dimensions,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { wishlistApi } from "../../src/api/wishlist";
import { useCart } from "../../src/store/cartStore";
import { useVehicleStore } from "../../src/store/vehicleStore";
import {
  searchVehicleByRegistration,
  CompatibleProduct,
  CompatiblePartType,
} from "../../src/api/vehicle";
import { getProducts } from "../../src/api/products";
import { getCustomerOrders } from "../../src/api/orders";
import { formatCurrency } from "../../src/lib/currency";

// ─── Sample registration numbers (seeded data) — tap to try the search ───────
const samplePlates = [
  { reg: "ABC123", label: "Toyota Corolla" },
  { reg: "XYZ458", label: "Toyota Camry" },
  { reg: "QWE742", label: "Honda Civic" },
];

/** Shuffle a copy of the array (Fisher–Yates) */
const shuffleArray = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Full device width — each promo slide fills exactly one screen so only a
// single, centered card is visible at a time (no half-card peeking).
const SCREEN_WIDTH = Dimensions.get("window").width;

// Branded splash loading bar dimensions (track + sweeping segment).
const SPLASH_BAR_TRACK = 180;
const SPLASH_BAR_SEG = 62;
// Accent used on the white loading splash (logo, wordmark, progress bar).
const SPLASH_BLUE = "#2563EB";

// ─── Promotions (shown before vehicle is identified) ─────────────────────────
const promotions = [
  {
    id: "1",
    title: "Find Parts Fast",
    description: "Enter your vehicle registration number to see only parts that fit your car",
    gradient: ["#00002E", "#001060"],
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "On orders over $5,000",
    gradient: ["#1A1A1A", "#2D2D2D"],
  },
  {
    id: "3",
    title: "Genuine Parts Only",
    description: "Every part verified for quality and compatibility",
    gradient: ["#003399", "#0044CC"],
  },
];

// ─── Icon map for part-type categories ───────────────────────────────────────
const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Engine Parts":      "cog",
  Engine:              "cog",
  "Brake System":      "disc",
  Brakes:              "disc",
  Filters:             "filter",
  Electrical:          "flash",
  Suspension:          "car-sport",
  "Cooling System":    "water",
  "Exhaust System":    "cloud",
  Transmission:        "settings",
  "Body Parts":        "car",
  Lighting:            "bulb",
  Interior:            "tablet-portrait",
  Accessories:         "diamond",
};

const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap =>
  categoryIconMap[name] || "cube";

// ─── Component ───────────────────────────────────────────────────────────────
export default function CustomerHomeScreen() {
  // ── search state ──
  const [registrationInput, setRegistrationInput] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // ── vehicle / product state ──
  const { vehicleData, registrationNumber, setVehicleData, clearVehicle } =
    useVehicleStore();

  // ── UI filter state (all local — no extra API calls) ──
  const [selectedPartType, setSelectedPartType] =
    useState<CompatiblePartType | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState("");

  // ── modals ──
  const [selectedProduct, setSelectedProduct] =
    useState<CompatibleProduct | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ── wishlist ──
  const [wishlistedIds, setWishlistedIds] = useState<Set<string>>(new Set());

  // ── random/featured parts (shown before a vehicle is searched) ──
  const [featuredProducts, setFeaturedProducts] = useState<CompatibleProduct[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(false);
  const [isPersonalized, setIsPersonalized] = useState(false);

  // ── promotion carousel ──
  const [currentPromoIdx, setCurrentPromoIdx] = useState(0);
  const promoScrollRef = useRef<FlatList>(null);
  const promoTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const router = useRouter();
  const { addItem } = useCart();

  // ── slide-in animation for vehicle card ──
  const vehicleCardAnim = useRef(new Animated.Value(0)).current;

  // ── first-launch branded loading screen (login → loader → Home) ──
  const [initializing, setInitializing] = useState(true);
  const loaderFade = useRef(new Animated.Value(1)).current;
  const loaderSpin = useRef(new Animated.Value(0)).current;

  // ─────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Continuously spin the loader ring while the branded splash is visible.
    const spinLoop = Animated.loop(
      Animated.timing(loaderSpin, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      })
    );
    spinLoop.start();

    const start = Date.now();
    const MIN_SPLASH_MS = 1400; // let the splash breathe instead of flashing

    (async () => {
      // Warm up the home screen data behind the splash so Home appears ready.
      await Promise.allSettled([loadWishlist(), loadFeaturedProducts()]);

      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPLASH_MS) {
        await new Promise((r) => setTimeout(r, MIN_SPLASH_MS - elapsed));
      }

      Animated.timing(loaderFade, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        spinLoop.stop();
        setInitializing(false);
      });
    })();

    return () => spinLoop.stop();
  }, []);

  // Sync input with stored registration
  useEffect(() => {
    if (registrationNumber) setRegistrationInput(registrationNumber);
  }, [registrationNumber]);

  // Animate vehicle card in when vehicleData appears
  useEffect(() => {
    if (vehicleData) {
      Animated.spring(vehicleCardAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();
    } else {
      vehicleCardAnim.setValue(0);
    }
  }, [vehicleData]);

  // Auto-advance promo carousel
  useEffect(() => {
    promoTimer.current = setInterval(() => {
      setCurrentPromoIdx((prev) => {
        const next = (prev + 1) % promotions.length;
        promoScrollRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4000);
    return () => { if (promoTimer.current) clearInterval(promoTimer.current); };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // Filtered products (computed locally — no API round-trip)
  // ─────────────────────────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (!vehicleData) return [];
    let products = vehicleData.compatibleProducts;

    if (selectedPartType) {
      products = products.filter(
        (p) => p.category?.id === selectedPartType.id
      );
    }

    if (productSearchQuery.trim()) {
      const q = productSearchQuery.toLowerCase().trim();
      products = products.filter((p) => p.name.toLowerCase().includes(q));
    }

    return products;
  }, [vehicleData, selectedPartType, productSearchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Wishlist
  // ─────────────────────────────────────────────────────────────────────────
  const loadWishlist = async () => {
    try {
      const response = await wishlistApi.getWishlist();
      if (response.success && response.data) {
        const ids = new Set<string>();
        response.data.forEach((item: any) => {
          if (item.carPartId) ids.add(item.carPartId);
          if (item.productId) ids.add(item.productId);
        });
        setWishlistedIds(ids);
      }
    } catch (error) {
      console.error("Failed to load wishlist:", error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Featured / random parts (shown on the dashboard before a vehicle search)
  // ─────────────────────────────────────────────────────────────────────────
  const loadFeaturedProducts = async () => {
    try {
      setLoadingFeatured(true);

      // Returning customers: recommend from the category they buy from most.
      // Guests / new customers (no order history) fall back to a random preview.
      let topCategoryId: string | undefined;
      try {
        const ordersRes = await getCustomerOrders();
        const orders = ordersRes?.data?.orders ?? [];
        const categoryCounts = new Map<string, number>();
        for (const order of orders) {
          for (const item of order.items ?? []) {
            const categoryId = item.product?.categoryId;
            if (categoryId) {
              categoryCounts.set(categoryId, (categoryCounts.get(categoryId) ?? 0) + 1);
            }
          }
        }
        if (categoryCounts.size > 0) {
          topCategoryId = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        }
      } catch {
        // Not signed in / no history yet — that's fine, use the random preview.
      }

      setIsPersonalized(!!topCategoryId);
      const response = await getProducts({ limit: 30, category: topCategoryId });
      if (response.success && response.data) {
        setFeaturedProducts(shuffleArray(response.data.products).slice(0, 8));
      }
    } catch (error) {
      console.error("Failed to load featured products:", error);
    } finally {
      setLoadingFeatured(false);
    }
  };

  const handleSamplePlatePress = (reg: string) => {
    setRegistrationInput(reg);
    void handleSearchFor(reg);
  };

  const handleToggleWishlist = useCallback(
    async (productId: string) => {
      const wasWishlisted = wishlistedIds.has(productId);
      setWishlistedIds((prev) => {
        const next = new Set(prev);
        wasWishlisted ? next.delete(productId) : next.add(productId);
        return next;
      });
      try {
        await wishlistApi.toggleWishlist(productId, "PRODUCT");
      } catch {
        setWishlistedIds((prev) => {
          const next = new Set(prev);
          wasWishlisted ? next.add(productId) : next.delete(productId);
          return next;
        });
      }
    },
    [wishlistedIds]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Cart
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddToCart = useCallback(
    async (product: CompatibleProduct) => {
      try {
        await addItem({
          productId: product.id,
          itemType: "PRODUCT",
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          image: product.images?.[0],
          categoryName: product.category?.name,
        });
        Alert.alert(
          "Added to Cart",
          `${product.name} has been added to your cart.`,
          [
            { text: "Continue Shopping", style: "cancel" },
            {
              text: "View Cart",
              onPress: () => router.push("/(customer)/cart"),
            },
          ]
        );
      } catch (error: any) {
        Alert.alert(
          "Add to Cart Failed",
          error?.message || "Please try again."
        );
      }
    },
    [addItem, router]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Vehicle Registration Search
  // ─────────────────────────────────────────────────────────────────────────
  const handleSearch = () => handleSearchFor(registrationInput);

  const handleSearchFor = async (raw: string) => {
    const query = raw.trim().toUpperCase();
    if (!query) {
      Alert.alert(
        "Enter Registration Number",
        "Please enter your vehicle registration number to find compatible parts."
      );
      return;
    }

    try {
      setIsSearching(true);
      // Reset filters on new search
      setSelectedPartType(null);
      setProductSearchQuery("");

      const response = await searchVehicleByRegistration(query);

      if (response.success && response.data) {
        setVehicleData(response.data, query);
      } else {
        Alert.alert(
          "Vehicle Not Found",
          response.message ||
            `No vehicle found with registration "${query}". Please check the number and try again.`,
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      Alert.alert(
        "Search Failed",
        "Could not connect to the server. Please try again."
      );
    } finally {
      setIsSearching(false);
    }
  };

  const handleClearVehicle = () => {
    clearVehicle();
    setRegistrationInput("");
    setSelectedPartType(null);
    setProductSearchQuery("");
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  /** Promotion banner item — one full-width, centered card per screen */
  const renderPromoItem = ({ item }: { item: (typeof promotions)[0] }) => (
    <View style={styles.promoSlide}>
      <View style={[styles.promoCard, { backgroundColor: item.gradient[0] }]}>
        <View style={styles.promoCardAccent} />
        <Text style={styles.promoTitle}>{item.title}</Text>
        <Text style={styles.promoDesc}>{item.description}</Text>
      </View>
    </View>
  );

  /** Part type chip */
  const renderPartTypeChip = ({ item }: { item: CompatiblePartType }) => {
    const isSelected = selectedPartType?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.partTypeChip, isSelected && styles.partTypeChipSelected]}
        onPress={() =>
          setSelectedPartType((prev) =>
            prev?.id === item.id ? null : item
          )
        }
        activeOpacity={0.75}
      >
        <Ionicons
          name={getCategoryIcon(item.name)}
          size={18}
          color={isSelected ? "#FFFFFF" : "#00002E"}
          style={{ marginRight: 6 }}
        />
        <Text
          style={[
            styles.partTypeChipText,
            isSelected && styles.partTypeChipTextSelected,
          ]}
        >
          {item.name}
        </Text>
        <View
          style={[
            styles.partTypeChipBadge,
            isSelected && styles.partTypeChipBadgeSelected,
          ]}
        >
          <Text
            style={[
              styles.partTypeChipBadgeText,
              isSelected && styles.partTypeChipBadgeTextSelected,
            ]}
          >
            {item.productCount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /** Product card (grid) */
  const renderProductCard = ({ item }: { item: CompatibleProduct }) => {
    const isWishlisted = wishlistedIds.has(item.id);
    const effectivePrice = item.discountPrice ?? item.price;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => setSelectedProduct(item)}
        activeOpacity={0.85}
      >
        {/* Image */}
        <View style={styles.productImageWrapper}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={36} color="#00002E" />
            </View>
          )}
          {/* Wishlist button */}
          <TouchableOpacity
            style={styles.wishlistBtn}
            onPress={() => handleToggleWishlist(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isWishlisted ? "heart" : "heart-outline"}
              size={18}
              color={isWishlisted ? "#EF4444" : "#FFFFFF"}
            />
          </TouchableOpacity>
          {/* Stock badge */}
          {item.stock <= 0 && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.productInfo}>
          {item.category && (
            <Text style={styles.productCategory} numberOfLines={1}>
              {item.category.name}
            </Text>
          )}
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.productPriceRow}>
            <Text style={styles.productPrice}>
              {formatCurrency(effectivePrice)}
            </Text>
            {item.discountPrice && (
              <Text style={styles.productOriginalPrice}>
                {formatCurrency(item.price)}
              </Text>
            )}
          </View>
          {/* Rating */}
          {item.averageRating > 0 && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={11} color="#F59E0B" />
              <Text style={styles.ratingText}>
                {item.averageRating.toFixed(1)} ({item.totalReviews})
              </Text>
            </View>
          )}
        </View>

        {/* Add to cart */}
        <TouchableOpacity
          style={[
            styles.addToCartBtn,
            item.stock <= 0 && styles.addToCartBtnDisabled,
          ]}
          onPress={() => handleAddToCart(item)}
          disabled={item.stock <= 0}
        >
          <Ionicons
            name="cart"
            size={16}
            color={item.stock > 0 ? "#FFFFFF" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Product Detail Modal
  // ─────────────────────────────────────────────────────────────────────────
  const renderProductDetailModal = () => {
    if (!selectedProduct) return null;
    const p = selectedProduct;
    const effectivePrice = p.discountPrice ?? p.price;
    const isWishlisted = wishlistedIds.has(p.id);

    return (
      <Modal
        visible={!!selectedProduct}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedProduct(null)}
      >
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            {/* Close */}
            <TouchableOpacity
              style={styles.detailCloseBtn}
              onPress={() => setSelectedProduct(null)}
            >
              <Ionicons name="close" size={22} color="#374151" />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Product Image */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() =>
                  p.images?.[0] && setSelectedImage(p.images[0])
                }
              >
                {p.images && p.images.length > 0 ? (
                  <Image
                    source={{ uri: p.images[0] }}
                    style={styles.detailImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.detailImagePlaceholder}>
                    <Ionicons name="cube-outline" size={64} color="#00002E" />
                  </View>
                )}
                {/* Tap to zoom hint */}
                <View style={styles.zoomHint}>
                  <Ionicons name="expand-outline" size={14} color="#FFFFFF" />
                  <Text style={styles.zoomHintText}>Tap to zoom</Text>
                </View>
              </TouchableOpacity>

              {/* Info body */}
              <View style={styles.detailBody}>
                {/* Category */}
                {p.category && (
                  <View style={styles.detailCategoryBadge}>
                    <Ionicons
                      name={getCategoryIcon(p.category.name)}
                      size={13}
                      color="#00002E"
                    />
                    <Text style={styles.detailCategoryText}>
                      {p.category.name}
                    </Text>
                  </View>
                )}

                {/* Name */}
                <Text style={styles.detailProductName}>{p.name}</Text>

                {/* Rating */}
                {p.averageRating > 0 && (
                  <View style={styles.detailRatingRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={
                          p.averageRating >= star
                            ? "star"
                            : p.averageRating >= star - 0.5
                            ? "star-half"
                            : "star-outline"
                        }
                        size={14}
                        color="#F59E0B"
                      />
                    ))}
                    <Text style={styles.detailRatingText}>
                      {p.averageRating.toFixed(1)} · {p.totalReviews} reviews
                    </Text>
                  </View>
                )}

                {/* Price */}
                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPrice}>
                    {formatCurrency(effectivePrice)}
                  </Text>
                  {p.discountPrice && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>
                        {Math.round(
                          ((p.price - p.discountPrice) / p.price) * 100
                        )}
                        % OFF
                      </Text>
                    </View>
                  )}
                </View>
                {p.discountPrice && (
                  <Text style={styles.detailOriginalPrice}>
                    MRP {formatCurrency(p.price)}
                  </Text>
                )}

                {/* Divider */}
                <View style={styles.divider} />

                {/* Compatibility info */}
                {vehicleData && (
                  <View style={styles.compatibilityCard}>
                    <View style={styles.compatibilityHeader}>
                      <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                      <Text style={styles.compatibilityTitle}>
                        Compatible Vehicle
                      </Text>
                    </View>
                    <View style={styles.compatibilityGrid}>
                      <View style={styles.compatibilityItem}>
                        <Text style={styles.compatibilityLabel}>Type</Text>
                        <Text style={styles.compatibilityValue}>
                          {vehicleData.vehicleInfo.type.name}
                        </Text>
                      </View>
                      <View style={styles.compatibilityItem}>
                        <Text style={styles.compatibilityLabel}>Brand</Text>
                        <Text style={styles.compatibilityValue}>
                          {vehicleData.vehicleInfo.brand.name}
                        </Text>
                      </View>
                      <View style={styles.compatibilityItem}>
                        <Text style={styles.compatibilityLabel}>Model</Text>
                        <Text style={styles.compatibilityValue}>
                          {vehicleData.vehicleInfo.model.name}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Availability */}
                <View style={styles.availabilityRow}>
                  <Ionicons
                    name={p.stock > 0 ? "checkmark-circle" : "close-circle"}
                    size={16}
                    color={p.stock > 0 ? "#16A34A" : "#DC2626"}
                  />
                  <Text
                    style={[
                      styles.availabilityText,
                      { color: p.stock > 0 ? "#16A34A" : "#DC2626" },
                    ]}
                  >
                    {p.stock > 0 ? `${p.stock} units in stock` : "Out of Stock"}
                  </Text>
                </View>

                {/* Description */}
                {p.description && (
                  <View style={styles.descriptionSection}>
                    <Text style={styles.descriptionTitle}>Description</Text>
                    <Text style={styles.descriptionText}>{p.description}</Text>
                  </View>
                )}

                {/* Seller / Store */}
                {(p.store || p.salesman) && (
                  <View style={styles.sellerRow}>
                    <Ionicons name="storefront-outline" size={14} color="#6B7280" />
                    <Text style={styles.sellerText}>
                      Sold by {p.store?.name ?? p.salesman?.name}
                    </Text>
                  </View>
                )}

                {/* Shop contact — customer can tap to call the shop */}
                {((p.store as any)?.phone || (p.salesman as any)?.phone) ? (
                  <TouchableOpacity
                    style={styles.sellerRow}
                    onPress={() =>
                      Linking.openURL(`tel:${(p.store as any)?.phone || (p.salesman as any)?.phone}`)
                    }
                  >
                    <Ionicons name="call-outline" size={14} color="#2563EB" />
                    <Text style={[styles.sellerText, { color: "#2563EB", fontWeight: "600" }]}>
                      Call shop: {(p.store as any)?.phone || (p.salesman as any)?.phone}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>

            {/* Actions */}
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={styles.detailWishlistBtn}
                onPress={() => handleToggleWishlist(p.id)}
              >
                <Ionicons
                  name={isWishlisted ? "heart" : "heart-outline"}
                  size={22}
                  color={isWishlisted ? "#EF4444" : "#374151"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.detailAddToCartBtn,
                  p.stock <= 0 && styles.detailAddToCartBtnDisabled,
                ]}
                disabled={p.stock <= 0}
                onPress={() => {
                  handleAddToCart(p);
                  setSelectedProduct(null);
                }}
              >
                <Ionicons name="cart" size={20} color="#FFFFFF" />
                <Text style={styles.detailAddToCartText}>
                  {p.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00002E" />

      {/* ── Search Header ─────────────────────────────────────────────────── */}
      <View style={styles.searchHeader}>
        <Text style={styles.searchHeaderTitle}>Find Your Parts</Text>
        <Text style={styles.searchHeaderSubtitle}>
          Enter your vehicle registration number
        </Text>
        <View style={styles.searchRow}>
          <View style={styles.searchInputWrapper}>
            <Ionicons
              name="car-outline"
              size={20}
              color="#6B7280"
              style={{ marginLeft: 14 }}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="e.g. ABC123"
              placeholderTextColor="#9CA3AF"
              value={registrationInput}
              onChangeText={(t) => setRegistrationInput(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {registrationInput.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setRegistrationInput("");
                  if (vehicleData) handleClearVehicle();
                }}
                style={{ padding: 8 }}
              >
                <Ionicons name="close-circle" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.searchBtn,
              isSearching && { opacity: 0.7 },
            ]}
            onPress={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="search" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {/* Sample plates — tap to try the search instantly */}
        {!vehicleData && (
          <View style={styles.samplePlateRow}>
            <Text style={styles.samplePlateLabel}>Try:</Text>
            {samplePlates.map((s) => (
              <TouchableOpacity
                key={s.reg}
                style={styles.samplePlateChip}
                onPress={() => handleSamplePlatePress(s.reg)}
                activeOpacity={0.75}
              >
                <Text style={styles.samplePlateChipText}>{s.reg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* ── Vehicle Identified Card ─────────────────────────────────────── */}
        {vehicleData && (
          <Animated.View
            style={[
              styles.vehicleCard,
              {
                opacity: vehicleCardAnim,
                transform: [
                  {
                    translateY: vehicleCardAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.vehicleCardLeft}>
              <View style={styles.vehicleIconCircle}>
                <Ionicons name="car-sport" size={26} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.vehicleRegNumber}>
                  {vehicleData.registration.registrationNumber}
                </Text>
                <Text style={styles.vehicleModelText}>
                  {vehicleData.vehicleInfo.brand.name}{" "}
                  {vehicleData.vehicleInfo.model.name}
                </Text>
                <Text style={styles.vehicleTypeText}>
                  {vehicleData.vehicleInfo.type.name}
                </Text>
              </View>
            </View>
            <View style={styles.vehicleCardRight}>
              <View style={styles.vehiclePartsBadge}>
                <Text style={styles.vehiclePartsCount}>
                  {vehicleData.compatibleProducts.length}
                </Text>
                <Text style={styles.vehiclePartsLabel}>Parts</Text>
              </View>
              <TouchableOpacity
                onPress={handleClearVehicle}
                style={styles.clearBtn}
              >
                <Ionicons name="close" size={14} color="#6B7280" />
                <Text style={styles.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* ── Promotions Carousel (shown when no vehicle) ─────────────────── */}
        {!vehicleData && (
          <View style={styles.section}>
            <FlatList
              ref={promoScrollRef}
              data={promotions}
              renderItem={renderPromoItem}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const idx = Math.round(
                  e.nativeEvent.contentOffset.x / SCREEN_WIDTH
                );
                setCurrentPromoIdx(idx);
              }}
            />
            {/* Dots */}
            <View style={styles.promoDots}>
              {promotions.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.promoDot,
                    i === currentPromoIdx && styles.promoDotActive,
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* ── Part Types (Categories) ─────────────────────────────────────── */}
        {vehicleData && vehicleData.compatiblePartTypes.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Part Types</Text>
              {selectedPartType && (
                <TouchableOpacity onPress={() => setSelectedPartType(null)}>
                  <Text style={styles.clearFilterText}>Clear filter</Text>
                </TouchableOpacity>
              )}
            </View>
            <FlatList
              data={vehicleData.compatiblePartTypes}
              renderItem={renderPartTypeChip}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.partTypeList}
            />
          </View>
        )}

        {/* ── Product Search Bar (shown after vehicle identified) ──────────── */}
        {vehicleData && (
          <View style={styles.productSearchSection}>
            <View style={styles.productSearchBar}>
              <Ionicons name="search-outline" size={18} color="#9CA3AF" />
              <TextInput
                style={styles.productSearchInput}
                placeholder={`Search ${
                  selectedPartType
                    ? selectedPartType.name
                    : vehicleData.vehicleInfo.brand.name +
                      " " +
                      vehicleData.vehicleInfo.model.name
                } parts...`}
                placeholderTextColor="#9CA3AF"
                value={productSearchQuery}
                onChangeText={setProductSearchQuery}
                returnKeyType="search"
              />
              {productSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setProductSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── Compatible Products ─────────────────────────────────────────── */}
        {vehicleData && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {selectedPartType
                  ? selectedPartType.name
                  : "Compatible Parts"}
              </Text>
              <Text style={styles.resultsCount}>
                {filteredProducts.length}{" "}
                {filteredProducts.length === 1 ? "result" : "results"}
              </Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyProducts}>
                <Ionicons name="cube-outline" size={56} color="#D1D5DB" />
                <Text style={styles.emptyProductsTitle}>No parts found</Text>
                <Text style={styles.emptyProductsSubtitle}>
                  {productSearchQuery
                    ? `No "${productSearchQuery}" parts for your vehicle`
                    : "No compatible parts in this category"}
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredProducts}
                renderItem={renderProductCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.productGrid}
                columnWrapperStyle={styles.productGridRow}
              />
            )}
          </View>
        )}

        {/* ── Popular Parts (random preview, shown before a vehicle search) ── */}
        {!vehicleData && (featuredProducts.length > 0 || loadingFeatured) && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {isPersonalized ? "Recommended for You" : "Popular Parts"}
              </Text>
              <Text style={styles.resultsCount}>
                {isPersonalized ? "Based on your past orders" : "Browse a preview"}
              </Text>
            </View>
            {loadingFeatured ? (
              <ActivityIndicator
                color="#00002E"
                size="small"
                style={{ marginVertical: 24 }}
              />
            ) : (
              <FlatList
                data={featuredProducts}
                renderItem={renderProductCard}
                keyExtractor={(item) => item.id}
                numColumns={2}
                scrollEnabled={false}
                contentContainerStyle={styles.productGrid}
                columnWrapperStyle={styles.productGridRow}
              />
            )}
          </View>
        )}

        {/* ── Default state: How it works ─────────────────────────────────── */}
        {!vehicleData && !isSearching && (
          <View style={styles.howItWorks}>
            <Text style={styles.howItWorksTitle}>How It Works</Text>
            <View style={styles.howItWorksSteps}>
              {[
                {
                  icon: "car-outline" as keyof typeof Ionicons.glyphMap,
                  step: "1",
                  title: "Enter Registration",
                  desc: "Type your vehicle registration number in the search bar above",
                },
                {
                  icon: "checkmark-circle-outline" as keyof typeof Ionicons.glyphMap,
                  step: "2",
                  title: "Vehicle Identified",
                  desc: "We instantly identify your make, model and type",
                },
                {
                  icon: "cube-outline" as keyof typeof Ionicons.glyphMap,
                  step: "3",
                  title: "Compatible Parts",
                  desc: "Browse only the parts guaranteed to fit your vehicle",
                },
              ].map((s) => (
                <View key={s.step} style={styles.howItWorksStep}>
                  <View style={styles.stepIconWrapper}>
                    <Ionicons name={s.icon} size={24} color="#00002E" />
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>{s.step}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{s.title}</Text>
                    <Text style={styles.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Product Detail Modal ────────────────────────────────────────────── */}
      {renderProductDetailModal()}

      {/* ── Full-screen image zoom ──────────────────────────────────────────── */}
      <Modal
        visible={!!selectedImage}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedImage(null)}
      >
        <TouchableOpacity
          style={styles.imageZoomOverlay}
          activeOpacity={1}
          onPress={() => setSelectedImage(null)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={styles.imageZoomContent}
          >
            <TouchableOpacity
              style={styles.imageZoomClose}
              onPress={() => setSelectedImage(null)}
            >
              <Ionicons name="close" size={28} color="#FFFFFF" />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.imageZoomImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Branded loading splash (login → loader → Home) ─────────────────────
          Rendered in a Modal so it sits above the bottom tab bar and blocks all
          touches while data loads (users can't tap Profile/Orders underneath). */}
      <Modal
        visible={initializing}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <Animated.View style={[styles.splash, { opacity: loaderFade }]}>
          <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
          <View style={styles.splashLogoRow}>
            <Ionicons name="cog" size={30} color={SPLASH_BLUE} style={{ marginRight: 10 }} />
            <Text style={styles.splashBrand}>DIGIFIX</Text>
          </View>
          {/* Animated horizontal loading bar under the logo */}
          <View style={styles.loadingTrack}>
            <Animated.View
              style={[
                styles.loadingBar,
                {
                  transform: [
                    {
                      translateX: loaderSpin.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-SPLASH_BAR_SEG, SPLASH_BAR_TRACK],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
          <Text style={styles.splashTagline}>Loading your parts…</Text>
        </Animated.View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const CARD_WIDTH = 170;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // ── Branded loading splash ──────────────────────────────────────────────────
  splash: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  splashBrand: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 4,
    color: SPLASH_BLUE,
  },
  loadingTrack: {
    width: SPLASH_BAR_TRACK,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DBEAFE",
    overflow: "hidden",
    marginTop: 26,
  },
  loadingBar: {
    width: SPLASH_BAR_SEG,
    height: 4,
    borderRadius: 2,
    backgroundColor: SPLASH_BLUE,
  },
  splashTagline: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 18,
  },

  // ── Search Header ──────────────────────────────────────────────────────────
  searchHeader: {
    backgroundColor: "#00002E",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "android" ? 16 : 12,
    paddingBottom: 20,
  },
  searchHeaderTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 2,
  },
  searchHeaderSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 14,
  },
  searchRow: {
    flexDirection: "row",
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    height: 50,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    letterSpacing: 1.5,
  },
  searchBtn: {
    width: 50,
    height: 50,
    backgroundColor: "#003399",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  samplePlateRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  samplePlateLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
    marginRight: 2,
  },
  samplePlateChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  samplePlateChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // ── Vehicle Identified Card ────────────────────────────────────────────────
  vehicleCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#00002E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1.5,
    borderColor: "#E0E7FF",
  },
  vehicleCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  vehicleIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#00002E",
    justifyContent: "center",
    alignItems: "center",
  },
  vehicleRegNumber: {
    fontSize: 18,
    fontWeight: "800",
    color: "#00002E",
    letterSpacing: 2,
  },
  vehicleModelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginTop: 1,
  },
  vehicleTypeText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 1,
  },
  vehicleCardRight: {
    alignItems: "center",
    gap: 8,
  },
  vehiclePartsBadge: {
    backgroundColor: "#EEF2FF",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
  },
  vehiclePartsCount: {
    fontSize: 20,
    fontWeight: "800",
    color: "#00002E",
  },
  vehiclePartsLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  clearBtnText: {
    fontSize: 12,
    color: "#6B7280",
  },

  // ── Sections ──────────────────────────────────────────────────────────────
  section: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  clearFilterText: {
    fontSize: 13,
    color: "#003399",
    fontWeight: "600",
  },
  resultsCount: {
    fontSize: 13,
    color: "#6B7280",
  },

  // ── Promotions ─────────────────────────────────────────────────────────────
  promoSlide: {
    width: SCREEN_WIDTH,
    alignItems: "center",
  },
  promoCard: {
    width: SCREEN_WIDTH - 32,
    height: 150,
    borderRadius: 20,
    padding: 22,
    overflow: "hidden",
    justifyContent: "center",
  },
  promoCardAccent: {
    position: "absolute",
    top: -30,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  promoTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 6,
  },
  promoDesc: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 18,
  },
  promoDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
  },
  promoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
  promoDotActive: {
    width: 18,
    backgroundColor: "#00002E",
  },

  // ── Part Type Chips ────────────────────────────────────────────────────────
  partTypeList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  partTypeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  partTypeChipSelected: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  partTypeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  partTypeChipTextSelected: {
    color: "#FFFFFF",
  },
  partTypeChipBadge: {
    marginLeft: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: 100,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  partTypeChipBadgeSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  partTypeChipBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
  },
  partTypeChipBadgeTextSelected: {
    color: "#FFFFFF",
  },

  // ── Product Search ─────────────────────────────────────────────────────────
  productSearchSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  productSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  productSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  // ── Product Grid ───────────────────────────────────────────────────────────
  productGrid: {
    paddingHorizontal: 12,
    gap: 12,
  },
  productGridRow: {
    justifyContent: "space-between",
    gap: 12,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    maxWidth: CARD_WIDTH,
  },
  productImageWrapper: {
    width: "100%",
    height: 140,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
  },
  wishlistBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  outOfStockOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingVertical: 5,
    alignItems: "center",
  },
  outOfStockText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  productInfo: {
    padding: 10,
    flex: 1,
  },
  productCategory: {
    fontSize: 10,
    color: "#003399",
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 18,
  },
  productPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "800",
    color: "#00002E",
  },
  productOriginalPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 4,
  },
  ratingText: {
    fontSize: 11,
    color: "#6B7280",
  },
  addToCartBtn: {
    backgroundColor: "#00002E",
    margin: 10,
    marginTop: 0,
    borderRadius: 10,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  addToCartBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },

  // ── Empty Products ─────────────────────────────────────────────────────────
  emptyProducts: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyProductsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptyProductsSubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 20,
  },

  // ── How It Works ───────────────────────────────────────────────────────────
  howItWorks: {
    margin: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  howItWorksTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  howItWorksSteps: {
    gap: 16,
  },
  howItWorksStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  stepNumber: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#00002E",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  stepDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  // ── Product Detail Modal ───────────────────────────────────────────────────
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
    overflow: "hidden",
  },
  detailCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  detailImage: {
    width: "100%",
    height: 240,
    resizeMode: "cover",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: 240,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomHint: {
    position: "absolute",
    bottom: 10,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 4,
  },
  zoomHintText: {
    color: "#FFFFFF",
    fontSize: 11,
  },
  detailBody: {
    padding: 20,
    paddingTop: 16,
  },
  detailCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  detailCategoryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#003399",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  detailProductName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 26,
    marginBottom: 8,
  },
  detailRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 12,
  },
  detailRatingText: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 4,
  },
  detailPriceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: "800",
    color: "#00002E",
  },
  discountBadge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  detailOriginalPrice: {
    fontSize: 14,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
  },
  compatibilityCard: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
  },
  compatibilityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  compatibilityTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#15803D",
  },
  compatibilityGrid: {
    flexDirection: "row",
    gap: 8,
  },
  compatibilityItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  compatibilityLabel: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  compatibilityValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  availabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginBottom: 12,
  },
  availabilityText: {
    fontSize: 14,
    fontWeight: "600",
  },
  descriptionSection: {
    marginBottom: 10,
  },
  descriptionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 6,
  },
  descriptionText: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 21,
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  sellerText: {
    fontSize: 13,
    color: "#6B7280",
  },
  serviceChargeNote: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 10,
  },
  detailActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
  },
  detailWishlistBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  detailAddToCartBtn: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#00002E",
    borderRadius: 14,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  detailAddToCartBtnDisabled: {
    backgroundColor: "#E5E7EB",
  },
  detailAddToCartText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // ── Image Zoom ─────────────────────────────────────────────────────────────
  imageZoomOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageZoomContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageZoomClose: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    right: 20,
    zIndex: 10,
  },
  imageZoomImage: {
    width: "100%",
    height: "80%",
  },
});
