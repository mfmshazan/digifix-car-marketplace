import { useEffect } from "react";
import { Stack } from "expo-router";
import { CartProvider } from "../src/store/cartStore";
import { PendingOrdersProvider } from "../src/store/pendingOrdersStore";
import { ClerkAuthProvider } from "../src/config/clerk-provider";
import { initOneSignal } from "../src/lib/onesignal";


export default function RootLayout() {
  useEffect(() => {
    // Initialise push notifications once at launch (no-ops in Expo Go / web).
    initOneSignal();
  }, []);

  return (
    <ClerkAuthProvider>
      <CartProvider>
        <PendingOrdersProvider>
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(customer)" />
            <Stack.Screen name="(salesman)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="edit-profile"
              options={{
                headerShown: false,
                presentation: "card",
              }}
            />
          </Stack>
        </PendingOrdersProvider>
      </CartProvider>
    </ClerkAuthProvider>
  );
}



