import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCartStore } from "../../store/cartStore";

const { width } = Dimensions.get("window");

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  supplier: string;
  category: string;
  stock: number;
  images: string[];
  specifications: { [key: string]: string };
  rating: number;
  reviews: number;
}

// Mock product data - in real app, fetch from backend
const mockProducts: Product[] = [
  {
    id: "1",
    name: "Brake Pads Set",
    price: 45.99,
    description: "High-performance ceramic brake pads designed for superior stopping power and reduced brake dust. Compatible with most vehicles. Engineered for quiet operation and extended pad life.",
    supplier: "AutoParts Pro",
    category: "Brakes",
    stock: 24,
    images: [
      "https://picsum.photos/400/300?random=1",
      "https://picsum.photos/400/300?random=2",
      "https://picsum.photos/400/300?random=3",
    ],
    specifications: {
      "Material": "Ceramic",
      "Compatibility": "Most passenger vehicles",
      "Warranty": "2 years",
      "Includes": "Front and rear pads",
      "Weight": "3.5 lbs",
    },
    rating: 4.5,
    reviews: 128,
  },
  {
    id: "2",
    name: "LED Headlight Bulbs",
    price: 29.99,
    description: "Ultra-bright LED headlight bulbs with 6000K white light output. Easy installation, plug and play. 50,000 hour lifespan with superior heat dissipation.",
    supplier: "LightTech",
    category: "Lighting",
    stock: 45,
    images: [
      "https://picsum.photos/400/300?random=4",
      "https://picsum.photos/400/300?random=5",
    ],
    specifications: {
      "Brightness": "6000 lumens",
      "Color Temperature": "6000K",
      "Lifespan": "50,000 hours",
      "Power": "25W per bulb",
      "Voltage": "12V DC",
    },
    rating: 4.8,
    reviews: 256,
  },
];

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { addItem } = useCartStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      const foundProduct = mockProducts.find(p => p.id === id) || mockProducts[0];
      setProduct(foundProduct);
    } catch (error) {
      console.error("Error loading product:", error);
      showAlert("Error", "Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;

    // Add the item multiple times if quantity > 1
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        supplier: product.supplier,
      });
    }

    showAlert("Added to Cart", `${quantity} x ${product.name} added to your cart`);
  };

  const handleBuyNow = () => {
    if (!product) return;

    // Add the item multiple times if quantity > 1
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        supplier: product.supplier,
      });
    }

    router.push("/checkout/" as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#999" />
        <Text style={styles.errorText}>Product not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => router.push("/(customer)/cart" as any)}>
          <Ionicons name="cart-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: product.images[selectedImage] }}
            style={styles.mainImage}
            resizeMode="cover"
          />
          <View style={styles.imageIndicators}>
            {product.images.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.indicator,
                  selectedImage === index && styles.activeIndicator,
                ]}
                onPress={() => setSelectedImage(index)}
              />
            ))}
          </View>
          {product.images.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.thumbnailContainer}
            >
              {product.images.map((image, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setSelectedImage(index)}
                  style={[
                    styles.thumbnail,
                    selectedImage === index && styles.activeThumbnail,
                  ]}
                >
                  <Image source={{ uri: image }} style={styles.thumbnailImage} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Product Info */}
        <View style={styles.infoSection}>
          <View style={styles.titleRow}>
            <Text style={styles.productName}>{product.name}</Text>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="#FFA000" />
              <Text style={styles.rating}>{product.rating}</Text>
              <Text style={styles.reviews}>({product.reviews})</Text>
            </View>
          </View>

          <Text style={styles.supplier}>by {product.supplier}</Text>
          <Text style={styles.price}>${product.price.toFixed(2)}</Text>

          {product.stock > 0 ? (
            <View style={styles.stockBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#34A853" />
              <Text style={styles.inStock}>In Stock ({product.stock} available)</Text>
            </View>
          ) : (
            <View style={[styles.stockBadge, styles.outOfStockBadge]}>
              <Ionicons name="close-circle" size={16} color="#EA4335" />
              <Text style={styles.outOfStock}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          {Object.entries(product.specifications).map(([key, value]) => (
            <View key={key} style={styles.specRow}>
              <Text style={styles.specLabel}>{key}</Text>
              <Text style={styles.specValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Quantity Selector */}
        {product.stock > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Ionicons name="remove" size={20} color="#000" />
              </TouchableOpacity>
              <Text style={styles.quantityText}>{quantity}</Text>
              <TouchableOpacity
                style={styles.quantityButton}
                onPress={() => setQuantity(Math.min(product.stock, quantity + 1))}
              >
                <Ionicons name="add" size={20} color="#000" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Actions */}
      {product.stock > 0 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={20} color="#4285F4" />
            <Text style={styles.addToCartText}>Add to Cart</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow}>
            <Text style={styles.buyNowText}>Buy Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    backgroundColor: "#F5F5F5",
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  imageContainer: {
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  mainImage: {
    width: width,
    height: width * 0.75,
    backgroundColor: "#F0F0F0",
  },
  imageIndicators: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 4,
  },
  activeIndicator: {
    backgroundColor: "#4285F4",
    width: 24,
  },
  thumbnailContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 8,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
  },
  activeThumbnail: {
    borderColor: "#4285F4",
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
  },
  infoSection: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  productName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
    marginRight: 12,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  reviews: {
    fontSize: 12,
    color: "#666",
  },
  supplier: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  price: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4285F4",
    marginBottom: 12,
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inStock: {
    fontSize: 14,
    color: "#34A853",
    fontWeight: "500",
  },
  outOfStockBadge: {
    opacity: 1,
  },
  outOfStock: {
    fontSize: 14,
    color: "#EA4335",
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: "#666",
    lineHeight: 22,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  specLabel: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  specValue: {
    fontSize: 14,
    color: "#000",
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    minWidth: 40,
    textAlign: "center",
  },
  footer: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  addToCartButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4285F4",
    backgroundColor: "#fff",
  },
  addToCartText: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "600",
  },
  buyNowButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#4285F4",
    alignItems: "center",
    justifyContent: "center",
  },
  buyNowText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
