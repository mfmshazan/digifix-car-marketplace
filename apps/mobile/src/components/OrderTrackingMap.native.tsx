import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";

interface OrderTrackingMapProps {
  style?: StyleProp<ViewStyle>;
  latitude?: number;
  longitude?: number;
}

const DEFAULT_COORDS = {
  latitude: 6.9271, // Colombo default
  longitude: 79.8612,
};

export default function OrderTrackingMap({
  style,
  latitude = DEFAULT_COORDS.latitude,
  longitude = DEFAULT_COORDS.longitude,
}: OrderTrackingMapProps) {
  return (
    <MapView
      style={[styles.map, style]}
      initialRegion={{
        latitude,
        longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }}
    >
      <Marker
        coordinate={{ latitude, longitude }}
        title="Rider Location"
        description="Your rider is here"
      >
        <View style={styles.markerContainer}>
          <Ionicons name="bicycle" size={24} color="#FFF" />
        </View>
      </Marker>
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerContainer: {
    backgroundColor: "#FF6B35",
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#FFF",
  },
});
