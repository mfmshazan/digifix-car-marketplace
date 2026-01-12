import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { signOut } from "firebase/auth";
import { auth } from "../../config/firebase";
import { useCartStore } from "../../store/cartStore";

// Web-compatible alert function
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
};

// Web-compatible confirm function
const showConfirm = (title: string, message: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: onConfirm },
    ]);
  }
};

export default function ProfileScreen() {
  const user = auth.currentUser;
  const { clearCart } = useCartStore();
  const [refreshKey, setRefreshKey] = useState(0);

  // Reload user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setRefreshKey(prev => prev + 1);
    }, [])
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#4285F4" />
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.displayName || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
          <TouchableOpacity onPress={() => {
            console.log("User info clicked");
            showAlert("Edit Profile", "Profile editing coming soon!");
          }}>
            <Ionicons name="chevron-forward" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menu}>
          {/* Edit Profile */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profile/edit" as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="person-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Edit Profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Addresses */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profile/addresses" as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="location-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Addresses</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Payment Methods */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profile/payment" as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="card-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Payment Methods</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profile/notifications" as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Notifications</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* Help & Support */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/profile/support" as any)}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="help-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          {/* About */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              showAlert("About", "AutoParts Marketplace v1.0.0\n\nYour trusted source for quality auto parts.");
            }}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="information-circle-outline" size={24} color="#666" />
              <Text style={styles.menuItemText}>About</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            console.log("Logout button clicked");
            showConfirm("Logout", "Are you sure you want to logout?", async () => {
              try {
                console.log("Logging out...");
                clearCart();
                await signOut(auth);
                if (Platform.OS === 'web') {
                  window.location.replace('/auth/login');
                } else {
                  router.replace("/auth/login");
                }
              } catch (error: any) {
                console.error("Logout error:", error);
                showAlert("Error", error.message);
              }
            });
          }}
        >
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    marginBottom: 16,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  menu: {
    backgroundColor: "#fff",
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  menuItemText: {
    fontSize: 15,
    color: "#000",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
  },
  logoutText: {
    fontSize: 16,
    color: "#F44336",
    fontWeight: "600",
  },
});
