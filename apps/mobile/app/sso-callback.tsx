import React, { useEffect, useRef, useState } from "react";
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
import { saveToken, saveUser, getUserPrefs, saveUserPrefs, mergeServerUserAndPrefs } from "../src/api/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SSOCallbackScreen() {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const [syncError, setSyncError] = useState("");
  const [retryAttempt, setRetryAttempt] = useState(0);

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
    setSyncError("");

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
          // Merge locally-saved profile prefs (name/phone/avatar_local that survive
          // logout) on top of the backend user so they are never discarded.
          const email = response.data.user.email || "";
          const prefs = email ? await getUserPrefs(email) : {};
          const merged = mergeServerUserAndPrefs(response.data.user, prefs);

          // If the backend now has a real uploaded avatar, the local fallback
          // URI is no longer needed — clear it so the backend URL is used.
          if (response.data.user.avatar && merged.avatar_local) {
            merged.avatar_local = null;
            if (email) {
              await saveUserPrefs(email, { avatar_local: null });
            }
          }

          await saveUser(merged);

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

        const message = response.message || "Could not sync your account with the backend.";
        console.error("[SSOCallback] Backend sync failed:", message);
        setSyncError(message);
      } catch (err: any) {
        console.error("[SSOCallback] Critical error during sync:", err);
        setSyncError(err?.message || "Could not sync your account with the backend.");
      }
    };

    run();
  }, [isLoaded, isSignedIn, session, getToken, retryAttempt]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {!syncError && <ActivityIndicator size="large" color="#00002E" />}
        <Text style={styles.title}>
          {syncError ? "Backend Unavailable" : "Completing Sign-In"}
        </Text>
        <Text style={styles.subtitle}>
          {syncError || "Please wait while we sync your account..."}
        </Text>

        {syncError && (
          <Pressable
            style={styles.retryButton}
            onPress={() => {
              isProcessingRef.current = false;
              setRetryAttempt((attempt) => attempt + 1);
            }}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        )}

        <Pressable
          style={styles.backButton}
          onPress={async () => {
            console.log("[SSOCallback] Manual back to login clicked");
            await clerk.signOut();
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
  retryButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  backButtonText: {
    color: "#00002E",
    fontSize: 14,
    fontWeight: "600",
  },
});
