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
import { clearAuthData, getToken, saveUser, getUser, getUserPrefs, saveUserPrefs, mergeServerUserAndPrefs, isEphemeralWebAvatarUri } from "../../src/api/storage";
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
    icon: "location-outline",
    label: "Saved Addresses",
    color: "#1A1A1A",
    route: null,
  },
  {
    id: "3",
    icon: "card-outline",
    label: "Payment Methods",
    color: "#00002E",
    route: null,
  },
  {
    id: "4",
    icon: "car-outline",
    label: "My Vehicles",
    color: "#00002E",
    route: null,
  },
  {
    id: "5",
    icon: "heart-outline",
    label: "Wishlist",
    color: "#00002E",
    route: "/(customer)/wishlist" as const,
  },
  {
    id: "6",
    icon: "notifications-outline",
    label: "Notifications",
    color: "#1A1A1A",
    route: null,
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
    icon: "information-circle-outline",
    label: "About Us",
    color: "#00002E",
    route: "/about-us" as const,
  },
];

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user: clerkUser } = useUser();
  // clerkUser is used for the avatar image, name, and email fallbacks if backend data is missing.
  const [userData, setUserData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isUploading, setIsUploading] = React.useState(false);
  // Holds the locally-selected image URI so the photo shows immediately
  // even before (or if) the backend upload succeeds.
  const [localAvatarUri, setLocalAvatarUri] = React.useState<string | null>(null);

  // Load locally-cached user first so name/email AND avatar show immediately
  React.useEffect(() => {
    const loadCached = async () => {
      const cached = await getUser();
      if (cached) {
        setUserData(cached);
        // Restore previously saved local avatar URI if backend avatar is missing
        if (cached.avatar_local && !cached.avatar) {
          setLocalAvatarUri(cached.avatar_local);
        }
      }
      setIsLoading(false);
    };
    loadCached();
  }, []);

  // Fetch latest user data from backend and refresh cache
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
    } catch (err) {
      // Backend unavailable — keep cached/Clerk data, don't crash
      console.log("Backend profile fetch failed; using cached/Clerk data", err);
    }
  }, []);

  React.useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

  // Re-fetch whenever this screen comes into focus (e.g. returning from Edit Profile).
  // IMPORTANT: always reload from local cache FIRST so name/photo changes from
  // edit-profile are reflected immediately, regardless of backend status.
  useFocusEffect(
    React.useCallback(() => {
      const refreshOnFocus = async () => {
        // 1. Read fresh local cache — picks up changes saved by edit-profile
        const cached = await getUser();
        if (cached) {
          setUserData(cached);
          if (cached.avatar_local && !cached.avatar) {
            setLocalAvatarUri(cached.avatar_local);
          }
        }
        // 2. Try backend sync in the background (may or may not succeed)
        fetchUserData();
      };
      refreshOnFocus();
    }, [fetchUserData])
  );

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
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: performLogout },
    ]);
  };

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

      // Step 1: Show the photo immediately (optimistic update)
      setLocalAvatarUri(uri);

      // Step 2: Persist the local URI to cache so it survives re-renders
      const localUser = await getUser();
      await saveUser({ ...localUser, avatar_local: uri });
      const em = localUser?.email || "";
      if (em) await saveUserPrefs(em, { avatar_local: uri });

      // Step 4: Try to upload to backend in the background
      uploadImage(uri);
    }
  };

  const uploadImage = async (uri: string) => {
    setIsUploading(true);
    try {
      const token = await getToken();
      if (!token) {
        // Not logged in — local photo is already showing, just stop uploading
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
      // If backend failed: local URI is already showing — no alert, no crash
    } catch (err) {
      // Backend unreachable — photo is already displayed from local URI, do nothing
      console.log("Avatar upload failed; showing local photo instead:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const getAvatarSource = () => {
    if (localAvatarUri) {
      return { uri: localAvatarUri };
    }
    if (!userData?.avatar && userData?.avatar_local && !isEphemeralWebAvatarUri(userData.avatar_local)) {
      return { uri: userData.avatar_local };
    }
    const resolved = resolveAvatarDisplayUri(userData?.avatar);
    if (resolved) return { uri: resolved };
    if (clerkUser?.imageUrl) return { uri: clerkUser.imageUrl };
    return null;
  };

  const avatarSource = getAvatarSource();
  // Name + email: backend first, then local cache, then Clerk (from account creation)
  const backendName  = userData?.name  || "";
  const backendEmail = userData?.email || "";
  const clerkName  = clerkUser?.fullName || clerkUser?.firstName || "";
  const clerkEmail = clerkUser?.emailAddresses?.[0]?.emailAddress || "";

  const displayName  = backendName  || clerkName  || (backendEmail || clerkEmail).split("@")[0] || "Guest User";
  const displayEmail = backendEmail || clerkEmail;
  const displayRole  = userData?.role || "CUSTOMER";

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
                <Ionicons name="person" size={40} color="#00002E" />
              )}
            </View>
          </TouchableOpacity>
          {/* Camera button */}
          <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color="#00002E" style={{ marginTop: 8 }} />
        ) : (
          <>
            <Text style={styles.userName}>{displayName}</Text>
            {displayEmail ? (
              <Text style={styles.userEmail}>{displayEmail}</Text>
            ) : null}
            <View style={styles.roleBadge}>
              <Ionicons
                name={displayRole === "SALESMAN" ? "storefront" : "cart"}
                size={14}
                color="#00002E"
              />
              <Text style={styles.roleText}>
                {displayRole === "SALESMAN" ? "Salesman" : "Customer"}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {userData?._count?.orders ?? 0}
          </Text>
          <Text style={styles.statLabel}>Orders</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {userData?._count?.wishlist ?? 0}
          </Text>
          <Text style={styles.statLabel}>Wishlist</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {userData?._count?.addresses ?? 0}
          </Text>
          <Text style={styles.statLabel}>Addresses</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuContainer}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
              if (item.route) router.push(item.route);
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
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#00002E",
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
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    color: "#FF4444",
    fontWeight: "600",
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
