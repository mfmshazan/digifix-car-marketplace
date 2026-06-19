import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const SUPPORT_EMAIL = "support@digifix.lk";
const SUPPORT_PHONE = "+94770000000";

async function openUrl(url: string, errorMessage: string) {
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      Alert.alert("Unable to open", errorMessage);
      return;
    }
    await Linking.openURL(url);
  } catch {
    Alert.alert("Unable to open", errorMessage);
  }
}

export default function HelpSupportScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Need Help?</Text>
          <Text style={styles.cardText}>
            We are here to help with orders, refunds, account issues, and app problems.
          </Text>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openUrl(`mailto:${SUPPORT_EMAIL}`, "Email app is not available.")}
          >
            <Ionicons name="mail-outline" size={20} color="#00002E" />
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Email Support</Text>
              <Text style={styles.actionSubtitle}>{SUPPORT_EMAIL}</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openUrl(`tel:${SUPPORT_PHONE}`, "Phone call is not available on this device.")}
          >
            <Ionicons name="call-outline" size={20} color="#00002E" />
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Call Support</Text>
              <Text style={styles.actionSubtitle}>{SUPPORT_PHONE}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Frequently Asked</Text>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>How can I track my order?</Text>
            <Text style={styles.faqA}>Open Orders and tap Track Order on the relevant order card.</Text>
          </View>
          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>How can I cancel or complain?</Text>
            <Text style={styles.faqA}>Open your order, tap the 3-dot menu, then choose Cancel Order or Raise Complaint.</Text>
          </View>
          <View style={styles.faqItemLast}>
            <Text style={styles.faqQ}>How does refund review work?</Text>
            <Text style={styles.faqA}>Your request goes to admin for review. You will see status updates in Orders.</Text>
          </View>
        </View>
      </ScrollView>
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
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 36,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: "#4B5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E7FF",
  },
  actionTextWrap: {
    marginLeft: 10,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#00002E",
  },
  actionSubtitle: {
    fontSize: 13,
    color: "#4B5563",
    marginTop: 2,
  },
  faqItem: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingVertical: 10,
  },
  faqItemLast: {
    paddingTop: 10,
  },
  faqQ: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  faqA: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },
});
