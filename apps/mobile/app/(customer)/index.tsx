import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useCartStore } from "../../store/cartStore";

const categories = [
  { id: "1", name: "Engine", icon: "car-outline" },
  { id: "2", name: "Brake", icon: "disc-outline" },
  { id: "3", name: "Electrical", icon: "flash-outline" },
  { id: "4", name: "Exterior", icon: "car-sport-outline" },
];

const featuredParts = [
  {
    id: "1",
    name: "Brake Pad Set - Front",
    price: 89.99,
    supplier: "AutoMax Parts",
    stock: "In Stock",
    image: null,
    rating: 4.8,
  },
  {
    id: "2",
    name: "Oil Filter Premium",
    price: 24.99,
    supplier: "SpeedPro Supply",
    stock: "In Stock",
    image: null,
    rating: 4.6,
  },
  {
    id: "3",
    name: "Ceramic Brake Pad Set",
    price: 129.99,
    supplier: "BrakeMaster Pro",
    stock: "In Stock",
    image: null,
    rating: 4.9,
  },
  {
    id: "4",
    name: "Air Filter High Flow",
    price: 34.99,
    supplier: "AirMax Parts",
    stock: "Low Stock",
    image: null,
    rating: 4.7,
  },
];

export default function CustomerHomeScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const { addItem, getTotalItems } = useCartStore();
  const cartItemCount = getTotalItems();

  const handleAddToCart = (product: typeof featuredParts[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      supplier: product.supplier,
    });
    Alert.alert("Success", `${product.name} added to cart!`);
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      router.push(`/(customer)/categories?search=${searchQuery}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>AutoParts</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.cartButton} onPress={() => router.push("/(customer)/cart")}>
            <Ionicons name="cart-outline" size={24} color="#000" />
            {cartItemCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{cartItemCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for parts..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#999"
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Select Vehicle Button */}
        <TouchableOpacity
          style={styles.vehicleButton}
          onPress={() => router.push("/vehicle/" as any)}
        >
          <Ionicons name="car-outline" size={20} color="#fff" />
          <Text style={styles.vehicleButtonText}>Select Your Vehicle</Text>
          <Ionicons name="chevron-down-outline" size={20} color="#fff" />
        </TouchableOpacity>

        {/* Browse Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse Categories</Text>
          <View style={styles.categoriesGrid}>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => router.push(`/(customer)/categories?category=${category.name}`)}
              >
                <View style={styles.categoryIcon}>
                  <Ionicons name={category.icon as any} size={28} color="#4285F4" />
                </View>
                <Text style={styles.categoryName}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Featured Parts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Featured Parts</Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/categories")}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {featuredParts.map((part) => (
            <TouchableOpacity
              key={part.id}
              style={styles.productCard}
              onPress={() => router.push(`/product/${part.id}` as any)}
            >
              <View style={styles.productImage}>
                <Ionicons name="car-outline" size={40} color="#ccc" />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{part.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFA000" />
                  <Text style={styles.rating}>{part.rating}</Text>
                </View>
                <Text style={styles.productSupplier}>by {part.supplier}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>${part.price}</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddToCart(part)}
                  >
                    <Ionicons name="cart-outline" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  logo: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4285F4",
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  cartButton: {
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    marginTop: 16,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
  },
  vehicleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4285F4",
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 24,
    gap: 8,
  },
  vehicleButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  viewAllText: {
    color: "#4285F4",
    fontSize: 14,
    fontWeight: "600",
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  categoryCard: {
    width: "23%",
    alignItems: "center",
    gap: 8,
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryName: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  productCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  productImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
    justifyContent: "space-between",
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  rating: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  productSupplier: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#4285F4",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4285F4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});
