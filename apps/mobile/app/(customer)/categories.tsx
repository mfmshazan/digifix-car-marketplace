import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAllCategories, Category } from "../../src/api/categories";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_SIZE = (SCREEN_WIDTH - 16 * 3) / 2;  // 2-col grid with 16px gutters

// ── Icon map (same list used by salesman dashboard) ──────────
const CATEGORY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Engine Parts": "cog", "Engine": "cog",
  "Brake System": "disc", "Brakes": "disc",
  "Filters": "filter",
  "Electrical": "flash",
  "Suspension": "car-sport",
  "Cooling System": "water",
  "Exhaust System": "cloud",
  "Transmission": "settings",
  "Body Parts": "car",
  "Lighting": "bulb",
  "Interior": "tablet-portrait",
  "Accessories": "diamond-outline",
};
const catIcon = (name: string): keyof typeof Ionicons.glyphMap => CATEGORY_ICONS[name] ?? "cube-outline";

// Subtle accent colours per category family
const CATEGORY_ACCENTS: Record<string, string> = {
  "Engine Parts": "#3B82F6", "Engine": "#3B82F6",
  "Brake System": "#EF4444", "Brakes": "#EF4444",
  "Filters": "#F59E0B",
  "Electrical": "#FBBF24",
  "Suspension": "#8B5CF6",
  "Cooling System": "#06B6D4",
  "Exhaust System": "#6B7280",
  "Transmission": "#10B981",
  "Body Parts": "#F97316",
  "Lighting": "#FDE68A",
  "Interior": "#A78BFA",
  "Accessories": "#EC4899",
};
const catAccent = (name: string) => CATEGORY_ACCENTS[name] ?? "#8BAAFE";

// Mock fallback
const MOCK_CATEGORIES: Category[] = [
  { id: "mock-1",  name: "Engine Parts" },
  { id: "mock-2",  name: "Brake System" },
  { id: "mock-3",  name: "Filters" },
  { id: "mock-4",  name: "Electrical" },
  { id: "mock-5",  name: "Suspension" },
  { id: "mock-6",  name: "Cooling System" },
  { id: "mock-7",  name: "Exhaust System" },
  { id: "mock-8",  name: "Transmission" },
  { id: "mock-9",  name: "Body Parts" },
  { id: "mock-10", name: "Lighting" },
  { id: "mock-11", name: "Interior" },
  { id: "mock-12", name: "Accessories" },
];

export default function CategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const res = await getAllCategories();
      if (res.success && res.data.length > 0) setCategories(res.data);
    } catch { /* keep mock */ } finally { setIsLoading(false); }
  };

  const handleCategoryPress = (cat: Category) => {
    router.push({
      pathname: "/(customer)/category-results",
      params: { categoryId: cat.id, categoryName: cat.name },
    });
  };

  const partsCount = (cat: Category) => {
    if (cat.totalPartsCount !== undefined) return cat.totalPartsCount;
    if (cat._count) return (cat._count.products ?? 0) + (cat._count.carParts ?? 0);
    return null;
  };

  const renderCategory = ({ item }: { item: Category }) => {
    const accent = catAccent(item.name);
    const count = partsCount(item);
    return (
      <TouchableOpacity style={styles.card} onPress={() => handleCategoryPress(item)} activeOpacity={0.8}>
        <View style={[styles.iconCircle, { backgroundColor: accent + "18", borderColor: accent + "30" }]}>
          <Ionicons name={catIcon(item.name)} size={30} color={accent} />
        </View>
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        {count != null && (
          <Text style={styles.cardCount}>{count} items</Text>
        )}
        <View style={[styles.arrow, { backgroundColor: accent + "20" }]}>
          <Ionicons name="arrow-forward" size={13} color={accent} />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00002E" />
        </View>
      ) : (
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.heading}>All Categories</Text>
          }
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="folder-open-outline" size={56} color="#CCC" />
              <Text style={styles.emptyText}>No categories yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F9FAFB" },

  heading: { fontSize: 22, fontWeight: "700", color: "#1A1A2E", paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },
  grid: { paddingHorizontal: 16, paddingBottom: 32 },
  row: { justifyContent: "space-between", marginBottom: 12 },

  card: {
    width: CARD_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    position: "relative",
    minHeight: 140,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  cardName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E", marginBottom: 4, lineHeight: 20 },
  cardCount: { fontSize: 11, color: "#6B7280" },
  arrow: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },

  emptyWrap: { alignItems: "center", paddingVertical: 60 },
  emptyText: { color: "#999", fontSize: 15, marginTop: 12 },
});



