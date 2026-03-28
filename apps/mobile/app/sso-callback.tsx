import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet, Pressable, Platform } from "react-native";
import { useAuth, useSession, useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { syncClerkWithBackend } from "../src/api/google-signin";
import { saveToken, saveUser } from "../src/api/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        await clerk.handleRedirectCallback({
          continueSignUpUrl: "/",
        });

        let token: string | null = null;

        for (let i = 0; i < 10; i++) {
          if (cancelled) return;

          if (isLoaded && isSignedIn) {
            token = await getToken();
            if (token) break;
          }

          await new Promise((resolve) => setTimeout(resolve, 300));
        }

        if (!token) {
          console.error("Failed to get Clerk token in callback");
          router.replace("/(auth)/login");
          return;
        }

        const pendingRole = await AsyncStorage.getItem("@digifix_pending_role");
        const role = pendingRole || "CUSTOMER";

        const response = await syncClerkWithBackend(token, role, session?.id);

        if (response.success && response.data) {
          await saveToken(response.data.token);
          await saveUser(response.data.user);

          if (pendingRole) {
            await AsyncStorage.removeItem("@digifix_pending_role");
          }

          const dashboardRoute =
            response.data.user.role === "SALESMAN" ? "/(salesman)" : "/(customer)";

          router.replace(dashboardRoute as any);
          return;
        }

        console.error("Backend sync failed in callback:", response.message);
        router.replace("/(auth)/login");
      } catch (err) {
        console.error("SSO callback error:", err);
        router.replace("/(auth)/login");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [clerk, isLoaded, isSignedIn, getToken, session?.id]);

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
