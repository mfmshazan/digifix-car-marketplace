import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { loginUser } from "../../src/api/auth";
import { saveToken, saveUser, getUserPrefs, saveUserPrefs, mergeServerUserAndPrefs } from "../../src/api/storage";
import { useAuth, useSession } from "@clerk/expo";
import { useGoogleSignIn, syncClerkWithBackend } from "../../src/api/google-signin";

/** RN-web has no native driver — avoids console noise on web. */
const useNativeDriverForAnim = Platform.OS !== "web";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const { signInWithGoogle } = useGoogleSignIn();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const googleButtonScale = useRef(new Animated.Value(1)).current;

  // Ref to prevent infinite sync loops
  const hasAttemptedSyncRef = useRef(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      // Only proceed if Clerk is loaded, a session exists, and we haven't tried syncing yet
      if (!isLoaded || !isSignedIn || !session || hasAttemptedSyncRef.current) return;

      // Avoid auto-sync on web login screen during OAuth redirect flow.
      if (Platform.OS === "web") return;

      try {
        const clerkToken = await getToken();
        if (clerkToken) {
          hasAttemptedSyncRef.current = true;
          setIsLoading(true);
          await handleBackendSync(clerkToken, session?.id);
        }
      } catch (err) {
        console.error("Auto-sync error:", err);
        hasAttemptedSyncRef.current = false; // Allow retry on error if needed
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, [isLoaded, isSignedIn, session, getToken]);

  useEffect(() => {
    Animated.parallel([

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: useNativeDriverForAnim,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: useNativeDriverForAnim,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: useNativeDriverForAnim,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePressIn = (animValue: Animated.Value) => {
    Animated.spring(animValue, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: useNativeDriverForAnim,
    }).start();
  };

  const handlePressOut = (animValue: Animated.Value) => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 5,
      useNativeDriver: useNativeDriverForAnim,
    }).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await loginUser({ email, password });

      if (response.success && response.data) {
        await saveToken(response.data.token);
        // Merge any locally saved profile prefs (name/phone/avatar_local)
        // that survived logout back into the fresh backend user data.
        const prefs = await getUserPrefs(response.data.user.email || "");
        const merged: any = mergeServerUserAndPrefs(response.data.user, prefs);

        // If the backend has a confirmed uploaded avatar, the local fallback
        // URI is obsolete — clear it so the backend URL is displayed.
        if (response.data.user.avatar && merged.avatar_local) {
          merged.avatar_local = null;
          const em = response.data.user.email || "";
          if (em) await saveUserPrefs(em, { avatar_local: null });
        }

        await saveUser(merged);

        Alert.alert("Success", "Login successful!");

        if (response.data.user.role === "SALESMAN") {
          router.replace("/(salesman)");
        } else {
          router.replace("/(customer)");
        }
      } else {
        setError(response.message || "Login failed");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Invalid email or password. Please check your credentials or sign up first.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError("");

      const result = await signInWithGoogle();

      console.log("Google sign-in result:", result);

      if (!result.success) {
        if (result.message) {
          setError(result.message);
        }
        return;
      }

      // On web (and sometimes native), startSSOFlow triggered a full browser
      // redirect. The browser has navigated away — sso-callback.tsx will
      // handle the rest when the user returns from Google.
      if (result.redirected) {
        router.replace("/sso-callback");
        return;
      }

      // On native, sso-callback.tsx handles token retrieval & backend sync
      // after the session is confirmed active via useAuth(). We don't need
      // to call syncClerkWithBackend here — route to callback so it completes.
      router.replace("/sso-callback");
    } catch (err: any) {
      console.error("Google sign-in error:", err);
      setError(err.message || "Failed to sign in with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendSync = async (clerkToken: string, sessionId?: string) => {
    try {
      console.log("Finalizing backend sync with sessionId:", sessionId);

      const response = await syncClerkWithBackend(
        clerkToken,
        "CUSTOMER",
        sessionId
      );

      console.log("Backend sync response:", response);

      if (response.success && response.data) {
        await saveToken(response.data.token);
        // Merge any locally saved profile prefs (name/phone/avatar_local)
        // that survived logout back into the fresh backend user data.
        const prefs = await getUserPrefs(response.data.user.email || "");
        const merged: any = mergeServerUserAndPrefs(response.data.user, prefs);

        // If the backend has a confirmed uploaded avatar, the local fallback
        // URI is obsolete — clear it so the backend URL is displayed.
        if (response.data.user.avatar && merged.avatar_local) {
          merged.avatar_local = null;
          const em = response.data.user.email || "";
          if (em) await saveUserPrefs(em, { avatar_local: null });
        }

        await saveUser(merged);

        setError("");

        const dashboardRoute =
          response.data.user.role === "SALESMAN"
            ? "/(salesman)"
            : "/(customer)";

        console.log("Sync successful, redirecting to:", dashboardRoute);

        router.replace(dashboardRoute as any);
        return;
      }

      const errorMsg = response.message || "Backend sync failed";
      console.error("Backend sync failed:", errorMsg);
      setError(errorMsg);
    } catch (syncErr: any) {
      console.error("Backend sync error:", syncErr);
      setError(`Auth Error: ${syncErr.message || "Unknown error"}`);
    }
  };

  const handleForgotPassword = () => {
    Alert.alert(
      "Reset Password",
      "Please enter your email address to receive a password reset link.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send",
          onPress: () => {
            if (email) {
              Alert.alert("Email Sent", `Password reset link sent to ${email}`);
            } else {
              Alert.alert("Error", "Please enter your email address first");
            }
          }
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo Section with Animation */}
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              }
            ]}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={64} color="#00002E" />
            </View>
            <Text style={styles.brandName}>DIGIFIX Auto Parts</Text>
            <Text style={styles.tagline}>Your trusted car parts delivery partner</Text>
          </Animated.View>

          {/* Form Card with Animation */}
          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <Text style={styles.title}>Welcome Back</Text>

            {error && !isLoading ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.inputContainer}>
              <Ionicons name="mail-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#999"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* Sign In Button with Animation */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
                onPress={handleLogin}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign In</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign In Button */}
            <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
              <Pressable
                style={styles.googleButton}
                onPress={handleGoogleSignIn}
                disabled={isLoading}
                onPressIn={() => handlePressIn(googleButtonScale)}
                onPressOut={() => handlePressOut(googleButtonScale)}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.googleButtonText}>Sign in with Google</Text>
              </Pressable>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{"Don't have an account? "}</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
                <Text style={styles.signUpText}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  brandName: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  tagline: {
    fontSize: 14,
    color: "#666666",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
      },
    }),
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 24,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    marginBottom: 16,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1A1A1A",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#00002E",
    fontSize: 14,
    fontWeight: "500",
  },
  loginButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
  },
  loginButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 12,
    color: "#9CA3AF",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    height: 56,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  googleButtonText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#666666",
    fontSize: 14,
  },
  signUpText: {
    color: "#00002E",
    fontSize: 14,
    fontWeight: "600",
  },
});



