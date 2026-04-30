import React, { useState, useEffect, useRef, useCallback } from "react";
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
  StatusBar,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getAllCarParts, CarPart } from "../../src/api/carParts";
import { getAllProducts, Product } from "../../src/api/products";
import { getAllCategories, Category } from "../../src/api/categories";
import { useCart } from "../../src/store/cartStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ── Mock fallback categories (shown instantly while API loads) ──
const MOCK_CATEGORIES: Category[] = [
  { id: "mock-1", name: "Engine Parts" },
  { id: "mock-2", name: "Brake System" },
  { id: "mock-3", name: "Filters" },
  { id: "mock-4", name: "Electrical" },
  { id: "mock-5", name: "Suspension" },
  { id: "mock-6", name: "Cooling System" },
  { id: "mock-7", name: "Exhaust System" },
  { id: "mock-8", name: "Transmission" },
  { id: "mock-9", name: "Body Parts" },
  { id: "mock-10", name: "Lighting" },
  { id: "mock-11", name: "Interior" },
  { id: "mock-12", name: "Accessories" },
];

// ── Mock products for immediate UI testing ──
const MOCK_PRODUCTS: Product[] = [
  { id: "mp-1", name: "Performance Air Filter", price: 3500, stock: 12, images: [], isActive: true, createdAt: "", category: { id: "c3", name: "Filters" }, salesman: { id: "s1", name: "AutoParts Pro", email: "", store: { id: "st1", name: "AutoParts Pro" } } },
  { id: "mp-2", name: "LED Headlight Kit H4", price: 8900, stock: 5, images: [], isActive: true, createdAt: "", category: { id: "c10", name: "Lighting" }, salesman: { id: "s2", name: "LightWorld", email: "", store: { id: "st2", name: "LightWorld" } } },
  { id: "mp-3", name: "Front Bumper Guard", price: 12500, stock: 3, images: [], isActive: true, createdAt: "", category: { id: "c9", name: "Body Parts" }, salesman: { id: "s1", name: "AutoParts Pro", email: "", store: { id: "st1", name: "AutoParts Pro" } } },
  { id: "mp-4", name: "Carbon Fibre Gear Knob", price: 4200, stock: 8, images: [], isActive: true, createdAt: "", category: { id: "c11", name: "Interior" }, salesman: { id: "s3", name: "TurboMods", email: "", store: { id: "st3", name: "TurboMods" } } },
  { id: "mp-5", name: "Coil Spring Set (Front)", price: 18000, stock: 4, images: [], isActive: true, createdAt: "", category: { id: "c5", name: "Suspension" }, salesman: { id: "s1", name: "AutoParts Pro", email: "", store: { id: "st1", name: "AutoParts Pro" } } },
  { id: "mp-6", name: "Chrome Exhaust Tip 3\"", price: 2800, stock: 15, images: [], isActive: true, createdAt: "", category: { id: "c7", name: "Exhaust System" }, salesman: { id: "s3", name: "TurboMods", email: "", store: { id: "st3", name: "TurboMods" } } },
];

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

const PROMOTIONS = [
  { id: "1", title: "Find Parts Fast", description: "Search 1000+ genuine car parts", bg: "#00002E" },
  { id: "2", title: "Free Delivery", description: "On orders over Rs. 5,000", bg: "#1A1A1A" },
  { id: "3", title: "Quality Assured", description: "Verified sellers & genuine parts", bg: "#0D0D2E" },
];

