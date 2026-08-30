import { View, Image, ActivityIndicator, StyleSheet } from "react-native";

/**
 * Full-screen branded "Digifix" loading screen — the same logo shown on the
 * native splash. Reused on cold start (while auth is checked) and right after
 * login (while the app transitions to the home screen), so the boot experience
 * stays branded instead of flashing a bare spinner.
 */
export default function BrandedLoading() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/images/splash-icon.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator size="large" color="#00002E" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  logo: {
    width: 180,
    height: 180,
  },
  spinner: {
    marginTop: 28,
  },
});
