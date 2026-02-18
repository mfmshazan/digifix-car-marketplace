import { Stack } from "expo-router";
import { ClerkProvider } from "@clerk/clerk-expo";
import * as SecureStore from "expo-secure-store";
import { CartProvider } from "../src/store/cartStore";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!publishableKey) {
  throw new Error(
    "Missing Publishable Key. Please set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in your .env.local"
  );
}

export default function RootLayout() {
  return (
    <ClerkProvider
      publishableKey={publishableKey}
      tokenCache={{
        getToken: (key) => SecureStore.getItemAsync(key),
        saveToken: (key, token) => SecureStore.setItemAsync(key, token),
        clearToken: (key) => SecureStore.deleteItemAsync(key),
      }}
    >
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
        </Stack>
      </CartProvider>
    </ClerkProvider>
  );
}


