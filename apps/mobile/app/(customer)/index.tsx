import React, { useState, useEffect } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { searchPartsByNumberPlate, getAllCarParts, CarPart, Car } from "../../src/api/carParts";
import { useCart } from "../../src/store/cartStore";

// Sample data for promotions - Blue, Black & White Theme
const promotions = [
  {
    id: "1",
    title: "Find Parts Fast",
    description: "Search by your car number plate",
    backgroundColor: "#00002E",
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "On orders over Rs. 5000",
    backgroundColor: "#1A1A1A",
  },
];

// Categories with blue, black, and white accent theme
const categories = [
  { id: "1", name: "Engine", icon: "cog", color: "#00002E" },
  { id: "2", name: "Brakes", icon: "disc", color: "#00002E" },
  { id: "3", name: "Filters", icon: "filter", color: "#00002E" },
  { id: "4", name: "Electrical", icon: "flash", color: "#1A1A1A" },
  { id: "5", name: "Suspension", icon: "car-sport", color: "#00002E" },
  { id: "6", name: "More", icon: "ellipsis-horizontal", color: "#6B7280" },
];

export default function CustomerHomeScreen() {
  const [numberPlateQuery, setNumberPlateQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ car: Car; parts: CarPart[] } | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [featuredParts, setFeaturedParts] = useState<CarPart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { addItem } = useCart();

  // Handle adding item to cart
  const handleAddToCart = async (part: CarPart) => {
    try {
      await addItem({
        productId: part.id,
        itemType: 'CAR_PART',
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: `${part.car.make} ${part.car.model} (${part.car.year})`,
        categoryName: part.category.name,
      });
      Alert.alert(
        "Added to Cart",
        `${part.name} has been added to your cart.`,
        [{ text: "OK" }]
      );
    } catch (error: any) {
      Alert.alert("Add to Cart Failed", error?.message || "Please try again.");
    }
  };

  // Load featured parts on mount
  useEffect(() => {
    loadFeaturedParts();
  }, []);

  const loadFeaturedParts = async () => {
    try {
      setIsLoading(true);
      const response = await getAllCarParts({ limit: 20 });
      if (response.success) {
        setFeaturedParts(response.data.parts);
      }
    } catch (error) {
      console.error("Failed to load featured parts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle number plate search
  const handleSearchByNumberPlate = async () => {
    if (!numberPlateQuery.trim()) {
      Alert.alert("Enter Number Plate", "Please enter a car number plate to search");
      return;
    }

    try {
      setIsSearching(true);
      const response = await searchPartsByNumberPlate(numberPlateQuery.trim());

      if (response.success && response.data) {
        setSearchResults({
          car: response.data.car,
          parts: response.data.parts,
        });
        setShowResults(true);
      } else {
        Alert.alert(
          "No Results",
          `No car found with number plate "${numberPlateQuery.toUpperCase()}". Please check the number plate and try again.`
        );
      }
    } catch (error) {
      console.error("Search error:", error);
      Alert.alert("Search Failed", "Could not search for parts. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const renderCategoryItem = ({ item }: { item: (typeof categories)[0] }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPartItem = ({ item }: { item: CarPart }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productImageContainer}>
        {item.images && item.images.length > 0 ? (
          <Image
            source={{ uri: item.images[0] }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="car-sport" size={40} color="#00002E" />
          </View>
        )}
        <View style={[styles.conditionBadge, {
          backgroundColor: item.condition === 'NEW' ? '#16A34A' : item.condition === 'USED' ? '#00002E' : '#1A1A1A'
        }]}>
          <Text style={styles.conditionText}>{item.condition}</Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{item.seller.name}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <Text style={styles.carInfo} numberOfLines={1}>
          {item.car.make} {item.car.model} ({item.car.year})
        </Text>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>Rs. {(item.discountPrice || item.price).toLocaleString()}</Text>
          {item.discountPrice && (
            <Text style={styles.originalPrice}>Rs. {item.price.toLocaleString()}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.addToCartButton}
        onPress={() => handleAddToCart(item)}
      >
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderPromotionItem = ({ item }: { item: (typeof promotions)[0] }) => (
    <TouchableOpacity
      style={[styles.promotionCard, { backgroundColor: item.backgroundColor }]}
    >
      <Text style={styles.promotionTitle}>{item.title}</Text>
      <Text style={styles.promotionDescription}>{item.description}</Text>
      <TouchableOpacity style={styles.promotionButton}>
        <Text style={styles.promotionButtonText}>Shop Now</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Search Results Modal
  const renderSearchResultsModal = () => (
    <Modal
      visible={showResults}
      animationType="slide"
      onRequestClose={() => setShowResults(false)}
    >
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowResults(false)}>
            <Ionicons name="arrow-back" size={24} color="#1A1A2E" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Search Results</Text>
          <View style={{ width: 24 }} />
        </View>

        {searchResults && (
          <>
            {/* Car Info Card */}
            <View style={styles.carInfoCard}>
              <View style={styles.carInfoHeader}>
                <Ionicons name="car" size={32} color="#FF6B35" />
                <View style={styles.carInfoText}>
                  <Text style={styles.numberPlateText}>{searchResults.car.numberPlate}</Text>
                  <Text style={styles.carModelText}>
                    {searchResults.car.make} {searchResults.car.model} ({searchResults.car.year})
                  </Text>
                  {searchResults.car.engineType && (
                    <Text style={styles.carEngineText}>{searchResults.car.engineType}</Text>
                  )}
                </View>
              </View>
              {searchResults.car.images && searchResults.car.images.length > 0 && (
                <Image
                  source={{ uri: searchResults.car.images[0] }}
                  style={styles.carImage}
                  resizeMode="cover"
                />
              )}
            </View>

            {/* Parts Count */}
            <View style={styles.partsCountContainer}>
              <Text style={styles.partsCountText}>
                {searchResults.parts.length} parts available
              </Text>
            </View>

            {/* Parts List */}
            <FlatList
              data={searchResults.parts}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.partListItem}>
                  <View style={styles.partImageContainer}>
                    {item.images && item.images.length > 0 ? (
                      <Image
                        source={{ uri: item.images[0] }}
                        style={styles.partListImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.partListImagePlaceholder}>
                        <Ionicons name="construct" size={24} color="#FF6B35" />
                      </View>
                    )}
                  </View>
                  <View style={styles.partListInfo}>
                    <View style={styles.partListHeader}>
                      <Text style={styles.partListCategory}>{item.seller.name}</Text>
                      <View style={[styles.conditionBadgeSmall, {
                        backgroundColor: item.condition === 'NEW' ? '#4ECDC4' : item.condition === 'USED' ? '#FF6B35' : '#9B59B6'
                      }]}>
                        <Text style={styles.conditionTextSmall}>{item.condition}</Text>
                      </View>
                    </View>
                    <Text style={styles.partListName} numberOfLines={2}>{item.name}</Text>
                    {item.partNumber && (
                      <Text style={styles.partNumber}>Part #: {item.partNumber}</Text>
                    )}
                    <View style={styles.partListPriceRow}>
                      <Text style={styles.partListPrice}>
                        Rs. {(item.discountPrice || item.price).toLocaleString()}
                      </Text>
                      {item.discountPrice && (
                        <Text style={styles.partListOriginalPrice}>
                          Rs. {item.price.toLocaleString()}
                        </Text>
                      )}
                      <Text style={styles.stockText}>
                        {item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddToCart(item)}
                    disabled={item.stock <= 0}
                  >
                    <Ionicons
                      name="add-circle"
                      size={32}
                      color={item.stock > 0 ? "#00002E" : "#CCC"}
                    />
                  </TouchableOpacity>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.partsList}
              showsVerticalScrollIndicator={false}
            />
          </>
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Number Plate Search Bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchTitle}>Find Parts by Number Plate</Text>
          <View style={styles.searchBar}>
            <Ionicons name="car" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Enter number plate"
              placeholderTextColor="#999"
              value={numberPlateQuery}
              onChangeText={setNumberPlateQuery}
              autoCapitalize="characters"
              onSubmitEditing={handleSearchByNumberPlate}
            />
            <TouchableOpacity
              onPress={handleSearchByNumberPlate}
              style={styles.searchButton}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Ionicons name="search" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.searchHint}>
            Try: CAB-1234, WP-KA-5678, CAA-9012, WP-CAD-3456, CAC-7890
          </Text>
        </View>

        {/* Promotions Carousel */}
        <View style={styles.section}>
          <FlatList
            data={promotions}
            renderItem={renderPromotionItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promotionsList}
          />
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            renderItem={renderCategoryItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Parts</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color="#00002E" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={featuredParts}
              renderItem={renderPartItem}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionItem} onPress={() => {
              // Focus on number plate search
              Alert.alert("Search by Number Plate", "Enter your car number plate above to find compatible parts!");
            }}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#E5E7EB" }]}>
                <Ionicons name="car" size={24} color="#00002E" />
              </View>
              <Text style={styles.quickActionText}>Find by Plate</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#F3F4F6" }]}>
                <Ionicons name="barcode" size={24} color="#1A1A1A" />
              </View>
              <Text style={styles.quickActionText}>Scan Part Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickActionItem}>
              <View style={[styles.quickActionIcon, { backgroundColor: "#E5E7EB" }]}>
                <Ionicons name="location" size={24} color="#00002E" />
              </View>
              <Text style={styles.quickActionText}>Track Order</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Best Sellers */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {isLoading ? (
            <ActivityIndicator size="large" color="#00002E" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={featuredParts.slice().reverse()}
              renderItem={renderPartItem}
              keyExtractor={(item) => `best-${item.id}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsList}
            />
          )}
        </View>
      </ScrollView>

      {/* Search Results Modal */}
      {renderSearchResultsModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#00002E",
  },
  searchTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingLeft: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A1A2E",
  },
  searchButton: {
    backgroundColor: "#00002E",
    height: 48,
    width: 48,
    justifyContent: "center",
    alignItems: "center",
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  searchHint: {
    fontSize: 11,
    color: "#FFFFFF",
    opacity: 0.8,
    marginTop: 8,
  },
  section: {
    marginTop: 20,
  },
  lastSection: {
    marginBottom: 20,
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
    fontWeight: "600",
    color: "#1A1A2E",
    paddingHorizontal: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: "#00002E",
    fontWeight: "500",
  },
  promotionsList: {
    paddingHorizontal: 16,
  },
  promotionCard: {
    width: 280,
    height: 140,
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    justifyContent: "space-between",
  },
  promotionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
  },
  promotionDescription: {
    fontSize: 14,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  promotionButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  promotionButtonText: {
    color: "#1A1A2E",
    fontWeight: "600",
    fontSize: 12,
  },
  categoriesList: {
    paddingHorizontal: 16,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 20,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  productsList: {
    paddingHorizontal: 16,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: 180,
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  productImageContainer: {
    position: "relative",
  },
  productImage: {
    height: 120,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: "100%",
  },
  productImagePlaceholder: {
    height: 120,
    backgroundColor: "#E5E7EB",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#00002E",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountBadgeOuter: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#00002E",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  discountTextOuter: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "bold",
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  conditionBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  conditionText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "bold",
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    color: "#00002E",
    fontWeight: "500",
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  carInfo: {
    fontSize: 11,
    color: "#666",
    marginBottom: 6,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#00002E",
  },
  originalPrice: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  addToCartButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#00002E",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  quickActionItem: {
    alignItems: "center",
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
  },
  carInfoCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  carInfoHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  carInfoText: {
    marginLeft: 16,
    flex: 1,
  },
  numberPlateText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#00002E",
    marginBottom: 4,
  },
  carModelText: {
    fontSize: 16,
    color: "#1A1A2E",
    fontWeight: "500",
  },
  carEngineText: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  carImage: {
    height: 150,
    borderRadius: 12,
    marginTop: 16,
    width: "100%",
  },
  partsCountContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  partsCountText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  partsList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  partListItem: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  partImageContainer: {
    marginRight: 12,
  },
  partListImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  partListImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  partListInfo: {
    flex: 1,
  },
  partListHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  partListCategory: {
    fontSize: 11,
    color: "#00002E",
    fontWeight: "500",
    marginRight: 8,
  },
  conditionBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  conditionTextSmall: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "bold",
  },
  partListName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  partNumber: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  partListPriceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  partListPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#00002E",
  },
  partListOriginalPrice: {
    fontSize: 11,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  stockText: {
    fontSize: 11,
    color: "#4ECDC4",
    marginLeft: "auto",
  },
  addButton: {
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});



