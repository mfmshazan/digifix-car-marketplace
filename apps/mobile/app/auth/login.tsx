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
  Modal,
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
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("CUSTOMER");
  const [pendingAuthType, setPendingAuthType] = useState<"email" | "google" | null>(null);

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
      // Show role selection modal for sign up
      setPendingAuthType("email");
      setShowRoleModal(true);
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
      // Show role selection modal for Google sign up
      setPendingAuthType("google");
      setShowRoleModal(true);
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

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleRoleConfirm = () => {
    setShowRoleModal(false);
    
    if (pendingAuthType === "email") {
      performEmailAuth(selectedRole);
    } else if (pendingAuthType === "google") {
      performGoogleAuth(selectedRole);
    }
    
    setPendingAuthType(null);
  };

  const RoleSelectionModal = () => (
    <Modal
      visible={showRoleModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowRoleModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Join as</Text>
          <Text style={styles.modalSubtitle}>
            How would you like to use DigiFix?
          </Text>

          {/* Customer Option */}
          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === "CUSTOMER" && styles.roleOptionSelected,
            ]}
            onPress={() => handleRoleSelect("CUSTOMER")}
          >
            <View style={styles.roleIconContainer}>
              <Ionicons
                name="cart"
                size={32}
                color={selectedRole === "CUSTOMER" ? "#FF6B35" : "#666"}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === "CUSTOMER" && styles.roleTitleSelected,
                ]}
              >
                Customer
              </Text>
              <Text style={styles.roleDescription}>
                Browse and buy car parts from trusted sellers
              </Text>
            </View>
            <View
              style={[
                styles.roleRadio,
                selectedRole === "CUSTOMER" && styles.roleRadioSelected,
              ]}
            >
              {selectedRole === "CUSTOMER" && (
                <View style={styles.roleRadioInner} />
              )}
            </View>
          </TouchableOpacity>

          {/* Salesman Option */}
          <TouchableOpacity
            style={[
              styles.roleOption,
              selectedRole === "SALESMAN" && styles.roleOptionSelected,
            ]}
            onPress={() => handleRoleSelect("SALESMAN")}
          >
            <View style={styles.roleIconContainer}>
              <Ionicons
                name="storefront"
                size={32}
                color={selectedRole === "SALESMAN" ? "#FF6B35" : "#666"}
              />
            </View>
            <View style={styles.roleInfo}>
              <Text
                style={[
                  styles.roleTitle,
                  selectedRole === "SALESMAN" && styles.roleTitleSelected,
                ]}
              >
                Salesman
              </Text>
              <Text style={styles.roleDescription}>
                Sell car parts and manage your store
              </Text>
            </View>
            <View
              style={[
                styles.roleRadio,
                selectedRole === "SALESMAN" && styles.roleRadioSelected,
              ]}
            >
              {selectedRole === "SALESMAN" && (
                <View style={styles.roleRadioInner} />
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalConfirmButton}
            onPress={handleRoleConfirm}
          >
            <Text style={styles.modalConfirmButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => {
              setShowRoleModal(false);
              setPendingAuthType(null);
            }}
          >
            <Text style={styles.modalCancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

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

      {/* Role Selection Modal */}
      <RoleSelectionModal />
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1A1A2E",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  roleOptionSelected: {
    borderColor: "#FF6B35",
    backgroundColor: "#FFF8F5",
  },
  roleIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 4,
  },
  roleTitleSelected: {
    color: "#FF6B35",
  },
  roleDescription: {
    fontSize: 13,
    color: "#666",
  },
  roleRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    justifyContent: "center",
    alignItems: "center",
  },
  roleRadioSelected: {
    borderColor: "#FF6B35",
  },
  roleRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF6B35",
  },
  modalConfirmButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  modalConfirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  modalCancelButton: {
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  modalCancelButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
});
