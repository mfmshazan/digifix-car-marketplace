import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getAllCarParts, CarPart } from "../../src/api/carParts";
import { getAllProducts, Product } from "../../src/api/products";

type ResultItem =
  | { kind: "part"; data: CarPart }
  | { kind: "product"; data: Product };

export default function CategoryResultsScreen() {
  const router = useRouter();
  const { categoryId, categoryName } = useLocalSearchParams<{ categoryId: string; categoryName: string }>();

  const [items, setItems] = useState<ResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (categoryId) loadCategoryItems();
  }, [categoryId]);

  const loadCategoryItems = async () => {
    try {
      setIsLoading(true);
      const [partsRes, productsRes] = await Promise.allSettled([
        getAllCarParts({ category: categoryId, limit: 30 }),
        getAllProducts({ category: categoryId, limit: 30 }),
      ]);
      const parts: ResultItem[] =
        partsRes.status === "fulfilled" && partsRes.value.success
          ? partsRes.value.data.parts.map((p) => ({ kind: "part" as const, data: p }))
          : [];
      const products: ResultItem[] =
        productsRes.status === "fulfilled" && productsRes.value.success
          ? productsRes.value.data.products.map((p) => ({ kind: "product" as const, data: p }))
          : [];
      setItems([...parts, ...products]);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const goToDetail = (item: ResultItem) => {
    router.push({
      pathname: "/(customer)/product-detail",
      params: {
        itemId: item.data.id,
        itemKind: item.kind,
        itemData: JSON.stringify(item.data),
      },
    });
  };

  const renderItem = ({ item }: { item: ResultItem }) => {
    const isPart = item.kind === "part";
    const p = item.data as any;
    const image: string | undefined = p.images?.[0];
    const displayPrice = (p.discountPrice ?? p.price) as number;
    const shopName = isPart ? p.seller?.name : p.salesman?.store?.name;
    const subLine = isPart
      ? p.car ? `${p.car.make} ${p.car.model} (${p.car.year})` : ""
      : p.description ?? "";

    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => goToDetail(item)}>
        {/* Image */}
        <View style={styles.imgWrap}>
          {image ? (
            <Image source={{ uri: image }} style={styles.img} resizeMode="cover" />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name={isPart ? "construct-outline" : "cube-outline"} size={32} color="#00002E" />
            </View>
          )}
          {isPart && p.condition && (
            <View style={[styles.badge, {
              backgroundColor: p.condition === "NEW" ? "#10B981" : p.condition === "USED" ? "#00002E" : "#6B7280"
            }]}>
              <Text style={styles.badgeText}>{p.condition}</Text>
            </View>
          )}
          <View style={styles.typePill}>
            <Text style={styles.typePillText}>{isPart ? "PART" : "PRODUCT"}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          {shopName ? <Text style={styles.shopName} numberOfLines={1}>{shopName}</Text> : null}
          <Text style={styles.itemName} numberOfLines={2}>{p.name}</Text>
          {subLine ? <Text style={styles.subText} numberOfLines={1}>{subLine}</Text> : null}
          {isPart && p.partNumber ? <Text style={styles.partNo}>Part #: {p.partNumber}</Text> : null}
          <View style={styles.priceRow}>
            <Text style={styles.price}>Rs. {displayPrice.toLocaleString()}</Text>
            {p.discountPrice && (
              <Text style={styles.strikePrice}>Rs. {p.price.toLocaleString()}</Text>
            )}
          </View>
          <Text style={[styles.stock, { color: p.stock > 0 ? "#10B981" : "#EF4444" }]}>
            {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}
          </Text>
        </View>

        <View style={styles.chevronWrap}>
          <Ionicons name="chevron-forward" size={18} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#1A1A2E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{categoryName ?? "Category"}</Text>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#00002E" />
          <Text style={styles.loaderText}>Loading items…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="cube-outline" size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptySub}>No parts or products in this category</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item, i) => `${item.kind}-${item.data.id}-${i}`}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.resultCount}>{items.length} item{items.length !== 1 ? "s" : ""} found</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 40, height: 40,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", flex: 1, textAlign: "center", marginHorizontal: 8 },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  loaderText: { color: "#666", marginTop: 12, fontSize: 14 },

  empty: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#1A1A2E", marginTop: 16 },
  emptySub: { fontSize: 14, color: "#666", marginTop: 8, textAlign: "center" },

  list: { padding: 16, paddingBottom: 32 },
  resultCount: { fontSize: 12, color: "#6B7280", marginBottom: 12, fontWeight: "600", letterSpacing: 0.5 },

  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  imgWrap: { width: 96, minHeight: 96, position: "relative", backgroundColor: "#E5E7EB" },
  img: { width: 96, height: "100%", minHeight: 96 },
  imgPlaceholder: { width: 96, height: 96, justifyContent: "center", alignItems: "center", backgroundColor: "#F3F4F6" },
  badge: { position: "absolute", top: 6, left: 6, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  badgeText: { color: "#FFF", fontSize: 7, fontWeight: "700" },
  typePill: { position: "absolute", bottom: 6, left: 6, backgroundColor: "rgba(0,0,46,0.75)", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  typePillText: { color: "#FFFFFF", fontSize: 7, fontWeight: "700", letterSpacing: 0.5 },

  info: { flex: 1, padding: 12, justifyContent: "center" },
  shopName: { fontSize: 10, color: "#00002E", fontWeight: "600", marginBottom: 2 },
  itemName: { fontSize: 14, fontWeight: "600", color: "#1A1A2E", marginBottom: 3, lineHeight: 20 },
  subText: { fontSize: 11, color: "#6B7280", marginBottom: 3 },
  partNo: { fontSize: 10, color: "#9CA3AF", marginBottom: 4 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  price: { fontSize: 15, fontWeight: "700", color: "#00002E" },
  strikePrice: { fontSize: 11, color: "#9CA3AF", textDecorationLine: "line-through" },
  stock: { fontSize: 11, fontWeight: "500" },

  chevronWrap: { width: 36, justifyContent: "center", alignItems: "center" },
});
