import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface GoogleIconProps {
  size?: number;
}

export const GoogleIcon: React.FC<GoogleIconProps> = ({ size = 24 }) => {
  const scale = size / 24;
  
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Text style={[styles.letter, { fontSize: 16 * scale }]}>G</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  letter: {
    fontWeight: "700",
    color: "#4285F4",
  },
});

export default GoogleIcon;