export default function CustomerHomeScreen() {
  const router = useRouter();
  const { addItem } = useCart();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ parts: CarPart[]; products: Product[] }>({ parts: [], products: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSuggestLoading, setIsSuggestLoading] = useState(false);

  // Data state
  const [categories, setCategories] = useState<Category[]>(MOCK_CATEGORIES);
  const [featuredParts, setFeaturedParts] = useState<CarPart[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>(MOCK_PRODUCTS);
  const [isLoadingParts, setIsLoadingParts] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    loadCategories();
    loadFeaturedParts();
    loadFeaturedProducts();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await getAllCategories();
      if (res.success && res.data.length > 0) setCategories(res.data);
    } catch { /* keep mock */ }
  };

  const loadFeaturedParts = async () => {
    try {
      setIsLoadingParts(true);
      const res = await getAllCarParts({ limit: 10 });
      if (res.success) setFeaturedParts(res.data.parts);
    } catch { /* silent */ } finally { setIsLoadingParts(false); }
  };

  const loadFeaturedProducts = async () => {
    try {
      setIsLoadingProducts(true);
      const res = await getAllProducts({ limit: 10 });
      if (res.success && res.data.products.length > 0) setFeaturedProducts(res.data.products);
    } catch { /* keep mock */ } finally { setIsLoadingProducts(false); }
  };

  // ── Auto-suggest (debounced 350ms) ──────────────────
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (text.trim().length < 2) {
      setShowSuggestions(false);
      setSuggestions({ parts: [], products: [] });
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setIsSuggestLoading(true);
      setShowSuggestions(true);
      try {
        const [partsRes, productsRes] = await Promise.allSettled([
          getAllCarParts({ search: text.trim(), limit: 5 }),
          getAllProducts({ search: text.trim(), limit: 4 }),
        ]);
        setSuggestions({
          parts: partsRes.status === "fulfilled" && partsRes.value.success ? partsRes.value.data.parts : [],
          products: productsRes.status === "fulfilled" && productsRes.value.success ? productsRes.value.data.products : [],
        });
      } catch { setSuggestions({ parts: [], products: [] }); }
      finally { setIsSuggestLoading(false); }
    }, 350);
  }, []);

  const closeSuggestions = () => { setShowSuggestions(false); setSearchQuery(""); };

  // ── Add to cart ─────────────────────────────────────
  const handleAddPartToCart = async (part: CarPart) => {
    try {
      await addItem({
        productId: part.id,
        itemType: "CAR_PART",
        name: part.name,
        price: part.price,
        discountPrice: part.discountPrice,
        image: part.images?.[0],
        carInfo: `${part.car?.make} ${part.car?.model} (${part.car?.year})`,
        categoryName: part.category?.name,
      });
      Alert.alert("Added to Cart", `${part.name} added.`, [
        { text: "Continue", style: "cancel" },
        { text: "View Cart", onPress: () => router.push("/(customer)/cart") },
      ]);
    } catch (e: any) { Alert.alert("Failed", e?.message ?? "Please try again."); }
  };

  // ── Renderers ───────────────────────────────────────
  const SectionHeader = ({ title, onSeeAll }: { title: string; onSeeAll?: () => void }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onSeeAll && <TouchableOpacity onPress={onSeeAll}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>}
    </View>
  );

  const renderPromotion = ({ item }: { item: typeof PROMOTIONS[0] }) => (
    <View style={[styles.promoCard, { backgroundColor: item.bg }]}>
      <Text style={styles.promoTitle}>{item.title}</Text>
      <Text style={styles.promoDesc}>{item.description}</Text>
    </View>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={styles.catChip}
      activeOpacity={0.75}
      onPress={() => router.push({ pathname: "/(customer)/category-results", params: { categoryId: item.id, categoryName: item.name } })}
    >
      <View style={styles.catIconWrap}>
        <Ionicons name={catIcon(item.name)} size={22} color="#00002E" />
      </View>
      <Text style={styles.catName} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderPartCard = ({ item }: { item: CarPart }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/(customer)/product-detail", params: { itemKind: "part", itemData: JSON.stringify(item) } })}>
      <View style={styles.itemImageWrap}>
        {item.images?.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}><Ionicons name="construct-outline" size={32} color="#00002E" /></View>
        )}
        <View style={[styles.conditionPill, { backgroundColor: item.condition === "NEW" ? "#16A34A" : item.condition === "USED" ? "#2563EB" : "#7C3AED" }]}>
          <Text style={styles.conditionPillText}>{item.condition}</Text>
        </View>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemShop} numberOfLines={1}>{item.seller?.name}</Text>
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.itemSub} numberOfLines={1}>{item.car?.make} {item.car?.model} {item.car?.year}</Text>
        <Text style={styles.itemPrice}>Rs. {(item.discountPrice ?? item.price).toLocaleString()}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => handleAddPartToCart(item)}>
        <Ionicons name="add" size={18} color="#FFFFFF" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderProductCard = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.itemCard} activeOpacity={0.85}
      onPress={() => router.push({ pathname: "/(customer)/product-detail", params: { itemKind: "product", itemData: JSON.stringify(item) } })}>
      <View style={styles.itemImageWrap}>
        {item.images?.length > 0 ? (
          <Image source={{ uri: item.images[0] }} style={styles.itemImage} resizeMode="cover" />
        ) : (
          <View style={styles.itemImagePlaceholder}><Ionicons name="cube-outline" size={32} color="#00002E" /></View>
        )}
      </View>
      <View style={styles.itemInfo}>
        {item.salesman?.store && <Text style={styles.itemShop} numberOfLines={1}>{item.salesman.store.name}</Text>}
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
        {item.category && <Text style={styles.itemSub}>{item.category.name}</Text>}
        <Text style={styles.itemPrice}>Rs. {item.price.toLocaleString()}</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Render ──────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerGreeting}>Good day 👋</Text>
          <Text style={styles.headerBrand}>DIGIFIX Auto Parts</Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(customer)/cart")} style={styles.headerCartBtn}>
          <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Search + Suggestions */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find your parts here"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => searchQuery.length >= 2 && setShowSuggestions(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={closeSuggestions}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Floating dropdown */}
        {showSuggestions && (
          <View style={styles.suggestionBox}>
            {isSuggestLoading ? (
              <ActivityIndicator color="#00002E" size="small" style={{ padding: 16 }} />
            ) : suggestions.parts.length === 0 && suggestions.products.length === 0 ? (
              <Text style={styles.suggestEmpty}>No results for &ldquo;{searchQuery}&rdquo;</Text>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 300 }}>
                {suggestions.parts.length > 0 && (
                  <>
                    <Text style={styles.suggestGroup}>CAR PARTS</Text>
                    {suggestions.parts.map((p) => (
                      <TouchableOpacity key={p.id} style={styles.suggestRow} onPress={() => {
                        closeSuggestions();
                        router.push({ pathname: "/(customer)/product-detail", params: { itemKind: "part", itemData: JSON.stringify(p) } });
                      }}>
                        <Ionicons name="construct-outline" size={15} color="#00002E" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.suggestSub}>Rs. {(p.discountPrice ?? p.price).toLocaleString()} · {p.category?.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#CCC" />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
                {suggestions.products.length > 0 && (
                  <>
                    <Text style={styles.suggestGroup}>PRODUCTS</Text>
                    {suggestions.products.map((p) => (
                      <TouchableOpacity key={p.id} style={styles.suggestRow} onPress={() => {
                        closeSuggestions();
                        router.push({ pathname: "/(customer)/product-detail", params: { itemKind: "product", itemData: JSON.stringify(p) } });
                      }}>
                        <Ionicons name="cube-outline" size={15} color="#00002E" style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.suggestSub}>Rs. {p.price.toLocaleString()} · {p.category?.name}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#CCC" />
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </ScrollView>
            )}
          </View>
        )}
      </View>

      {/* Scrollable body */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setShowSuggestions(false)}
      >
        {/* Promotions */}
        <FlatList
          data={PROMOTIONS}
          renderItem={renderPromotion}
          keyExtractor={(i) => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          style={{ marginBottom: 8 }}
        />

        {/* Categories */}
        <View style={styles.section}>
          <SectionHeader title="Categories" onSeeAll={() => router.push("/(customer)/categories")} />
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(i) => i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 4 }}
          />
        </View>

        {/* Featured Parts */}
        <View style={styles.section}>
          <SectionHeader title="Featured Parts" />
          {isLoadingParts ? (
            <ActivityIndicator color="#00002E" style={{ marginVertical: 20 }} />
          ) : featuredParts.length === 0 ? (
            <Text style={styles.emptyNote}>No parts available yet</Text>
          ) : (
            <FlatList
              data={featuredParts}
              renderItem={renderPartCard}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          )}
        </View>

        {/* Featured Products */}
        <View style={styles.section}>
          <SectionHeader title="Featured Products" />
          {isLoadingProducts ? (
            <ActivityIndicator color="#00002E" style={{ marginVertical: 20 }} />
          ) : (
            <FlatList
              data={featuredProducts}
              renderItem={renderProductCard}
              keyExtractor={(i) => i.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            />
          )}
        </View>
      </ScrollView>

      {/* Image Zoom Modal */}
      <Modal visible={!!selectedImage} transparent animationType="fade" onRequestClose={() => setSelectedImage(null)}>
        <TouchableOpacity style={styles.imgOverlay} activeOpacity={1} onPress={() => setSelectedImage(null)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()} style={{ width: "100%", height: "100%", justifyContent: "center", alignItems: "center" }}>
            <TouchableOpacity style={styles.imgClose} onPress={() => setSelectedImage(null)}>
              <Ionicons name="close" size={26} color="#FFF" />
            </TouchableOpacity>
            {selectedImage && <Image source={{ uri: selectedImage }} style={styles.imgFull} resizeMode="contain" />}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────── Styles ──
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FFFFFF" },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, backgroundColor: "#FFFFFF",
  },
  headerGreeting: { fontSize: 11, color: "#666", marginBottom: 2 },
  headerBrand: { fontSize: 17, fontWeight: "700", color: "#1A1A2E", letterSpacing: 0.4 },
  headerCartBtn: { width: 40, height: 40, backgroundColor: "#00002E", borderRadius: 20, justifyContent: "center", alignItems: "center" },

  searchWrapper: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: "#00002E", zIndex: 100 },
  searchBar: { margin:15 ,flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 14, height: 48 },
  searchInput: { flex: 1, color: "#1A1A2E", fontSize: 15 },

  suggestionBox: {
    position: "absolute", top: 58, left: 16, right: 16,
    backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E5E7EB",
    zIndex: 200, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8,
  },
  suggestGroup: { fontSize: 10, fontWeight: "700", color: "#999", letterSpacing: 1, paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4 },
  suggestRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#E5E7EB" },
  suggestName: { fontSize: 14, color: "#1A1A2E", fontWeight: "500" },
  suggestSub: { fontSize: 11, color: "#666", marginTop: 1 },
  suggestEmpty: { color: "#666", textAlign: "center", padding: 20, fontSize: 14 },

  scroll: { flex: 1 },
  section: { marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A2E" },
  seeAll: { fontSize: 13, color: "#00002E" },
  emptyNote: { color: "#666", paddingHorizontal: 20, fontSize: 14, marginVertical: 8 },

  promoCard: { width: SCREEN_WIDTH * 0.68, borderRadius: 16, padding: 20, marginRight: 12, minHeight: 100, justifyContent: "flex-end" },
  promoTitle: { fontSize: 19, fontWeight: "800", color: "#FFF", marginBottom: 4 },
  promoDesc: { fontSize: 12, color: "#FFFFFFCC" },

  catChip: { alignItems: "center", marginRight: 14, width: 66 },
  catIconWrap: { width: 52, height: 52, backgroundColor: "#00002E20", borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  catName: { fontSize: 10, color: "#666", textAlign: "center" },

  itemCard: { width: 158, backgroundColor: "#FFFFFF", borderRadius: 16, marginRight: 12, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  itemImageWrap: { position: "relative", height: 108, backgroundColor: "#E5E7EB" },
  itemImage: { width: "100%", height: "100%", resizeMode: "cover" },
  itemImagePlaceholder: { flex: 1, justifyContent: "center", alignItems: "center" },
  conditionPill: { position: "absolute", top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  conditionPillText: { color: "#FFF", fontSize: 8, fontWeight: "700" },
  itemInfo: { padding: 10 },
  itemShop: { fontSize: 10, color: "#00002E", fontWeight: "600", marginBottom: 2 },
  itemName: { fontSize: 13, fontWeight: "600", color: "#1A1A2E", marginBottom: 3 },
  itemSub: { fontSize: 10, color: "#666", marginBottom: 4 },
  itemPrice: { fontSize: 14, fontWeight: "700", color: "#00002E" },
  addBtn: { position: "absolute", bottom: 10, right: 10, width: 28, height: 28, backgroundColor: "#00002E", borderRadius: 14, justifyContent: "center", alignItems: "center" },

  imgOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  imgClose: { position: "absolute", top: 48, right: 16, zIndex: 2, padding: 8, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 20 },
  imgFull: { width: "100%", height: "80%" },
});
