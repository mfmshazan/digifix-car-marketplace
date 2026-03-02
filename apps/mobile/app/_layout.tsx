import { Stack } from "expo-router";
import { CartProvider } from "../src/store/cartStore";
import { PendingOrdersProvider } from "../src/store/pendingOrdersStore";

export default function RootLayout() {
  return (
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
  );
}


