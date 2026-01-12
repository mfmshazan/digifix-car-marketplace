import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCartStore } from "../../store/cartStore";

const allProducts = [
  {
    id: "1",
    name: "Ceramic Brake Pad Set",
    price: 129.99,
    supplier: "BrakeMaster Pro",
    stock: "In Stock",
    category: "Brake",
    rating: 4.9,
  },
  {
    id: "2",
    name: "Brake Rotor - Front Pair",
    price: 179.99,
    supplier: "AutoMax Parts",
    stock: "Low Stock",
    category: "Brake",
    rating: 4.7,
  },
  {
    id: "3",
    name: "Brake Caliper Assembly",
    price: 249.99,
    supplier: "SpeedPro Supply",
    stock: "In Stock",
    category: "Brake",
    rating: 4.8,
  },
  {
    id: "4",
    name: "Oil Filter Premium",
    price: 24.99,
    supplier: "FilterMax",
    stock: "In Stock",
    category: "Engine",
    rating: 4.6,
  },
  {
    id: "5",
    name: "Air Filter High Flow",
    price: 34.99,
    supplier: "AirMax Parts",
    stock: "In Stock",
    category: "Engine",
    rating: 4.7,
  },
  {
    id: "6",
    name: "Spark Plug Set (4 Pack)",
    price: 49.99,
    supplier: "IgnitionPro",
    stock: "In Stock",
    category: "Electrical",
    rating: 4.8,
  },
];

export default function CategoriesScreen() {
  const params = useLocalSearchParams();
  const { addItem } = useCartStore();
  const [searchQuery, setSearchQuery] = useState((params.search as string) || "");
  const [selectedCategory, setSelectedCategory] = useState((params.category as string) || "All");
  const [sortBy, setSortBy] = useState("popular");

  const filteredProducts = allProducts.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === "price-low") return a.price - b.price;
    if (sortBy === "price-high") return b.price - a.price;
    if (sortBy === "rating") return b.rating - a.rating;
    return 0;
  });

  const handleAddToCart = (product: typeof allProducts[0]) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      supplier: product.supplier,
    });
    Alert.alert("Success", `${product.name} added to cart!`);
  };

  const categories = ["All", "Brake", "Engine", "Electrical", "Exterior"];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Browse Parts</Text>
        <TouchableOpacity onPress={() => router.push("/(customer)/cart")}>
          <Ionicons name="cart-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search parts..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Categories Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriesScroll}>
        <View style={styles.categoriesContainer}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.categoryChip,
                selectedCategory === category && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === category && styles.categoryChipTextActive,
                ]}
              >
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <Text style={styles.resultCount}>{sortedProducts.length} Results</Text>
        <TouchableOpacity
          style={styles.sortButton}
          onPress={() => {
            Alert.alert("Sort By", "Choose sorting option", [
              { text: "Popular", onPress: () => setSortBy("popular") },
              { text: "Price: Low to High", onPress: () => setSortBy("price-low") },
              { text: "Price: High to Low", onPress: () => setSortBy("price-high") },
              { text: "Rating", onPress: () => setSortBy("rating") },
              { text: "Cancel", style: "cancel" },
            ]);
          }}
        >
          <Ionicons name="swap-vertical-outline" size={18} color="#4285F4" />
          <Text style={styles.sortButtonText}>Sort</Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sortedProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No parts found</Text>
            <Text style={styles.emptyText}>Try a different search or category</Text>
          </View>
        ) : (
          sortedProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => router.push(`/product/${product.id}` as any)}
            >
              <View style={styles.productImage}>
                <Ionicons name="car-outline" size={50} color="#ccc" />
              </View>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{product.name}</Text>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#FFA000" />
                  <Text style={styles.rating}>{product.rating}</Text>
                </View>
                <Text style={styles.productSupplier}>by {product.supplier}</Text>
                <View style={styles.productFooter}>
                  <Text style={styles.productPrice}>${product.price}</Text>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddToCart(product)}
                  >
                    <Ionicons name="cart-outline" size={18} color="#fff" />
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    marginHorizontal: 20,
    marginVertical: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
  },
  categoriesScroll: {
    maxHeight: 50,
  },
  categoriesContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
  },
  categoryChipActive: {
    backgroundColor: "#E8F0FE",
  },
  categoryChipText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  categoryChipTextActive: {
    color: "#4285F4",
    fontWeight: "600",
  },
  sortContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  resultCount: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sortButtonText: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "600",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
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
