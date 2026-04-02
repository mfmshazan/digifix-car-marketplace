import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useAuth, useSession, useClerk } from "@clerk/expo";
import { router } from "expo-router";
import { syncClerkWithBackend } from "../src/api/google-signin";
import { saveToken, saveUser } from "../src/api/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();

  // Guard prevents duplicate backend sync calls when deps fire multiple times
  const isProcessingRef = useRef(false);
  // Track whether handleRedirectCallback has already been called
  const redirectHandledRef = useRef(false);

  // Step 1: Call handleRedirectCallback on mount so Clerk can process the
  // OAuth response URL (works for both native deep-link and web redirect).
  useEffect(() => {
    if (redirectHandledRef.current) return;
    redirectHandledRef.current = true;

    console.log("[SSOCallback] Platform:", Platform.OS);
    console.log("[SSOCallback] Initial status - isLoaded:", isLoaded, "isSignedIn:", isSignedIn);

    clerk.handleRedirectCallback({
      continueSignUpUrl: "/sso-callback",
    }).then(() => {
      console.log("[SSOCallback] handleRedirectCallback completed successfully");
    }).catch((err) => {
      // On web this can throw harmlessly when there are no params – ignore it.
      if (Platform.OS !== "web") {
        console.error("[SSOCallback] handleRedirectCallback error:", err);
      } else {
        console.log("[SSOCallback] handleRedirectCallback error (web, usually harmless):", err.message);
      }
    });
  }, [clerk, isLoaded, isSignedIn]);

  // Step 2: Once Clerk finishes processing the redirect, isSignedIn and
  // session will be populated. At that point we sync with the backend.
  useEffect(() => {
    console.log("[SSOCallback] Dependency change - isLoaded:", isLoaded, "isSignedIn:", isSignedIn, "hasSessionId:", !!session?.id);

    if (!isLoaded) return;
    if (!isSignedIn || !session) {
      console.log("[SSOCallback] Waiting for session activation...");
      return;
    }

    if (isProcessingRef.current) {
      console.log("[SSOCallback] Already processing, skipping duplicate...");
      return;
    }

    isProcessingRef.current = true;

    const run = async () => {
      try {
        console.log("[SSOCallback] Attempting to get Clerk token...");
        const token = await getToken();

        if (!token) {
          console.error("[SSOCallback] Failed to get Clerk token after session activation");
          isProcessingRef.current = false;
          // Don't bounce back immediately, let it retry once or twice if needed
          return;
        }

        console.log("[SSOCallback] Clerk token obtained successfully");

        const pendingRole = await AsyncStorage.getItem("@digifix_pending_role");
        const role = pendingRole || "CUSTOMER";
        console.log("[SSOCallback] Syncing with backend - role:", role);

        const response = await syncClerkWithBackend(token, role, session.id);
        console.log("[SSOCallback] Backend sync result successfully received");

        if (response.success && response.data) {
          console.log("[SSOCallback] Sync successful, saving data and redirecting...");
          await saveToken(response.data.token);
          await saveUser(response.data.user);

          if (pendingRole) {
            await AsyncStorage.removeItem("@digifix_pending_role");
          }

          const dashboardRoute =
            response.data.user.role === "SALESMAN"
              ? "/(salesman)"
              : "/(customer)";

          console.log("[SSOCallback] Redirecting to:", dashboardRoute);
          router.replace(dashboardRoute as any); // Cast as any because dynamic route groups are not perfectly typed by expo-router yet
          return;
        }

        console.error("[SSOCallback] Backend sync failed:", response.message);
        isProcessingRef.current = false;
        router.replace("/(auth)/login");
      } catch (err) {
        console.error("[SSOCallback] Critical error during sync:", err);
        isProcessingRef.current = false;
        router.replace("/(auth)/login");
      }
    };

    run();
  }, [isLoaded, isSignedIn, session, getToken]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.title}>Completing Sign-In</Text>
        <Text style={styles.subtitle}>
          Please wait while we sync your account...
        </Text>

        <Pressable
          style={styles.backButton}
          onPress={() => {
            console.log("[SSOCallback] Manual back to login clicked");
            router.replace("/(auth)/login");
          }}
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
