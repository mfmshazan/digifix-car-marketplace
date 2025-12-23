import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Sample data for car parts
const featuredParts = [
  {
    id: "1",
    name: "Brake Pads Set",
    price: 45.99,
    originalPrice: 59.99,
    rating: 4.8,
    reviews: 124,
    image: "https://via.placeholder.com/150/FF6B35/FFFFFF?text=Brake",
    category: "Brakes",
  },
  {
    id: "2",
    name: "Oil Filter Premium",
    price: 12.99,
    originalPrice: 18.99,
    rating: 4.6,
    reviews: 89,
    image: "https://via.placeholder.com/150/4ECDC4/FFFFFF?text=Filter",
    category: "Filters",
  },
  {
    id: "3",
    name: "Spark Plugs (4 Pack)",
    price: 24.99,
    originalPrice: 32.99,
    rating: 4.9,
    reviews: 256,
    image: "https://via.placeholder.com/150/45B7D1/FFFFFF?text=Spark",
    category: "Engine",
  },
  {
    id: "4",
    name: "Air Filter",
    price: 19.99,
    originalPrice: 25.99,
    rating: 4.7,
    reviews: 167,
    image: "https://via.placeholder.com/150/96CEB4/FFFFFF?text=Air",
    category: "Filters",
  },
];

const categories = [
  { id: "1", name: "Engine", icon: "cog", color: "#FF6B35" },
  { id: "2", name: "Brakes", icon: "disc", color: "#4ECDC4" },
  { id: "3", name: "Filters", icon: "filter", color: "#45B7D1" },
  { id: "4", name: "Electrical", icon: "flash", color: "#96CEB4" },
  { id: "5", name: "Suspension", icon: "car-sport", color: "#DDA0DD" },
  { id: "6", name: "More", icon: "ellipsis-horizontal", color: "#999" },
];

const promotions = [
  {
    id: "1",
    title: "Summer Sale",
    description: "Up to 40% off on brake systems",
    backgroundColor: "#FF6B35",
  },
  {
    id: "2",
    title: "Free Delivery",
    description: "On orders over $50",
    backgroundColor: "#4ECDC4",
  },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");

  const renderCategoryItem = ({ item }: { item: (typeof categories)[0] }) => (
    <TouchableOpacity style={styles.categoryItem}>
      <View style={[styles.categoryIcon, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderProductItem = ({ item }: { item: (typeof featuredParts)[0] }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productImageContainer}>
        <View style={styles.productImagePlaceholder}>
          <Ionicons name="car-sport" size={40} color="#FF6B35" />
        </View>
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>
            -{Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)}%
          </Text>
        </View>
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productCategory}>{item.category}</Text>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        <View style={styles.ratingContainer}>
          <Ionicons name="star" size={14} color="#FFD700" />
          <Text style={styles.ratingText}>{item.rating}</Text>
          <Text style={styles.reviewsText}>({item.reviews})</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>${item.price.toFixed(2)}</Text>
          <Text style={styles.originalPrice}>${item.originalPrice.toFixed(2)}</Text>
        </View>
      </View>
      <TouchableOpacity style={styles.addToCartButton}>
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search car parts..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity>
            <Ionicons name="options" size={20} color="#FF6B35" />
          </TouchableOpacity>
        </View>
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
        <FlatList
          data={featuredParts}
          renderItem={renderProductItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsList}
        />
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#FFF3EE" }]}>
              <Ionicons name="car" size={24} color="#FF6B35" />
            </View>
            <Text style={styles.quickActionText}>Find by Vehicle</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#E8F8F5" }]}>
              <Ionicons name="barcode" size={24} color="#4ECDC4" />
            </View>
            <Text style={styles.quickActionText}>Scan Part Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionItem}>
            <View style={[styles.quickActionIcon, { backgroundColor: "#EBF5FB" }]}>
              <Ionicons name="location" size={24} color="#45B7D1" />
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
        <FlatList
          data={featuredParts.slice().reverse()}
          renderItem={renderProductItem}
          keyExtractor={(item) => `best-${item.id}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.productsList}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FF6B35",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A1A2E",
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
  },
  seeAllText: {
    fontSize: 14,
    color: "#FF6B35",
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
    width: 160,
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
  productImagePlaceholder: {
    height: 120,
    backgroundColor: "#FFF3EE",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#FF6B35",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
  productInfo: {
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    color: "#999",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 6,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A2E",
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: "#999",
    marginLeft: 2,
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
  },
  originalPrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
    marginLeft: 8,
  },
  addToCartButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "#FF6B35",
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
});
