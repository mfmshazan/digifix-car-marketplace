import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Platform } from "react-native";
import { useAuth, useSession } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { syncClerkWithBackend } from "../src/api/google-signin";
import { saveToken, saveUser } from "../src/api/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SSOCallbackScreen() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();

  useEffect(() => {
    let timeout: any;

    const handleCallback = async () => {
      // Wait for Clerk to load
      if (!isLoaded) return;

      try {
        if (isSignedIn) {
          // Get the Clerk session token
          const clerkToken = await getToken();

          if (!clerkToken) {
            console.error("Failed to get Clerk token in callback");
            router.replace("/(auth)/login");
            return;
          }

          // Check if there's a pending role from registration
          const pendingRole = await AsyncStorage.getItem("@digifix_pending_role");
          const role = pendingRole || "CUSTOMER";

          // Sync with our backend - Pass sessionId for improved verification reliability
          const response = await syncClerkWithBackend(clerkToken, role, session?.id);

          if (response.success && response.data) {
            await saveToken(response.data.token);
            await saveUser(response.data.user);

            // Clear pending role
            if (pendingRole) {
              await AsyncStorage.removeItem("@digifix_pending_role");
            }

            // Redirect based on role
            const dashboardRoute = response.data.user.role === "SALESMAN" ? "/(salesman)" : "/(customer)";
            console.log('Sync successful from callback, redirecting to:', dashboardRoute);

            if (Platform.OS === 'web') {
              router.replace(dashboardRoute as any);
              // Fallback for web
              setTimeout(() => {
                if (window.location.pathname.includes('sso-callback')) {
                   window.location.href = dashboardRoute;
                }
              }, 1000);
            } else {
              router.replace(dashboardRoute as any);
            }
          } else {
            console.error("Backend sync failed in callback (ERR_C):", response.message);
            router.replace("/(auth)/login");
          }
        } else {
          // If not signed in yet, wait a few seconds for Clerk to process the redirect parameters
          timeout = setTimeout(() => {
            if (isLoaded && !isSignedIn) {
              console.log("SSO callback timed out, redirecting to login");
              router.replace("/(auth)/login");
            }
          }, 5000);
        }
      } catch (err) {
        console.error("SSO callback error:", err);
        router.replace("/(auth)/login");
      }
    };

    handleCallback();
    return () => timeout && clearTimeout(timeout);
  }, [isLoaded, isSignedIn]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.title}>Completing Sign-In</Text>
        <Text style={styles.subtitle}>Please wait while we sync your account...</Text>
        
        <Pressable 
          style={styles.backButton} 
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.backButtonText}>Back to Login</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 24,
  },
  backButton: {
    marginTop: 16,
    padding: 12,
  },
  backButtonText: {
    color: "#00002E",
    fontSize: 14,
    fontWeight: "600",
  },
});
