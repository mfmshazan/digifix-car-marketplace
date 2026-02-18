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
  Animated,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSignUp, useUser } from "@clerk/clerk-expo";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { registerUser, googleCallback, saveToken, saveUser } from "../../src/api/auth";

WebBrowser.maybeCompleteAuthSession();

const redirectUrl = AuthSession.makeRedirectUri({
  scheme: "mobile",
  path: "/(auth)/register",
});

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [loadingText, setLoadingText] = useState("Creating your account...");

  const { signUp, isLoaded: isSignUpLoaded } = useSignUp();
  const { user: clerkUser, isLoaded: isUserLoaded } = useUser();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const googleButtonScale = useRef(new Animated.Value(1)).current;
  const customerButtonScale = useRef(new Animated.Value(1)).current;
  const salesmanButtonScale = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  // Handle Clerk user changes (after Google OAuth redirect)
  useEffect(() => {
    if (isUserLoaded && clerkUser) {
      syncClerkUserWithBackend();
    }
  }, [clerkUser, isUserLoaded]);

  const syncClerkUserWithBackend = async () => {
    if (!clerkUser) return;

    try {
      setIsGoogleLoading(true);
      setShowLoadingOverlay(true);
      setLoadingText("Signing up with Google...");

      const userEmail = clerkUser.emailAddresses?.[0]?.emailAddress || '';
      const userName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      const avatar = clerkUser.imageUrl || '';
      const googleId = clerkUser.externalAccounts?.[0]?.providerUserId || clerkUser.id;

      const result = await googleCallback({
        email: userEmail,
        name: userName,
        googleId,
        avatar,
      });

      if (result.success && result.data) {
        await saveToken(result.data.token);
        await saveUser(result.data.user);

        setLoadingText("Welcome to DIGIFIX! 🎉");
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (result.data.user.role === "SALESMAN") {
          router.replace("/(salesman)");
        } else {
          router.replace("/(customer)");
        }
      } else {
        setShowLoadingOverlay(false);
        setError("Failed to sync user data");
      }
    } catch (err: any) {
      console.error("Backend sync error:", err);
      setShowLoadingOverlay(false);
      setError("Failed to sync user data. Please try again.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Spinning animation for loading overlay
  useEffect(() => {
    if (showLoadingOverlay) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.setValue(0);
    }
  }, [showLoadingOverlay]);

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

  const handleGoogleSignUp = async () => {
    if (!isSignUpLoaded) {
      setError("Clerk is still loading. Please try again.");
      return;
    }

    setIsGoogleLoading(true);
    setShowLoadingOverlay(true);
    setLoadingText("Connecting to Google...");

    try {
      await signUp?.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: redirectUrl,
        redirectUrlComplete: redirectUrl,
      });
    } catch (err: any) {
      console.error("Google sign-up error:", err);
      setShowLoadingOverlay(false);
      setIsGoogleLoading(false);
      setError(err.message || "Failed to sign up with Google. Please try again.");
    }
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
    setShowLoadingOverlay(true);
    setLoadingText("Creating your account...");

    try {
      const response = await registerUser({
        name,
        email,
        password,
        role: role,
      });

      if (response.success && response.data) {
        await saveToken(response.data.token);
        await saveUser(response.data.user);

        const userRole = response.data.user.role;

        // Show success in loading overlay, then auto-sign in
        setLoadingText("Registration successful! 🎉\nSigning you in...");
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Auto-navigate to dashboard
        if (userRole === "SALESMAN") {
          router.replace("/(salesman)");
        } else {
          router.replace("/(customer)");
        }
      } else {
        setShowLoadingOverlay(false);
        setError(response.message || "Registration failed");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setShowLoadingOverlay(false);
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Loading Overlay */}
      {showLoadingOverlay && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Ionicons name="car-sport" size={48} color="#00002E" />
            </Animated.View>
            <Text style={styles.loadingTitle}>{loadingText}</Text>
            <ActivityIndicator size="small" color="#00002E" style={{ marginTop: 12 }} />
          </View>
        </View>
      )}

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

          {/* Form Section with Animation */}
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

            {/* Error Message */}
            {error ? (
              <View style={styles.errorContainer}>
                <Ionicons name="alert-circle" size={20} color="#FF4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Role Selection */}
            <Text style={styles.label}>Select Role</Text>
            <View style={styles.roleContainer}>
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
                  Salesman
                </Text>
              </Pressable>
            </View>

            {/* Full Name Input */}
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

            {/* Email Input */}
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
              />
            </View>

            {/* Password Input */}
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

            {/* Confirm Password Input */}
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

            {/* Sign Up Button with Animation */}
            <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
              <Pressable
                style={[
                  styles.signupButton,
                  (isLoading || showLoadingOverlay) && styles.signupButtonDisabled,
                ]}
                onPress={handleRegister}
                onPressIn={() => handlePressIn(buttonScale)}
                onPressOut={() => handlePressOut(buttonScale)}
                disabled={isLoading || showLoadingOverlay}
              >
                {isLoading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator color="#FFFFFF" size="small" />
                    <Text style={[styles.signupButtonText, { marginLeft: 8 }]}>Creating Account...</Text>
                  </View>
                ) : (
                  <Text style={styles.signupButtonText}>Sign Up</Text>
                )}
              </Pressable>
            </Animated.View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Sign Up Button */}
            <Animated.View style={{ transform: [{ scale: googleButtonScale }] }}>
              <Pressable
                style={[styles.googleButton, (isGoogleLoading || showLoadingOverlay) && styles.googleButtonDisabled]}
                onPress={handleGoogleSignUp}
                onPressIn={() => handlePressIn(googleButtonScale)}
                onPressOut={() => handlePressOut(googleButtonScale)}
                disabled={isGoogleLoading || !isSignUpLoaded || showLoadingOverlay}
              >
                {isGoogleLoading ? (
                  <View style={styles.buttonLoadingRow}>
                    <ActivityIndicator color="#DB4437" size="small" />
                    <Text style={[styles.googleButtonText, { marginLeft: 8 }]}>Connecting...</Text>
                  </View>
                ) : (
                  <>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Sign up with Google</Text>
                  </>
                )}
              </Pressable>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
                <Text style={styles.loginText}>Sign In</Text>
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
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF0F0",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  roleContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  roleButtonActive: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#00002E",
    marginLeft: 8,
  },
  roleButtonTextActive: {
    color: "#FFFFFF",
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
  signupButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    height: 56,
  },
  signupButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  signupButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  loginText: {
    color: "#00002E",
    fontSize: 14,
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
  googleButtonDisabled: {
    backgroundColor: "#F5F5F5",
    borderColor: "#D1D5DB",
  },
  googleButtonText: {
    color: "#1A1A1A",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 46, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
    minWidth: 260,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#00002E",
    marginTop: 20,
    textAlign: "center",
    lineHeight: 26,
  },
});
