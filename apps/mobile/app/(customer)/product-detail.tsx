import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  StatusBar,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useCart } from "../../src/store/cartStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ProductDetailScreen() {
  const router = useRouter();
  const { itemKind, itemData } = useLocalSearchParams<{ itemKind: string; itemData: string }>();
  const { addItem } = useCart();

  const [activeImage, setActiveImage] = useState(0);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  if (!itemData) {
    return (
      <View style={styles.errorWrap}>
        <Ionicons name="alert-circle-outline" size={64} color="#CCC" />
        <Text style={styles.errorText}>Item not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtnSolid}>
          <Text style={styles.backBtnText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const item = JSON.parse(itemData) as any;
  const isPart = itemKind === "part";
  const images: string[] = item.images ?? [];
  const displayPrice = item.discountPrice ?? item.price;

  const handleAddToCart = async () => {
    try {
      setIsAddingToCart(true);
      await addItem({
        productId: item.id,
        itemType: isPart ? "CAR_PART" : "PRODUCT",
        name: item.name,
        price: item.price,
        discountPrice: item.discountPrice,
        image: images[0],
        carInfo: isPart && item.car ? `${item.car.make} ${item.car.model} (${item.car.year})` : undefined,
        categoryName: item.category?.name,
      });
      Alert.alert("Added to Cart", `${item.name} has been added to your cart.`, [
        { text: "Continue Shopping", style: "cancel" },
        { text: "View Cart", onPress: () => router.push("/(customer)/cart") },
      ]);
    } catch (e: any) {
      Alert.alert("Failed", e?.message ?? "Could not add to cart. Please try again.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const renderThumb = ({ item: uri, index }: { item: string; index: number }) => (
    <TouchableOpacity onPress={() => setActiveImage(index)} activeOpacity={0.8}>
      <Image
        source={{ uri }}
        style={[styles.thumb, index === activeImage && styles.thumbActive]}
        resizeMode="cover"
      />
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {isPart ? "Part Details" : "Product Details"}
        </Text>
        <TouchableOpacity onPress={() => router.push("/(customer)/cart")} style={styles.cartBtn}>
          <Ionicons name="cart-outline" size={22} color="#1A1A2E" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Main Image */}
        {images.length > 0 ? (
          <TouchableOpacity activeOpacity={0.95} onPress={() => setZoomedImage(images[activeImage])}>
            <Image source={{ uri: images[activeImage] }} style={styles.mainImage} resizeMode="cover" />
            <View style={styles.imageCount}>
              <Ionicons name="expand-outline" size={12} color="#FFF" style={{ marginRight: 4 }} />
              <Text style={styles.imageCountText}>{activeImage + 1} / {images.length}</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.mainImagePlaceholder}>
            <Ionicons name={isPart ? "construct-outline" : "cube-outline"} size={72} color="#00002E" />
          </View>
        )}

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <FlatList
            data={images}
            renderItem={renderThumb}
            keyExtractor={(_, i) => String(i)}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.thumbList}
          />
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          {/* Type + condition badges */}
          <View style={styles.badgeRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{isPart ? "CAR PART" : "PRODUCT"}</Text>
            </View>
            {isPart && item.condition && (
              <View style={[styles.condBadge, {
                backgroundColor: item.condition === "NEW" ? "#10B981" : item.condition === "USED" ? "#00002E" : "#6B7280"
              }]}>
                <Text style={styles.condBadgeText}>{item.condition}</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={styles.name}>{item.name}</Text>

          {/* Shop / Seller */}
          {(isPart ? item.seller?.name : item.salesman?.store?.name) ? (
            <View style={styles.storeRow}>
              <Ionicons name="storefront-outline" size={14} color="#00002E" />
              <Text style={styles.storeName}>{isPart ? item.seller?.name : item.salesman?.store?.name}</Text>
            </View>
          ) : null}

          {/* Price */}
          <View style={styles.priceBlock}>
            <Text style={styles.price}>Rs. {displayPrice.toLocaleString()}</Text>
            {item.discountPrice && (
              <Text style={styles.strikePrice}>Rs. {item.price.toLocaleString()}</Text>
            )}
          </View>

          {/* Stock */}
          <View style={styles.stockRow}>
            <Ionicons
              name={item.stock > 0 ? "checkmark-circle" : "close-circle"}
              size={16}
              color={item.stock > 0 ? "#10B981" : "#EF4444"}
            />
            <Text style={[styles.stockText, { color: item.stock > 0 ? "#10B981" : "#EF4444" }]}>
              {item.stock > 0 ? `${item.stock} in stock` : "Out of stock"}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Specs section */}
          <Text style={styles.sectionLabel}>Details</Text>

          {/* Car info (parts only) */}
          {isPart && item.car && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Fits</Text>
              <Text style={styles.specVal}>{item.car.make} {item.car.model} ({item.car.year})</Text>
            </View>
          )}
          {isPart && item.car?.engineType && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Engine</Text>
              <Text style={styles.specVal}>{item.car.engineType}</Text>
            </View>
          )}
          {isPart && item.partNumber && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Part #</Text>
              <Text style={styles.specVal}>{item.partNumber}</Text>
            </View>
          )}
          {item.category?.name && (
            <View style={styles.specRow}>
              <Text style={styles.specKey}>Category</Text>
              <Text style={styles.specVal}>{item.category.name}</Text>
            </View>
          )}

          {/* Description (products) */}
          {!isPart && item.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.description}>{item.description}</Text>
            </>
          )}
        </View>
      </ScrollView>

      {/* Sticky Add to Cart */}
      <View style={styles.footer}>
        <View style={styles.footerPrice}>
          <Text style={styles.footerPriceLabel}>Total</Text>
          <Text style={styles.footerPriceValue}>Rs. {displayPrice.toLocaleString()}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, (item.stock <= 0 || isAddingToCart) && styles.addBtnDisabled]}
          onPress={handleAddToCart}
          disabled={item.stock <= 0 || isAddingToCart}
        >
          <Ionicons name="cart-outline" size={20} color="#FFF" />
          <Text style={styles.addBtnText}>
            {item.stock <= 0 ? "Out of Stock" : isAddingToCart ? "Adding…" : "Add to Cart"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen image zoom */}
      <Modal visible={!!zoomedImage} transparent animationType="fade" onRequestClose={() => setZoomedImage(null)}>
        <TouchableOpacity style={styles.zoomOverlay} activeOpacity={1} onPress={() => setZoomedImage(null)}>
          <TouchableOpacity style={styles.zoomClose} onPress={() => setZoomedImage(null)}>
            <Ionicons name="close" size={26} color="#FFF" />
          </TouchableOpacity>
          {zoomedImage && <Image source={{ uri: zoomedImage }} style={styles.zoomedImg} resizeMode="contain" />}
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },

  errorWrap: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },
  errorText: { fontSize: 16, color: "#666", marginTop: 12 },
  backBtnSolid: { marginTop: 20, backgroundColor: "#00002E", paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  backBtnText: { color: "#FFF", fontWeight: "600" },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 14, paddingTop: 20,
    backgroundColor: "#FFFFFF", borderBottomWidth: 1, borderBottomColor: "#F0F0F0",
  },
  backBtn: { width: 40, height: 40, backgroundColor: "#F3F4F6", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  cartBtn: { width: 40, height: 40, backgroundColor: "#F3F4F6", borderRadius: 20, justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E", flex: 1, textAlign: "center", marginHorizontal: 8 },

  mainImage: { width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.72 },
  mainImagePlaceholder: {
    width: SCREEN_WIDTH, height: SCREEN_WIDTH * 0.6,
    backgroundColor: "#E5E7EB", justifyContent: "center", alignItems: "center",
  },
  imageCount: {
    position: "absolute", bottom: 10, right: 12,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(0,0,46,0.7)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10,
  },
  imageCountText: { color: "#FFF", fontSize: 11, fontWeight: "600" },

  thumbList: { paddingHorizontal: 16, paddingVertical: 10 },
  thumb: { width: 60, height: 60, borderRadius: 10, marginRight: 8, borderWidth: 2, borderColor: "transparent" },
  thumbActive: { borderColor: "#00002E" },

  infoCard: { backgroundColor: "#FFFFFF", margin: 16, borderRadius: 20, padding: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },

  badgeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  typeBadge: { backgroundColor: "#00002E20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeBadgeText: { fontSize: 10, color: "#00002E", fontWeight: "700", letterSpacing: 0.5 },
  condBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  condBadgeText: { fontSize: 10, color: "#FFF", fontWeight: "700", letterSpacing: 0.5 },

  name: { fontSize: 20, fontWeight: "700", color: "#1A1A2E", marginBottom: 8, lineHeight: 28 },

  storeRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  storeName: { fontSize: 13, color: "#00002E", fontWeight: "600" },

  priceBlock: { flexDirection: "row", alignItems: "baseline", gap: 10, marginBottom: 10 },
  price: { fontSize: 24, fontWeight: "800", color: "#00002E" },
  strikePrice: { fontSize: 14, color: "#9CA3AF", textDecorationLine: "line-through" },

  stockRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
  stockText: { fontSize: 13, fontWeight: "600" },

  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 16 },
  sectionLabel: { fontSize: 13, fontWeight: "700", color: "#1A1A2E", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },

  specRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#F9FAFB" },
  specKey: { fontSize: 13, color: "#6B7280", flex: 1 },
  specVal: { fontSize: 13, color: "#1A1A2E", fontWeight: "500", flex: 2, textAlign: "right" },

  description: { fontSize: 14, color: "#4B5563", lineHeight: 22 },

  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#FFFFFF", paddingHorizontal: 20, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#F0F0F0",
    shadowColor: "#000", shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  footerPrice: { flex: 1 },
  footerPriceLabel: { fontSize: 11, color: "#6B7280" },
  footerPriceValue: { fontSize: 18, fontWeight: "700", color: "#00002E" },
  addBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: "#00002E", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 16,
  },
  addBtnDisabled: { backgroundColor: "#9CA3AF" },
  addBtnText: { color: "#FFF", fontSize: 15, fontWeight: "700" },

  zoomOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", justifyContent: "center", alignItems: "center" },
  zoomClose: { position: "absolute", top: 48, right: 16, zIndex: 2, padding: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20 },
  zoomedImg: { width: "100%", height: "80%" },
});
