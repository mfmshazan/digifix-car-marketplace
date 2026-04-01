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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerUser } from "../../src/api/auth";
import { saveToken, saveUser } from "../../src/api/storage";
import { useAuth, useSession } from "@clerk/expo";
import { useGoogleSignIn, syncClerkWithBackend } from "../../src/api/google-signin";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"CUSTOMER" | "SALESMAN">("CUSTOMER");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { session } = useSession();
  const { signInWithGoogle } = useGoogleSignIn();

  // Ref to prevent infinite sync loops
  const hasAttemptedSyncRef = useRef(false);

  useEffect(() => {
    const checkExistingSession = async () => {
      // Only proceed if Clerk is loaded, a session exists, and we haven't tried syncing yet
      if (!isLoaded || !isSignedIn || !session || hasAttemptedSyncRef.current) return;

      // Avoid auto-sync on web register screen during OAuth redirect flow.
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

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const googleButtonScale = useRef(new Animated.Value(1)).current;
  const customerButtonScale = useRef(new Animated.Value(1)).current;
  const salesmanButtonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePressIn = (animValue: Animated.Value) => {
    Animated.spring(animValue, {
      toValue: 0.95,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = (animValue: Animated.Value) => {
    Animated.spring(animValue, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await registerUser({
        name,
        email,
        password,
        role,
      });

      if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveUser(response.data.user);

        const userRole = response.data.user.role;
        const dashboardRoute =
          userRole === "SALESMAN" ? "/(salesman)" : "/(customer)";

        // Redirect immediately after successful registration.
        // Using a blocking Alert button callback can make it look like the
        // user is not redirected (especially if the user doesn't press "OK").
        Alert.alert("Success", "Registration successful! Welcome to DIGIFIX!");
        router.replace(dashboardRoute as any);
        return;
      } else {
        setError(response.message || "Registration failed");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      setError("");

      // Always persist the role so sso-callback.tsx can read it on any platform
      await AsyncStorage.setItem("@digifix_pending_role", role);

      const result = await signInWithGoogle();

      console.log("Google sign-up result:", result);

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
      console.error("Google sign-up error:", err);
      setError(err.message || "Failed to sign up with Google. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackendSync = async (clerkToken: string, sessionId?: string) => {
    try {
      console.log("Finalizing backend sync with sessionId:", sessionId);

      const response = await syncClerkWithBackend(
        clerkToken,
        role,
        sessionId
      );

      console.log("Backend sync response:", response);

      if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveUser(response.data.user);

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
          <Animated.View
            style={[
              styles.logoSection,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <View style={styles.logoContainer}>
              <Ionicons name="car-sport" size={64} color="#00002E" />
            </View>
            <Text style={styles.brandName}>DIGIFIX Auto Parts</Text>
            <Text style={styles.tagline}>
              Your trusted car parts delivery partner
            </Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.formCard,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <Text style={styles.title}>Create Account</Text>

            {error && !isLoading ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : null}

            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
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

            <View style={styles.roleContainer}>
              <Text style={styles.roleLabel}>I want to register as:</Text>
              <View style={styles.roleButtons}>
                <Animated.View
                  style={[{ flex: 1 }, { transform: [{ scale: customerButtonScale }] }]}
                >
                  <Pressable
                    style={[
                      styles.roleButton,
                      role === "CUSTOMER" && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole("CUSTOMER")}
                    onPressIn={() => handlePressIn(customerButtonScale)}
                    onPressOut={() => handlePressOut(customerButtonScale)}
                  >
                    <Ionicons
                      name="person-outline"
                      size={20}
                      color={role === "CUSTOMER" ? "#FFFFFF" : "#666"}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === "CUSTOMER" && styles.roleButtonTextActive,
                      ]}
                    >
                      Customer
                    </Text>
                  </Pressable>
                </Animated.View>

                <Animated.View
                  style={[{ flex: 1 }, { transform: [{ scale: salesmanButtonScale }] }]}
                >
                  <Pressable
                    style={[
                      styles.roleButton,
                      role === "SALESMAN" && styles.roleButtonActive,
                    ]}
                    onPress={() => setRole("SALESMAN")}
                    onPressIn={() => handlePressIn(salesmanButtonScale)}
                    onPressOut={() => handlePressOut(salesmanButtonScale)}
                  >
                    <Ionicons
                      name="storefront-outline"
                      size={20}
                      color={role === "SALESMAN" ? "#FFFFFF" : "#666"}
                    />
                    <Text
                      style={[
                        styles.roleButtonText,
                        role === "SALESMAN" && styles.roleButtonTextActive,
                      ]}
                    >
                      Shop Owner
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
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

            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#999"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
            </View>

            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.registerButtonText}>Sign Up</Text>
                )}
              </Pressable>
            </Animated.View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
              <Pressable
                style={styles.googleButton}
                onPress={handleGoogleSignUp}
                disabled={isLoading}
                onPressIn={() => handlePressIn(googleButtonScale)}
                onPressOut={() => handlePressOut(googleButtonScale)}
              >
                <Ionicons name="logo-google" size={20} color="#DB4437" />
                <Text style={styles.googleButtonText}>Sign up with Google</Text>
              </Pressable>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>{"Already have an account? "}</Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.signInText}>Sign In</Text>
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
    marginTop: 10,
    marginBottom: 16,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  brandName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  tagline: {
    fontSize: 12,
    color: "#666666",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 20,
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
  registerButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    marginTop: 8,
  },
  registerButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  roleContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  roleButtons: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
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
    marginTop: 20,
  },
  footerText: {
    color: "#666666",
    fontSize: 14,
  },
  signInText: {
    color: "#00002E",
    fontSize: 14,
    fontWeight: "600",
  },
});