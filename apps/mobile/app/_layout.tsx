import { useEffect } from "react";
import { Stack } from "expo-router";
import { router } from "expo-router";
import { CartProvider } from "../src/store/cartStore";
import { PendingOrdersProvider } from "../src/store/pendingOrdersStore";
import { ClerkAuthProvider } from "../src/config/clerk-provider";
// import {
//   initializeOneSignal,
//   setupNotificationHandlers,
// } from "../src/config/onesignal.config";

export default function RootLayout() {
  useEffect(() => {
    // Initialize OneSignal push notifications
    // initializeOneSignal();

    // Set up notification handlers
    // setupNotificationHandlers(
    //   // Called when notification received in foreground
    //   (notification) => {
    //     console.log("Notification received:", notification.title);
    //   },
    //   // Called when notification is clicked/opened
    //   (notification) => {
    //     console.log("Notification opened:", notification.title);
    //     
    //     // Handle deep linking from notification
    //     const data = notification.additionalData as any;
    //     if (data?.screen) {
    //       // Navigate to the specified screen
    //       router.push(data.screen);
    //     } else if (data?.orderId) {
    //       // Navigate to order details
    //       router.push(`/(customer)/orders?orderId=${data.orderId}`);
    //     }
    //   }
    // );
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
          </Stack>
        </PendingOrdersProvider>
      </CartProvider>
    </ClerkAuthProvider>
  );
}



