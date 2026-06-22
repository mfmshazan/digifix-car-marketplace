import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { wishlistApi } from "../../src/api/wishlist";
import { useCart } from "../../src/store/cartStore";

export default function WishlistScreen() {
  const [wishlistItems, setWishlistItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setIsLoading(true);
      const response = await wishlistApi.getWishlist();
      if (response.success) {
        setWishlistItems(response.data);
      }
    } catch (error) {
      console.error("Failed to load wishlist:", error);
      Alert.alert("Error", "Could not load your wishlist.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (id: string) => {
    try {
      // Optimistic UI update
      setWishlistItems((prev) => prev.filter((item) => item.id !== id));
      await wishlistApi.removeFromWishlist(id);
    } catch (error) {
      console.error("Failed to remove item:", error);
      Alert.alert("Error", "Could not remove item from wishlist.");
      loadWishlist(); // Revert on failure
    }
  };

  const handleAddToCart = async (wishlistItem: any) => {
    const part = wishlistItem.carPart || wishlistItem.product;
    if (!part) return;

    try {
      await addItem({
        productId: part.id,
        itemType: wishlistItem.itemType,
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: part.car ? `${part.car.make} ${part.car.model} (${part.car.year})` : undefined,
        categoryName: part.category?.name || "Product",
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

  const renderWishlistItem = ({ item }: { item: any }) => {
    const part = item.carPart || item.product;
    if (!part) return null;

    return (
      <View style={styles.wishlistCard}>
        <View style={styles.imageContainer}>
          {part.images && part.images.length > 0 ? (
            <Image
              source={{ uri: part.images[0] }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="car-sport" size={32} color="#00002E" />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.sellerName}>{part.seller?.name || "Seller"}</Text>
            <TouchableOpacity onPress={() => handleRemoveFromWishlist(item.id)}>
              <Ionicons name="trash-outline" size={20} color="#FF4444" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.productName} numberOfLines={2}>
            {part.name}
          </Text>

          {part.car && (
            <Text style={styles.carInfo} numberOfLines={1}>
              {part.car.make} {part.car.model} ({part.car.year})
            </Text>
          )}

          <View style={styles.bottomRow}>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>
                Rs. {(part.discountPrice || part.price).toLocaleString()}
              </Text>
              {part.discountPrice && (
                <Text style={styles.originalPrice}>
                  Rs. {part.price.toLocaleString()}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.addToCartBtn}
              onPress={() => handleAddToCart(item)}
              disabled={part.stock <= 0}
            >
              <Ionicons 
                name="cart" 
                size={18} 
                color={part.stock > 0 ? "#FFFFFF" : "#CCC"} 
              />
              <Text style={[styles.addToCartText, part.stock <= 0 && styles.disabledText]}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlist</Text>
        <View style={{ width: 24 }} />
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={80} color="#E5E7EB" />
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptySubtitle}>
            Save items you love and buy them later.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push("/(customer)")}
          >
            <Text style={styles.browseButtonText}>Browse Parts</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          renderItem={renderWishlistItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1A1A2E",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 32,
  },
  browseButton: {
    backgroundColor: "#00002E",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  listContainer: {
    padding: 16,
  },
  wishlistCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  imageContainer: {
    width: 90,
    height: 90,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 12,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  sellerName: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginTop: 4,
  },
  carInfo: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 8,
  },
  priceContainer: {
    flex: 1,
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#00002E",
  },
  originalPrice: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
  },
  addToCartBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00002E",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addToCartText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  disabledText: {
    color: "#CCC",
  },
});
