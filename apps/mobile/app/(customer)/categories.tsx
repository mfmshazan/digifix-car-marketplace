/**
 * Categories Screen — Vehicle-Aware Part Type Browsing
 *
 * Behaviour:
 * - If a vehicle is identified (via vehicleStore), shows only the part types
 *   that have compatible products for that vehicle, with a vehicle banner.
 * - Tapping a part type shows only compatible products for that category.
 * - If no vehicle is identified, falls back to the original behaviour:
 *   shows all categories and loads all car parts for each.
 */
import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Image,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAllCategories, getPartsByCategoryName, Category } from "../../src/api/categories";
import { useCart } from "../../src/store/cartStore";
import { useVehicleStore } from "../../src/store/vehicleStore";
import type { CompatibleProduct, CompatiblePartType } from "../../src/api/vehicle";

// Icon mapping for category names
const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Engine Parts":   "cog",
  Engine:           "cog",
  "Brake System":   "disc",
  Brakes:           "disc",
  Filters:          "filter",
  Electrical:       "flash",
  Suspension:       "car-sport",
  "Cooling System": "water",
  "Exhaust System": "cloud",
  Transmission:     "settings",
  "Body Parts":     "car",
  Lighting:         "bulb",
  Interior:         "tablet-portrait",
  Accessories:      "diamond",
};

const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap =>
  categoryIconMap[name] || "cube";

