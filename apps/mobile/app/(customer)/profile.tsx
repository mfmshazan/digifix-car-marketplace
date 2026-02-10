import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { clearAuthData } from "../../src/api/storage";

const menuItems = [
  {
    id: "1",
    icon: "person-outline",
    label: "Edit Profile",
    color: "#00002E",
  },
  {
    id: "2",
    icon: "location-outline",
    label: "Saved Addresses",
    color: "#1A1A1A",
  },
  {
    id: "3",
    icon: "card-outline",
    label: "Payment Methods",
    color: "#00002E",
  },
  {
    id: "4",
    icon: "car-outline",
    label: "My Vehicles",
    color: "#00002E",
  },
  {
    id: "5",
    icon: "heart-outline",
    label: "Wishlist",
    color: "#00002E",
  },
  {
    id: "6",
    icon: "notifications-outline",
    label: "Notifications",
    color: "#1A1A1A",
  },
  {
    id: "7",
    icon: "help-circle-outline",
    label: "Help & Support",
    color: "#6B7280",
  },
  {
    id: "8",
    icon: "information-circle-outline",
    label: "About Us",
    color: "#00002E",
  },
];

export default function ProfileScreen() {
  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await clearAuthData();
              router.replace("/(auth)/login");
            } catch (error) {
              console.error("Logout error:", error);
              router.replace("/(auth)/login");
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#00002E" />
          </View>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>John Doe</Text>
        <Text style={styles.userEmail}>john.doe@example.com</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="cart" size={14} color="#00002E" />
          <Text style={styles.roleText}>Customer</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>5</Text>
          <Text style={styles.statLabel}>Wishlist</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Vehicles</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity key={item.id} style={styles.menuItem}>
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: item.color + "20" },
              ]}
            >
              <Ionicons name={item.icon as any} size={22} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout Button */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#FF4444" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#FFFFFF",
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  editAvatarButton: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#00002E",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  userName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#999",
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00002E",
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#00002E",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#999",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F0F0F0",
  },
  menuContainer: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A2E",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF4444",
    fontWeight: "600",
    marginLeft: 8,
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 12,
    color: "#999",
  },
});



