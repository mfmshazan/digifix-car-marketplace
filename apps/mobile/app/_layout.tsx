import { Stack } from "expo-router";
import { CartProvider } from "../src/store/cartStore";
import { PendingOrdersProvider } from "../src/store/pendingOrdersStore";
import { ClerkAuthProvider } from "../src/config/clerk-provider";

export default function RootLayout() {
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
          </Stack>
        </PendingOrdersProvider>
      </CartProvider>
    </ClerkAuthProvider>
  );
}



