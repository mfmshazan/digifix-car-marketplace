import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export default function PaymentMethodsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Available at checkout</Text>

        {/* Cash on Delivery — the currently supported method */}
        <View style={styles.methodCard}>
          <View style={styles.methodIcon}>
            <Ionicons name="cash-outline" size={22} color="#16A34A" />
          </View>
          <View style={styles.methodCopy}>
            <Text style={styles.methodTitle}>Cash on Delivery</Text>
            <Text style={styles.methodText}>
              Pay with cash when your order is delivered to your door.
            </Text>
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Coming soon</Text>

        <View style={[styles.methodCard, styles.disabledCard]}>
          <View style={styles.methodIcon}>
            <Ionicons name="card-outline" size={22} color="#6B7280" />
          </View>
          <View style={styles.methodCopy}>
            <Text style={styles.methodTitle}>Credit / Debit Card</Text>
            <Text style={styles.methodText}>
              Secure online card payments will be available in a future update.
            </Text>
          </View>
          <Ionicons name="lock-closed" size={16} color="#9CA3AF" />
        </View>

        <View style={styles.infoRow}>
          <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
          <Text style={styles.infoText}>
            Cards you save will appear here once online payments go live.
          </Text>
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
  methodCard: {
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
  disabledCard: {
    opacity: 0.75,
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  methodCopy: {
    flex: 1,
    marginRight: 10,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 3,
  },
  methodText: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 17,
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
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
