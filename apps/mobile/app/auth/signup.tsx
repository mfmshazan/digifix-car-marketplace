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
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../../config/firebase";
import { saveUserToBackend } from "../../services/api";

type UserType = "buyer" | "seller";

export default function SignUpScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [userType, setUserType] = useState<UserType>("buyer");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    // Validation
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return;
    }

    if (!password) {
      Alert.alert("Error", "Please enter a password");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Create user with Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      // Update user profile with name
      await updateProfile(userCredential.user, {
        displayName: fullName.trim(),
      });

      // Save user data to backend
      try {
        await saveUserToBackend(
          userCredential.user.uid,
          email.trim(),
          fullName.trim(),
          userType === "buyer" ? "CUSTOMER" : "SALESMAN"
        );
      } catch (backendError) {
        console.error("Backend error:", backendError);
        // Continue even if backend fails - user is created in Firebase
      }

      // Navigate based on user type
      if (userType === "buyer") {
        router.replace("/(customer)");
      } else {
        router.replace("/(salesman)");
      }
    } catch (error: any) {
      let errorMessage = "Failed to create account";

      if (error.code === "auth/email-already-in-use") {
        errorMessage = "This email is already registered";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = "Invalid email address";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "Password is too weak";
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>
            Sign up to start buying or selling parts
          </Text>
        </View>

        {/* Full Name Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons
              name="person-outline"
              size={20}
              color="#999"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
          </View>
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

        {/* User Type Selection */}
        <View style={styles.userTypeContainer}>
          <Text style={styles.label}>I want to</Text>
          <View style={styles.userTypeButtons}>
            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "buyer" && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType("buyer")}
            >
              <Ionicons
                name="cart-outline"
                size={24}
                color={userType === "buyer" ? "#4285F4" : "#666"}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "buyer" && styles.userTypeTextActive,
                ]}
              >
                Buy Parts
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.userTypeButton,
                userType === "seller" && styles.userTypeButtonActive,
              ]}
              onPress={() => setUserType("seller")}
            >
              <Ionicons
                name="storefront-outline"
                size={24}
                color={userType === "seller" ? "#4285F4" : "#666"}
              />
              <Text
                style={[
                  styles.userTypeText,
                  userType === "seller" && styles.userTypeTextActive,
                ]}
              >
                Sell Parts
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Create Account Button */}
        <TouchableOpacity
          style={styles.signUpButton}
          onPress={handleSignUp}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.signUpButtonText}>Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Sign In Link */}
        <View style={styles.signInContainer}>
          <Text style={styles.signInText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/login")}>
            <Text style={styles.signInLink}>Sign In</Text>
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
  userTypeContainer: {
    marginBottom: 32,
  },
  userTypeButtons: {
    flexDirection: "row",
    gap: 12,
  },
  userTypeButton: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingVertical: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  userTypeButtonActive: {
    backgroundColor: "#E8F0FE",
    borderColor: "#4285F4",
  },
  userTypeText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  userTypeTextActive: {
    color: "#4285F4",
    fontWeight: "600",
  },
  signUpButton: {
    backgroundColor: "#4285F4",
    borderRadius: 8,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  signUpButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signInContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signInText: {
    fontSize: 14,
    color: "#666",
  },
  signInLink: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "600",
  },
});
