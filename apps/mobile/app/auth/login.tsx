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
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../config/firebase";
import { getUserFromBackend } from "../../services/api";
import { getUserRole } from "../../utils/orderManager";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    // Validation
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    setLoading(true);

    try {
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Check local role first (orderManager)
      const localRole = await getUserRole(email.trim());
      let userRole = localRole === "seller" ? "SALESMAN" : "CUSTOMER";

      // Fetch user role from backend as backup
      try {
        const response = await getUserFromBackend(userCredential.user.uid);
        if (response.success && response.data) {
          userRole = response.data.role;
        }
      } catch (backendError) {
        console.error("Backend error:", backendError);
        // Continue with local role if backend fails
      }
      
      // Navigate based on user role
      if (userRole === "SALESMAN" || localRole === "seller") {
        router.replace("/(salesman)");
      } else {
        router.replace("/(customer)");
      }
    } catch (error: any) {
      let errorMessage = "Failed to sign in. Please check your email and password.";

      if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      } else if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email. Please check your email or sign up.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email format. Please check your email address.";
      } else if (error.code === "auth/too-many-requests") {
        errorMessage = "Too many failed attempts. Please try again later or reset your password.";
      }

      Alert.alert("Login Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address first");
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert(
        "Success",
        "Password reset email sent! Please check your inbox."
      );
    } catch (error: any) {
      let errorMessage = "Failed to send reset email";

      if (error.code === "auth/user-not-found") {
        errorMessage = "No account found with this email";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      }

      Alert.alert("Error", errorMessage);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>
            Sign in to continue shopping for parts
          </Text>
        </View>

        {/* Email Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#999"
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
        </View>

        {/* Forgot Password Link */}
        <TouchableOpacity
          onPress={handleForgotPassword}
          style={styles.forgotPassword}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          style={styles.signInButton}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signInButtonText}>Sign in</Text>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sign Up Link */}
        <View style={styles.signUpContainer}>
          <Text style={styles.signUpText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/auth/signup")}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    position: "absolute",
    top: 20,
    left: 24,
    zIndex: 10,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#000",
  },
  eyeIcon: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "500",
  },
  signInButton: {
    backgroundColor: "#4285F4",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signInButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: "#999",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
    color: "#666",
  },
  signUpLink: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "600",
  },
});
