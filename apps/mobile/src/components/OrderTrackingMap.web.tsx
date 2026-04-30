import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OrderTrackingMapProps {
  style?: StyleProp<ViewStyle>;
  latitude?: number;
  longitude?: number;
}

export default function OrderTrackingMap({ style }: OrderTrackingMapProps) {
  return (
    <View style={[styles.container, style]}>
      {/* Matte grid texture via layered views */}
      <View style={styles.gridOverlay} pointerEvents="none" />
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name="map-outline" size={40} color="#8A8FA8" />
        </View>
        <Text style={styles.title}>Map View not available on Web</Text>
        <Text style={styles.subtitle}>
          Open the mobile app to track your order in real time.
        </Text>
      </View>
    </View>
  );
}

const GRID_COLOR = "rgba(130, 140, 170, 0.12)";
const GRID_SPACING = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2C2F3F",
    overflow: "hidden",
  },
  // Pseudo-matte grid texture rendered with a repeating border pattern
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderLeftWidth: GRID_SPACING,
    borderLeftColor: GRID_COLOR,
    borderTopWidth: GRID_SPACING,
    borderTopColor: GRID_COLOR,
    opacity: 0.6,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#C8CCDA",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 13,
    color: "#6E7490",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
    maxWidth: 240,
  },
});