export default function CategoriesScreen() {
  // ── Vehicle context ──
  const { vehicleData, registrationNumber, clearVehicle } = useVehicleStore();
  const hasVehicle = !!vehicleData;

  // ── Fallback: all categories ──
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(false);

  // ── Category detail modal ──
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>("");
  const [categoryParts, setCategoryParts] = useState<any[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);

  // ── Product search within modal ──
  const [modalSearchQuery, setModalSearchQuery] = useState("");

  // ── Selected product detail ──
  const [selectedProduct, setSelectedProduct] = useState<any>(null);

  const router = useRouter();
  const { addItem } = useCart();

  // ─────────────────────────────────────────────────────────────────────────
  // Load fallback categories when no vehicle is identified
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!hasVehicle) {
      loadAllCategories();
    }
  }, [hasVehicle]);

  const loadAllCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await getAllCategories();
      if (response.success) setAllCategories(response.data);
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoadingCategories(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Data to display — either vehicle-filtered or all categories
  // ─────────────────────────────────────────────────────────────────────────
  const displayPartTypes: (CompatiblePartType | Category)[] = useMemo(
    () => (hasVehicle ? vehicleData!.compatiblePartTypes : allCategories),
    [hasVehicle, vehicleData, allCategories]
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Products filtered within modal search
  // ─────────────────────────────────────────────────────────────────────────
  const filteredModalParts = useMemo(() => {
    if (!modalSearchQuery.trim()) return categoryParts;
    const q = modalSearchQuery.toLowerCase().trim();
    return categoryParts.filter((p) => p.name?.toLowerCase().includes(q));
  }, [categoryParts, modalSearchQuery]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle category press
  // ─────────────────────────────────────────────────────────────────────────
  const handleCategoryPress = async (item: CompatiblePartType | Category) => {
    setSelectedCategoryId(item.id);
    setSelectedCategoryName(item.name);
    setModalSearchQuery("");
    setShowPartsModal(true);
    setIsLoadingParts(true);

    try {
      if (hasVehicle) {
        // Filter compatible products locally — no extra API call
        const products = vehicleData!.compatibleProducts.filter(
          (p) => p.category?.id === item.id
        );
        setCategoryParts(products as any[]);
      } else {
        // Fallback: fetch all car parts for this category
        const response = await getPartsByCategoryName(item.name);
        if (response.success) {
          setCategoryParts(response.data.carParts || []);
        }
      }
    } catch (error) {
      console.error("Failed to load category parts:", error);
      setCategoryParts([]);
    } finally {
      setIsLoadingParts(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Cart
  // ─────────────────────────────────────────────────────────────────────────
  const handleAddToCart = async (part: any) => {
    try {
      await addItem({
        productId: part.id,
        itemType: hasVehicle ? "PRODUCT" : "CAR_PART",
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: part.car
          ? `${part.car.make} ${part.car.model} (${part.car.year})`
          : undefined,
        categoryName: selectedCategoryName,
      });
      Alert.alert(
        "Added to Cart",
        `${part.name} has been added to your cart.`,
        [
          { text: "Continue", style: "cancel" },
          { text: "View Cart", onPress: () => router.push("/(customer)/cart") },
        ]
      );
    } catch (error: any) {
      Alert.alert("Add to Cart Failed", error?.message || "Please try again.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render — Category list item
  // ─────────────────────────────────────────────────────────────────────────
  const getPartsCount = (item: CompatiblePartType | Category): number => {
    // Vehicle-filtered part type
    if ("productCount" in item) return (item as CompatiblePartType).productCount;
    // Fallback category
    const cat = item as Category;
    if (cat.totalPartsCount !== undefined) return cat.totalPartsCount;
    if (cat._count) return (cat._count.products || 0) + (cat._count.carParts || 0);
    return 0;
  };

  const renderCategoryItem = ({ item }: { item: CompatiblePartType | Category }) => (
    <TouchableOpacity
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
      activeOpacity={0.85}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={getCategoryIcon(item.name)} size={30} color="#00002E" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>
          {getPartsCount(item)}{" "}
          {hasVehicle ? "compatible parts" : "parts"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
    </TouchableOpacity>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Render — Part card inside modal
  // ─────────────────────────────────────────────────────────────────────────
  const renderPartItem = ({ item }: { item: any }) => {
    const effectivePrice = item.discountPrice ?? item.price;
    return (
      <View style={styles.partCard}>
        <View style={styles.partImageContainer}>
          {item.images && item.images.length > 0 ? (
            <Image
              source={{ uri: item.images[0] }}
              style={styles.partImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.partImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color="#00002E" />
            </View>
          )}
          <View
            style={[
              styles.conditionBadge,
              {
                backgroundColor:
                  item.condition === "NEW"
                    ? "#10B981"
                    : item.condition === "USED"
                    ? "#00002E"
                    : "#6B7280",
              },
            ]}
          >
            <Text style={styles.conditionText}>
              {item.condition ?? "NEW"}
            </Text>
          </View>
        </View>

        <View style={styles.partInfo}>
          {/* Vehicle info (car parts) or category (products) */}
          {item.car && (
            <Text style={styles.partCarInfo}>
              {item.car.make} {item.car.model} ({item.car.year})
            </Text>
          )}
          {!item.car && vehicleData && (
            <Text style={styles.partCarInfo}>
              {vehicleData.vehicleInfo.brand.name}{" "}
              {vehicleData.vehicleInfo.model.name}
            </Text>
          )}
          <Text style={styles.partName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.partPrice}>
              Rs. {effectivePrice.toLocaleString()}
            </Text>
            {item.discountPrice && (
              <Text style={styles.originalPrice}>
                Rs. {item.price.toLocaleString()}
              </Text>
            )}
          </View>
          <Text style={styles.stockText}>
            {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.addButton,
            item.stock <= 0 && styles.addButtonDisabled,
          ]}
          onPress={() => handleAddToCart(item)}
          disabled={item.stock <= 0}
        >
          <Ionicons
            name="add"
            size={24}
            color={item.stock > 0 ? "#FFFFFF" : "#9CA3AF"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading state (fallback only)
  // ─────────────────────────────────────────────────────────────────────────
  if (!hasVehicle && isLoadingCategories) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* ── Vehicle Context Banner ───────────────────────────────────────── */}
      {hasVehicle && (
        <View style={styles.vehicleBanner}>
          <View style={styles.vehicleBannerLeft}>
            <Ionicons name="car-sport" size={18} color="#FFFFFF" />
            <View>
              <Text style={styles.vehicleBannerTitle}>
                {vehicleData!.vehicleInfo.brand.name}{" "}
                {vehicleData!.vehicleInfo.model.name}
              </Text>
              <Text style={styles.vehicleBannerSubtitle}>
                {registrationNumber} · Showing compatible parts only
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={clearVehicle}
            style={styles.vehicleBannerClear}
          >
            <Text style={styles.vehicleBannerClearText}>Clear</Text>
            <Ionicons name="close" size={14} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Part Types List ──────────────────────────────────────────────── */}
      <FlatList
        data={displayPartTypes as any[]}
        renderItem={renderCategoryItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {hasVehicle
                ? "No compatible parts found"
                : "No categories available"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {hasVehicle
                ? `No parts are currently listed for your ${vehicleData!.vehicleInfo.brand.name} ${vehicleData!.vehicleInfo.model.name}`
                : "Check back later for available categories"}
            </Text>
          </View>
        }
      />

      {/* ── Category Parts Modal ─────────────────────────────────────────── */}
      <Modal
        visible={showPartsModal}
        animationType="slide"
        onRequestClose={() => setShowPartsModal(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPartsModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#111827" />
            </TouchableOpacity>
            <View style={styles.modalHeaderCenter}>
              <Text style={styles.modalTitle}>{selectedCategoryName}</Text>
              {hasVehicle && (
                <Text style={styles.modalSubtitle}>
                  {vehicleData!.vehicleInfo.brand.name}{" "}
                  {vehicleData!.vehicleInfo.model.name}
                </Text>
              )}
            </View>
            <View style={{ width: 24 }} />
          </View>

          {/* Search within modal */}
          <View style={styles.modalSearchWrapper}>
            <View style={styles.modalSearchBar}>
              <Ionicons name="search-outline" size={16} color="#9CA3AF" />
              <TextInput
                style={styles.modalSearchInput}
                placeholder={`Search ${selectedCategoryName} parts...`}
                placeholderTextColor="#9CA3AF"
                value={modalSearchQuery}
                onChangeText={setModalSearchQuery}
              />
              {modalSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setModalSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {isLoadingParts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00002E" />
            </View>
          ) : filteredModalParts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>
                {modalSearchQuery
                  ? `No results for "${modalSearchQuery}"`
                  : "No parts available"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {modalSearchQuery
                  ? "Try a different search term"
                  : hasVehicle
                  ? "No compatible parts in this category"
                  : "Check back later"}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredModalParts}
              renderItem={renderPartItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.partsList}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },

  // ── Vehicle Banner ─────────────────────────────────────────────────────────
  vehicleBanner: {
    backgroundColor: "#00002E",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  vehicleBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  vehicleBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  vehicleBannerSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    marginTop: 1,
  },
  vehicleBannerClear: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  vehicleBannerClearText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Categories List ────────────────────────────────────────────────────────
  list: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  categoryCount: {
    fontSize: 13,
    color: "#6B7280",
  },

  // ── Empty ──────────────────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#374151",
    marginTop: 14,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 6,
    textAlign: "center",
    lineHeight: 20,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 16 : 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalHeaderCenter: {
    alignItems: "center",
    flex: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  modalSearchWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
  },

  // ── Parts list inside modal ────────────────────────────────────────────────
  partsList: {
    padding: 16,
  },
  partCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  partImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
    backgroundColor: "#F3F4F6",
  },
  partImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  partImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
  },
  conditionBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
  },
  partInfo: {
    flex: 1,
  },
  partCarInfo: {
    fontSize: 10,
    color: "#003399",
    fontWeight: "700",
    marginBottom: 2,
  },
  partName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#00002E",
  },
  originalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  stockText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 3,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: "#00002E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  addButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
});
