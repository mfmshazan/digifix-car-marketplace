import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getUser, getUserPrefs, saveUserPrefs } from "../src/api/storage";

type NotificationPrefs = {
  orderUpdates: boolean;
  deliveryAlerts: boolean;
  promotions: boolean;
};

const DEFAULT_PREFS: NotificationPrefs = {
  orderUpdates: true,
  deliveryAlerts: true,
  promotions: false,
};

const OPTIONS: {
  key: keyof NotificationPrefs;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}[] = [
  {
    key: "orderUpdates",
    icon: "receipt-outline",
    title: "Order Updates",
    description: "Status changes when your orders are confirmed, shipped or delivered.",
  },
  {
    key: "deliveryAlerts",
    icon: "bicycle-outline",
    title: "Delivery Alerts",
    description: "Live updates when a rider is on the way with your package.",
  },
  {
    key: "promotions",
    icon: "pricetag-outline",
    title: "Promotions & Offers",
    description: "Deals, discounts and news from DigiFix sellers.",
  },
];

export default function NotificationsScreen() {
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_PREFS);
  const [email, setEmail] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        const user = await getUser();
        const userEmail = user?.email || "";
        setEmail(userEmail);
        if (userEmail) {
          const stored = await getUserPrefs(userEmail);
          if (stored?.notifications) {
            setPrefs({ ...DEFAULT_PREFS, ...stored.notifications });
          }
        }
      } catch (err) {
        console.log("Failed to load notification preferences:", err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const toggle = async (key: keyof NotificationPrefs) => {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next); // optimistic
    if (email) {
      try {
        await saveUserPrefs(email, { notifications: next });
      } catch (err) {
        console.log("Failed to save notification preferences:", err);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#00002E" />
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>Push notifications</Text>

          {OPTIONS.map((option) => (
            <View key={option.key} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={option.icon} size={20} color="#00002E" />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowTitle}>{option.title}</Text>
                <Text style={styles.rowText}>{option.description}</Text>
              </View>
              <Switch
                value={prefs[option.key]}
                onValueChange={() => toggle(option.key)}
                trackColor={{ false: "#D1D5DB", true: "#00002E" }}
                thumbColor="#FFFFFF"
              />
            </View>
          ))}

          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
            <Text style={styles.infoText}>
              These preferences control which alerts DigiFix sends to this device.
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    backgroundColor: "#00002E",
    paddingTop: 54,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EEF0F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  rowCopy: {
    flex: 1,
    marginRight: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 3,
  },
  rowText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
});
