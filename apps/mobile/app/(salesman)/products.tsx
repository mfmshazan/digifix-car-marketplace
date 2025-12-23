import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Sample products data
const sampleProducts = [
  {
    id: "1",
    name: "Brake Pads Set",
    price: 45.99,
    stock: 24,
    category: "Brakes",
    status: "Active",
    sales: 156,
  },
  {
    id: "2",
    name: "Oil Filter Premium",
    price: 12.99,
    stock: 89,
    category: "Filters",
    status: "Active",
    sales: 234,
  },
  {
    id: "3",
    name: "Spark Plugs (4 Pack)",
    price: 24.99,
    stock: 45,
    category: "Engine",
    status: "Active",
    sales: 189,
  },
  {
    id: "4",
    name: "Air Filter",
    price: 19.99,
    stock: 0,
    category: "Filters",
    status: "Out of Stock",
    sales: 145,
  },
  {
    id: "5",
    name: "Headlight Bulb H7",
    price: 15.99,
    stock: 67,
    category: "Lighting",
    status: "Active",
    sales: 98,
  },
  {
    id: "6",
    name: "Wiper Blades Set",
    price: 22.99,
    stock: 34,
    category: "Accessories",
    status: "Active",
    sales: 76,
  },
];

export default function ProductsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const filters = ["All", "Active", "Out of Stock", "Low Stock"];

  const filteredProducts = sampleProducts.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    
    if (filter === "All") return matchesSearch;
    if (filter === "Active") return matchesSearch && product.status === "Active";
    if (filter === "Out of Stock") return matchesSearch && product.stock === 0;
    if (filter === "Low Stock") return matchesSearch && product.stock > 0 && product.stock <= 10;
    
    return matchesSearch;
  });

  const renderProduct = ({ item }: { item: (typeof sampleProducts)[0] }) => (
    <TouchableOpacity style={styles.productCard}>
      <View style={styles.productImage}>
        <Ionicons name="cube" size={32} color="#FF6B35" />
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productCategory}>{item.category}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          <View
            style={[
              styles.stockBadge,
              {
                backgroundColor:
                  item.stock === 0
                    ? "#FF444420"
                    : item.stock <= 10
                    ? "#FF980020"
                    : "#4CAF5020",
              },
            ]}
          >
            <Text
              style={[
                styles.stockText,
                {
                  color:
                    item.stock === 0
                      ? "#FF4444"
                      : item.stock <= 10
                      ? "#FF9800"
                      : "#4CAF50",
                },
              ]}
            >
              {item.stock === 0 ? "Out of Stock" : `${item.stock} in stock`}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color="#FF4444" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.filterChip,
                filter === item && styles.filterChipActive,
              ]}
              onPress={() => setFilter(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  filter === item && styles.filterChipTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          )}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Products Count */}
      <View style={styles.countContainer}>
        <Text style={styles.countText}>
          {filteredProducts.length} product(s) found
        </Text>
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
    </View>
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
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#1A1A2E",
  },
  filtersContainer: {
    paddingBottom: 12,
  },
  filtersList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  filterChipActive: {
    backgroundColor: "#FF6B35",
    borderColor: "#FF6B35",
  },
  filterChipText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  countContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  countText: {
    fontSize: 13,
    color: "#999",
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  productCard: {
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
  productImage: {
    width: 64,
    height: 64,
    backgroundColor: "#FFF3EE",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF6B35",
    marginRight: 12,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  stockText: {
    fontSize: 11,
    fontWeight: "600",
  },
  productActions: {
    flexDirection: "column",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#999",
  },
});
