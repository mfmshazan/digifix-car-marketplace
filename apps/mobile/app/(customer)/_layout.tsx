import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet } from "react-native";
import { useCart } from "../../src/store/cartStore";

function CartTabIcon({ color, size }: { color: string; size: number }) {
  const { getTotalItems } = useCart();
  const itemCount = getTotalItems();

  return (
    <View style={{ width: 24, height: 24 }}>
      <Ionicons name="cart" size={size} color={color} />
      {itemCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {itemCount > 99 ? "99+" : itemCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function CustomerTabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#00002E",
        tabBarInactiveTintColor: "#6B7280",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#E5E5E5",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
          width: "100%",
          flexDirection: "row",
          justifyContent: "space-evenly",
          alignItems: "center",
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
        },
        headerStyle: {
          backgroundColor: "#00002E",
        },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: {
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
          headerTitle: "DIGIFIX Auto Parts",
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => (
            <CartTabIcon color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="category-results"
        options={{
          title: "Category",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />
      <Tabs.Screen
        name="product-detail"
        options={{
          title: "Details",
          tabBarButton: () => null,
          tabBarStyle: { display: "none" },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -8,
    top: -4,
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "bold",
  },
});
