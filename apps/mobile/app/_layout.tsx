import { Stack } from "expo-router";
import { CartProvider } from "../src/store/cartStore";

export default function RootLayout() {
  return (
    <CartProvider>
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
        <Stack.Screen name="(checkout)" options={{ headerShown: false }} />
      </Stack>
    </CartProvider>
  );
}


