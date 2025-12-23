import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const categories = [
  { id: "1", name: "Engine Parts", icon: "cog", count: 245, color: "#FF6B35" },
  { id: "2", name: "Brake System", icon: "disc", count: 128, color: "#4ECDC4" },
  { id: "3", name: "Filters", icon: "filter", count: 89, color: "#45B7D1" },
  { id: "4", name: "Electrical", icon: "flash", count: 156, color: "#96CEB4" },
  { id: "5", name: "Suspension", icon: "car-sport", count: 112, color: "#DDA0DD" },
  { id: "6", name: "Cooling System", icon: "water", count: 67, color: "#87CEEB" },
  { id: "7", name: "Exhaust System", icon: "cloud", count: 54, color: "#F4A460" },
  { id: "8", name: "Transmission", icon: "settings", count: 98, color: "#9370DB" },
  { id: "9", name: "Body Parts", icon: "car", count: 321, color: "#20B2AA" },
  { id: "10", name: "Lighting", icon: "bulb", count: 143, color: "#FFD700" },
  { id: "11", name: "Interior", icon: "tablet-portrait", count: 87, color: "#FF69B4" },
  { id: "12", name: "Accessories", icon: "diamond", count: 234, color: "#00CED1" },
];

export default function CategoriesScreen() {
  const renderCategory = ({ item }: { item: (typeof categories)[0] }) => (
    <TouchableOpacity style={styles.categoryCard}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + "20" }]}>
        <Ionicons name={item.icon as any} size={32} color={item.color} />
      </View>
      <View style={styles.categoryInfo}>
        <Text style={styles.categoryName}>{item.name}</Text>
        <Text style={styles.categoryCount}>{item.count} products</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
    color: "#999",
  },
});
