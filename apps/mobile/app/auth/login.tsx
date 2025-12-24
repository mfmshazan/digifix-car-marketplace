import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type UserRole = "CUSTOMER" | "SALESMAN";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("CUSTOMER");

  const handleEmailAuth = () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (isSignUp) {
      // Use the selected role directly for sign up
      performEmailAuth(selectedRole);
    } else {
      // Direct sign in - role comes from backend
      performEmailAuth();
    }
  };

  const performEmailAuth = async (role?: UserRole) => {
    try {
      // TODO: Implement actual API call
      console.log(isSignUp ? "Sign Up" : "Sign In", { 
        email, 
        password, 
        role: role || selectedRole 
      });
      
      // Simulate API response with role
      const userRole = role || "CUSTOMER";
      
      // Navigate based on role
      if (userRole === "SALESMAN") {
        router.replace("/(salesman)" as any);
      } else {
        router.replace("/(customer)" as any);
      }
    } catch {
      Alert.alert("Error", "Authentication failed. Please try again.");
    }
  };

  const handleGoogleAuth = () => {
    if (isSignUp) {
      // Use the selected role directly for Google sign up
      performGoogleAuth(selectedRole);
    } else {
      // For sign in, attempt Google auth - role comes from backend
      performGoogleAuth();
    }
  };

  const performGoogleAuth = async (role?: UserRole) => {
    try {
      // TODO: Implement Google authentication
      console.log("Google Auth", { role: role || selectedRole });
      
      // Simulate API response with role
      const userRole = role || "CUSTOMER";
      
      // Navigate based on role
      if (userRole === "SALESMAN") {
        router.replace("/(salesman)" as any);
      } else {
        router.replace("/(customer)" as any);
      }
    } catch {
      Alert.alert("Error", "Google authentication failed. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo and Title Section */}
        <View style={styles.headerSection}>
          <View style={styles.logoContainer}>
            <Ionicons name="car-sport" size={60} color="#FF6B35" />
          </View>
          <Text style={styles.title}>DigiFix Auto Parts</Text>
          <Text style={styles.subtitle}>
            Your trusted car parts delivery partner
          </Text>
        </View>

        {/* Auth Form Section */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>
            {isSignUp ? "Create Account" : "Welcome Back"}
          </Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#666"
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

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Confirm Password (Sign Up only) */}
          {isSignUp && (
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#666"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Role Selection (Sign Up only) */}
          {isSignUp && (
            <View style={styles.roleSelectionContainer}>
              <Text style={styles.roleSelectionLabel}>I want to join as:</Text>
              <View style={styles.roleButtonsContainer}>
                {/* Customer Option */}
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === "CUSTOMER" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setSelectedRole("CUSTOMER")}
                >
                  <Ionicons
                    name="cart"
                    size={24}
                    color={selectedRole === "CUSTOMER" ? "#FFFFFF" : "#FF6B35"}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === "CUSTOMER" && styles.roleButtonTextSelected,
                    ]}
                  >
                    Customer
                  </Text>
                </TouchableOpacity>

                {/* Salesman Option */}
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    selectedRole === "SALESMAN" && styles.roleButtonSelected,
                  ]}
                  onPress={() => setSelectedRole("SALESMAN")}
                >
                  <Ionicons
                    name="storefront"
                    size={24}
                    color={selectedRole === "SALESMAN" ? "#FFFFFF" : "#FF6B35"}
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      selectedRole === "SALESMAN" && styles.roleButtonTextSelected,
                    ]}
                  >
                    Salesman
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot Password (Sign In only) */}
          {!isSignUp && (
            <TouchableOpacity style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          )}

          {/* Email Auth Button */}
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleEmailAuth}
          >
            <Text style={styles.primaryButtonText}>
              {isSignUp ? "Sign Up" : "Sign In"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.divider} />
          </View>

          {/* Google Auth Button */}
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleAuth}
          >
            <Ionicons name="logo-google" size={24} color="#DB4437" />
            <Text style={styles.googleButtonText}>
              {isSignUp ? "Sign up with Google" : "Sign in with Google"}
            </Text>
          </TouchableOpacity>

          {/* Toggle Sign In / Sign Up */}
          <View style={styles.toggleContainer}>
            <Text style={styles.toggleText}>
              {isSignUp
                ? "Already have an account? "
                : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.toggleLink}>
                {isSignUp ? "Sign In" : "Sign Up"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    width: 100,
    height: 100,
    backgroundColor: "#FFF3EE",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: "#1A1A2E",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "500",
  },
  primaryButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    color: "#999",
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 52,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginBottom: 24,
  },
  googleButtonText: {
    color: "#1A1A2E",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 12,
  },
  toggleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  toggleText: {
    color: "#666",
    fontSize: 14,
  },
  toggleLink: {
    color: "#FF6B35",
    fontSize: 14,
    fontWeight: "600",
  },
  // Role Selection Styles (inline on form)
  roleSelectionContainer: {
    marginBottom: 20,
  },
  roleSelectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 12,
  },
  roleButtonsContainer: {
    flexDirection: "row",
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF8F5",
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    borderColor: "#FF6B35",
    gap: 8,
  },
  roleButtonSelected: {
    backgroundColor: "#FF6B35",
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF6B35",
  },
  roleButtonTextSelected: {
    color: "#FFFFFF",
  },
});
