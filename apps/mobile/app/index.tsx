import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, ActivityIndicator } from "react-native";

export default function Index() {
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem("@digifix_auth_token");
        setIsAuthenticated(!!token);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setIsChecking(false);
      }
    };
    checkAuth();
  }, []);

  if (isChecking) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#00002E" }}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(customer)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
