import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface NotificationSettings {
  orderUpdates: boolean;
  promotions: boolean;
  newProducts: boolean;
  priceDrops: boolean;
  newsletter: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
}

const defaultSettings: NotificationSettings = {
  orderUpdates: true,
  promotions: true,
  newProducts: false,
  priceDrops: true,
  newsletter: false,
  emailNotifications: true,
  pushNotifications: true,
  smsNotifications: false,
};

export default function NotificationsScreen() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem('notificationSettings');
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading notification settings:", error);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem('notificationSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Error saving notification settings:", error);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="cube-outline" size={24} color="#4285F4" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Order Updates</Text>
                <Text style={styles.settingDescription}>
                  Status updates for your orders
                </Text>
              </View>
            </View>
            <Switch
              value={settings.orderUpdates}
              onValueChange={() => toggleSetting('orderUpdates')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="pricetag-outline" size={24} color="#FF9800" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Promotions & Deals</Text>
                <Text style={styles.settingDescription}>
                  Special offers and discounts
                </Text>
              </View>
            </View>
            <Switch
              value={settings.promotions}
              onValueChange={() => toggleSetting('promotions')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="cart-outline" size={24} color="#4CAF50" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>New Products</Text>
                <Text style={styles.settingDescription}>
                  Alerts for new arrivals
                </Text>
              </View>
            </View>
            <Switch
              value={settings.newProducts}
              onValueChange={() => toggleSetting('newProducts')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="trending-down-outline" size={24} color="#F44336" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Price Drops</Text>
                <Text style={styles.settingDescription}>
                  Notify when prices drop on saved items
                </Text>
              </View>
            </View>
            <Switch
              value={settings.priceDrops}
              onValueChange={() => toggleSetting('priceDrops')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={24} color="#9C27B0" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Newsletter</Text>
                <Text style={styles.settingDescription}>
                  Weekly news and tips
                </Text>
              </View>
            </View>
            <Switch
              value={settings.newsletter}
              onValueChange={() => toggleSetting('newsletter')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Delivery Methods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery Methods</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="mail-outline" size={24} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications via email
                </Text>
              </View>
            </View>
            <Switch
              value={settings.emailNotifications}
              onValueChange={() => toggleSetting('emailNotifications')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  In-app notifications
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={() => toggleSetting('pushNotifications')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="chatbubble-outline" size={24} color="#666" />
              <View style={styles.settingInfo}>
                <Text style={styles.settingTitle}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive text messages
                </Text>
              </View>
            </View>
            <Switch
              value={settings.smsNotifications}
              onValueChange={() => toggleSetting('smsNotifications')}
              trackColor={{ false: "#E0E0E0", true: "#4285F4" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Info Notice */}
        <View style={styles.notice}>
          <Ionicons name="information-circle-outline" size={20} color="#4285F4" />
          <Text style={styles.noticeText}>
            You can change these settings at any time. Some notifications may be necessary for your orders.
          </Text>
        </View>
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
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    paddingHorizontal: 20,
    paddingVertical: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  settingInfo: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#000",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
  },
  notice: {
    flexDirection: "row",
    backgroundColor: "#E8F0FE",
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 8,
    gap: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: "#1565C0",
    lineHeight: 18,
  },
});
