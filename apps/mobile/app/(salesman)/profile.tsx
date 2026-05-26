import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  clearAuthData,
  getToken,
  saveUser,
  getUser,
  getUserPrefs,
  saveUserPrefs,
  mergeServerUserAndPrefs,
  isEphemeralWebAvatarUri,
} from "../../src/api/storage";
import { useAuth, useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { getApiUrl, resolveAvatarDisplayUri } from "../../src/config/api.config";
import { getUserProfile } from "../../src/api/auth";

const menuItems = [
  {
    id: "1",
    icon: "person-outline",
    label: "Edit Profile",
    color: "#00002E",
    route: "/edit-profile" as const,
  },
  {
    id: "2",
    icon: "storefront-outline",
    label: "Store Settings",
    color: "#1A1A1A",
  },
  {
    id: "3",
    icon: "card-outline",
    label: "Payment Settings",
    color: "#00002E",
  },
  {
    id: "4",
    icon: "bar-chart-outline",
    label: "Analytics",
    color: "#6B7280",
  },
  {
    id: "5",
    icon: "pricetag-outline",
    label: "Promotions",
    color: "#6B7280",
  },
  {
    id: "6",
    icon: "notifications-outline",
    label: "Notifications",
    color: "#6B7280",
  },
  {
    id: "7",
    icon: "help-circle-outline",
    label: "Help & Support",
    color: "#6B7280",
    route: "/help-support" as const,
  },
  {
    id: "8",
    icon: "document-text-outline",
    label: "Terms & Policies",
    color: "#6B7280",
  },
];

export default function SalesmanProfileScreen() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  const [userData, setUserData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  const [localAvatarUri, setLocalAvatarUri] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadCached = async () => {
      const cached = await getUser();
      if (cached) {
        setUserData(cached);
        if (cached.avatar_local && !cached.avatar) {
          setLocalAvatarUri(cached.avatar_local);
        }
      }
      setIsLoading(false);
    };
    loadCached();
  }, []);

  const fetchUserData = React.useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        const result = await getUserProfile(token);
        if (result.success && result.data) {
          const email = result.data.email || "";
          const prefs = email ? await getUserPrefs(email) : {};
          const merged = mergeServerUserAndPrefs(result.data, prefs);
          if (result.data.avatar && merged.avatar_local) {
            merged.avatar_local = null;
            if (email) await saveUserPrefs(email, { avatar_local: null });
          }
          setUserData(merged);
          await saveUser(merged);
        }
      }
    } catch (error) {
      console.error("Error fetching salesman profile:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  useFocusEffect(
    React.useCallback(() => {
      const refreshOnFocus = async () => {
        const cached = await getUser();
        if (cached) {
          setUserData(cached);
          if (cached.avatar_local && !cached.avatar) {
            setLocalAvatarUri(cached.avatar_local);
          }
        }
        fetchUserData();
      };
      refreshOnFocus();
    }, [fetchUserData])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Camera roll permissions are required to upload a profile picture."
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setLocalAvatarUri(uri);
      const localUser = await getUser();
      await saveUser({ ...localUser, avatar_local: uri });
      const em = localUser?.email || "";
      if (em) await saveUserPrefs(em, { avatar_local: uri });
      uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) {
        setIsUploading(false);
        return;
      }

      const formData = new FormData();
      const filename = uri.split("/").pop() || "profile.jpg";
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : "image/jpeg";

      if (Platform.OS === "web") {
        const res = await fetch(uri);
        const blob = await res.blob();
        formData.append("avatar", blob, filename);
      } else {
        formData.append("avatar", { uri, name: filename, type } as any);
      }

      const response = await fetch(`${getApiUrl()}/users/profile-picture`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        body: formData,
      });

      const result = await response.json();
      if (result.success) {
        const serverAvatar = result.data?.avatar as string | undefined;
        setLocalAvatarUri(null);
        const localUser = await getUser();
        const nextUser = {
          ...localUser,
          ...(serverAvatar ? { avatar: serverAvatar } : {}),
          avatar_local: null,
        };
        await saveUser(nextUser);
        setUserData((prev: any) => ({ ...prev, ...nextUser }));
        const em = localUser?.email || "";
        if (em) await saveUserPrefs(em, { avatar_local: null });
        fetchUserData();
      }
    } catch (err) {
      console.log("Avatar upload failed; showing local photo instead:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const getAvatarSource = () => {
    if (localAvatarUri) {
      return { uri: localAvatarUri };
    }
    if (
      !userData?.avatar &&
      userData?.avatar_local &&
      !isEphemeralWebAvatarUri(userData.avatar_local)
    ) {
      return { uri: userData.avatar_local };
    }
    const resolved = resolveAvatarDisplayUri(userData?.avatar);
    if (resolved) return { uri: resolved };
    if (clerkUser?.imageUrl) return { uri: clerkUser.imageUrl };
    return null;
  };

  const avatarSource = getAvatarSource();

  const performLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }

    await clearAuthData();
    router.replace(Platform.OS === "web" ? "/login" : "/(auth)/login");
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      void performLogout();
      return;
    }

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
            await performLogout();
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
          <TouchableOpacity onPress={pickImage} disabled={isUploading}>
            <View style={styles.avatar}>
              {isUploading && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#00002E" />
                </View>
              )}
              {avatarSource ? (
                <Image
                  source={avatarSource}
                  style={{ width: 100, height: 100, borderRadius: 50 }}
                />
              ) : (
                <Ionicons name="storefront" size={40} color="#00002E" />
              )}
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        {isLoading ? (
          <ActivityIndicator color="#00002E" style={{ marginTop: 8 }} />
        ) : (
          <>
            {(() => {
              const backendEmail = userData?.email || "";
              const clerkEmail = clerkUser?.emailAddresses[0]?.emailAddress || "";
              const emailsMatch = backendEmail.toLowerCase() === clerkEmail.toLowerCase();
              
              const displayName = userData?.name || (emailsMatch ? clerkUser?.fullName : null) || backendEmail.split('@')[0] || "Guest User";
              const displayEmail = backendEmail || (emailsMatch ? clerkEmail : "");
              // Prefer profile name for the headline so Edit Profile updates show immediately.
              // Stale `store.name` from the API must not override a freshly saved `user.name`.
              const storeHeadline = userData?.name
                ? `${userData.name}'s Store`
                : userData?.store?.name ||
                  ((emailsMatch && clerkUser?.fullName)
                    ? `${clerkUser.fullName}'s Store`
                    : `${displayName}'s Store`);

              return (
                <>
                  <Text style={styles.storeName}>
                    {storeHeadline}
                  </Text>
                  <Text style={styles.ownerEmail}>
                    {displayEmail}
                  </Text>
                </>
              );
            })()}
            <View style={styles.roleBadge}>
              <Ionicons name="storefront" size={14} color="#00002E" />
              <Text style={styles.roleText}>Salesman</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified Seller</Text>
            </View>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>48</Text>
          <Text style={styles.statLabel}>Products</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>156</Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>4.8</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>

      {/* Store Performance */}
      <View style={styles.performanceCard}>
        <Text style={styles.performanceTitle}>This Month</Text>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>$12,458</Text>
            <Text style={styles.performanceLabel}>Revenue</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={styles.performanceValue}>89</Text>
            <Text style={styles.performanceLabel}>Orders</Text>
          </View>
          <View style={styles.performanceStat}>
            <Text style={[styles.performanceValue, { color: "#4CAF50" }]}>
              +12.5%
            </Text>
            <Text style={styles.performanceLabel}>Growth</Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              if ("route" in item && item.route) router.push(item.route);
            }}
          >
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
    overflow: "hidden",
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderRadius: 50,
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
  storeName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  ownerEmail: {
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
    marginBottom: 8,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00002E",
    marginLeft: 6,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  verifiedText: {
    fontSize: 12,
    color: "#4CAF50",
    fontWeight: "500",
    marginLeft: 4,
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
  performanceCard: {
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
  performanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 16,
  },
  performanceStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  performanceStat: {
    alignItems: "center",
  },
  performanceValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  performanceLabel: {
    fontSize: 12,
    color: "#999",
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



