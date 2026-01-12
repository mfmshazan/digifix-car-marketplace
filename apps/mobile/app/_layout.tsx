import { useEffect } from "react";
import { Stack } from "expo-router";
import { AuthProvider } from "../contexts/AuthContext";
import { initializeDefaultSeller } from "../utils/orderManager";

export default function RootLayout() {
  useEffect(() => {
    // Initialize default seller account on app launch
    initializeDefaultSeller();
  }, []);

  return (
    <AuthProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(salesman)" />
      </Stack>
    </AuthProvider>
  );
}
