import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useEffect } from "react";
import { usePendingOrders } from "../../src/store/pendingOrdersStore";
import { connectSocket } from "../../src/lib/socket";
import { getToken } from "../../src/api/storage";

function TabBarIconWithBadge({
  name,
  color,
  size,
  badgeCount
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  badgeCount?: number
}) {
  return (
    <View style={{ width: 24, height: 24 }}>
      <Ionicons name={name} size={size} color={color} />
      {badgeCount !== undefined && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function SalesmanTabLayout() {
  const { pendingCount, refreshPendingCount, incrementPendingCount } = usePendingOrders();

  // Initial badge count fetch + 30s polling as fallback
  useEffect(() => {
    refreshPendingCount();
    const interval = setInterval(refreshPendingCount, 30000);
    return () => clearInterval(interval);
  }, [refreshPendingCount]);

  // Real-time socket: connect with the salesman's own userId and listen for new orders
  useEffect(() => {
    let cancelled = false;

    const setupSocket = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;

        const decoded = JSON.parse(atob(token.split('.')[1]));
        const userId: string = decoded?.userId || decoded?.id || decoded?.sub;
        if (!userId || cancelled) return;

        const socket = connectSocket(userId);

        const handleNewOrder = (payload: { orderNumber: string; total?: number }) => {
          if (cancelled) return;
          incrementPendingCount();
          Alert.alert(
            '🛒 New Order!',
            `Order ${payload.orderNumber} received${payload.total ? ` — Rs. ${payload.total.toLocaleString()}` : ''}.`,
            [{ text: 'OK' }]
          );
        };

        socket.on('newOrder', handleNewOrder);

        return () => {
          socket.off('newOrder', handleNewOrder);
        };
      } catch { /* ignore setup errors */ }
    };

    let cleanup: (() => void) | undefined;
    setupSocket().then((fn) => { cleanup = fn; });

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [incrementPendingCount]);

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
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
          headerTitle: "Seller Dashboard",
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-car-part"
        options={{
          title: "Add Part",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size} color={color} />
          ),
          headerTitle: "Add Car Part",
        }}
      />
      <Tabs.Screen
        name="add-product"
        options={{
          title: "Add Product",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
          headerTitle: "Add New Product",
          href: null,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <TabBarIconWithBadge
              name="receipt"
              size={size}
              color={color}
              badgeCount={pendingCount}
            />
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
