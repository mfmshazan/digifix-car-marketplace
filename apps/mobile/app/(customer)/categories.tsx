import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAllCategories, getPartsByCategoryName, Category } from "../../src/api/categories";
import { useCart } from "../../src/store/cartStore";

// Icon mapping for category names
const categoryIconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Engine Parts': 'cog',
  'Engine': 'cog',
  'Brake System': 'disc',
  'Brakes': 'disc',
  'Filters': 'filter',
  'Electrical': 'flash',
  'Suspension': 'car-sport',
  'Cooling System': 'water',
  'Exhaust System': 'cloud',
  'Transmission': 'settings',
  'Body Parts': 'car',
  'Lighting': 'bulb',
  'Interior': 'tablet-portrait',
  'Accessories': 'diamond',
};

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryParts, setCategoryParts] = useState<any[]>([]);
  const [isLoadingParts, setIsLoadingParts] = useState(false);
  const [showPartsModal, setShowPartsModal] = useState(false);
  const router = useRouter();
  const { addItem } = useCart();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await getAllCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCategoryPress = async (category: Category) => {
    setSelectedCategory(category);
    setShowPartsModal(true);
    setIsLoadingParts(true);
    
    try {
      const response = await getPartsByCategoryName(category.name);
      if (response.success) {
        setCategoryParts(response.data.carParts || []);
      }
    } catch (error) {
      console.error("Failed to load category parts:", error);
      setCategoryParts([]);
    } finally {
      setIsLoadingParts(false);
    }
  };

  const handleAddToCart = async (part: any) => {
    try {
      await addItem({
        productId: part.id,
        itemType: 'CAR_PART',
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: `${part.car.make} ${part.car.model} (${part.car.year})`,
        categoryName: selectedCategory?.name,
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

  const getCategoryIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    return categoryIconMap[name] || 'cube';
  };

  const getPartsCount = (category: Category) => {
    if (category.totalPartsCount !== undefined) return category.totalPartsCount;
    if (category._count) {
      return (category._count.products || 0) + (category._count.carParts || 0);
    }
    return 0;
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={styles.categoryCard}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: "#00002E20" }]}>
        <Ionicons name={getCategoryIcon(item.name)} size={32} color="#00002E" />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{getPartsCount(item)} parts</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderPartItem = ({ item }: { item: any }) => (
    <View style={styles.partCard}>
      <View style={styles.partImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.partImage} />
        ) : (
          <View style={styles.partImagePlaceholder}>
            <Ionicons name="car-sport" size={32} color="#00002E" />
          </View>
        )}
        <View pointerEvents="none" style={[styles.conditionBadge, {
          backgroundColor: item.condition === 'NEW' ? '#10B981' : item.condition === 'USED' ? '#00002E' : '#6B7280'
        }]}>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>
      </View>
      <View style={styles.partInfo}>
        <Text style={styles.partCarInfo}>
          {item.car.make} {item.car.model} ({item.car.year})
        </Text>
        <Text style={styles.partName} numberOfLines={2}>{item.name}</Text>
        <View style={styles.priceRow}>
          <Text style={styles.partPrice}>
            Rs. {(item.discountPrice || item.price).toLocaleString()}
          </Text>
          {item.discountPrice && (
            <Text style={styles.originalPrice}>
              Rs. {item.price.toLocaleString()}
            </Text>
          )}
        </View>
        <Text style={styles.stockText}>
          {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
        </Text>
      </View>
      <TouchableOpacity 
        style={[styles.addButton, item.stock <= 0 && styles.addButtonDisabled]}
        onPress={() => handleAddToCart(item)}
        disabled={item.stock <= 0}
      >
        <Ionicons name="add" size={24} color={item.stock > 0 ? "#FFFFFF" : "#999"} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color="#CCC" />
            <Text style={styles.emptyText}>No categories available</Text>
          </View>
        }
      />

      {/* Category Parts Modal */}
      <Modal
        visible={showPartsModal}
        animationType="slide"
        onRequestClose={() => setShowPartsModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowPartsModal(false)}>
              <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedCategory?.name}</Text>
            <View style={{ width: 24 }} />
          </View>

          {isLoadingParts ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00002E" />
            </View>
          ) : categoryParts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="cube-outline" size={64} color="#CCC" />
              <Text style={styles.emptyText}>No parts in this category yet</Text>
            </View>
          ) : (
            <FlatList
              data={categoryParts}
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
  list: {
    padding: 16,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
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
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 14,
    color: "#6B7280",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
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
    paddingVertical: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  partsList: {
    padding: 16,
  },
  partCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
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
  },
  conditionBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "600",
  },
  partInfo: {
    flex: 1,
  },
  partCarInfo: {
    fontSize: 10,
    color: "#00002E",
    fontWeight: "600",
    marginBottom: 2,
  },
  partName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  partPrice: {
    fontSize: 16,
    fontWeight: "bold",
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
    marginTop: 2,
  },
  addButton: {
    width: 40,
    height: 40,
    backgroundColor: "#00002E",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
  },
  addButtonDisabled: {
    backgroundColor: "#E5E7EB",
  },
});



