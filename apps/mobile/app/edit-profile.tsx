import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { getToken, getUser, saveUser, saveUserPrefs, mergeServerUserAndPrefs } from "../src/api/storage";
import { getUserProfile, updateUserProfile } from "../src/api/auth";

export default function EditProfileScreen() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load current user data on mount
  useEffect(() => {
    const loadProfile = async () => {
      try {
        // First try to get from local storage for instant display
        const localUser = await getUser();
        if (localUser) {
          setName(localUser.name || "");
          setPhone(localUser.phone || "");
          setEmail(localUser.email || "");
        }

        // Then fetch fresh data from backend
        const token = await getToken();
        if (token) {
          const result = await getUserProfile(token);
          if (result.success && result.data) {
            setName(result.data.name || "");
            setPhone(result.data.phone || "");
            setEmail(result.data.email || "");
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert("Validation Error", "Name cannot be empty.");
      return;
    }

    setIsSaving(true);
    try {
      const token = await getToken();
      if (!token) {
        Alert.alert("Error", "You are not logged in. Please log in again.");
        router.replace("/(auth)/login");
        return;
      }

      // Step 1: Save typed values to local cache immediately.
      // This ensures the profile screen always shows the new name/phone
      // even if the backend is unavailable.
      const localUser = await getUser();

      // Phone validation & formatting
      let formattedPhone = phone.trim();
      if (formattedPhone) {
        if (formattedPhone.startsWith('0')) {
          formattedPhone = '+94' + formattedPhone.substring(1);
        } else if (!formattedPhone.startsWith('+94')) {
          formattedPhone = '+94' + formattedPhone;
        }

        const sriLankaRegex = /^\+94\d{9}$/;
        if (!sriLankaRegex.test(formattedPhone)) {
          Alert.alert("Validation Error", "Please enter a valid Sri Lankan phone number (9 digits after +94)");
          setIsSaving(false);
          return;
        }
      }

      const updatedLocally = {
        ...localUser,
        name: name.trim(),
        phone: formattedPhone || localUser?.phone || "",
      };
      await saveUser(updatedLocally);

      // Save to logout-safe prefs (keyed by email) so the change
      // survives clearAuthData() on logout and is restored on next login.
      const userEmail = localUser?.email || email;
      if (userEmail) {
        await saveUserPrefs(userEmail, {
          name: name.trim(),
          phone: formattedPhone || localUser?.phone || "",
        });
      }

      // Step 3: Try to sync with backend. If it succeeds, refresh cache
      // with the server's response. If it fails, local cache is already correct.
      try {
        const result = await updateUserProfile(token, {
          name: name.trim(),
          phone: formattedPhone || undefined,
        });

        if (result.success && result.data) {
          const backendUser = result.data.user || result.data;
          await saveUser(mergeServerUserAndPrefs(backendUser, updatedLocally));
        }
      } catch (backendError) {
        // Backend unavailable — local cache is already updated, so profile
        // will show the correct name when we go back.
        console.log("Backend sync failed; local profile cache already updated.");
      }

      Alert.alert("Success", "Profile updated successfully!", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        error.message || "Could not save changes. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Form */}
        <View style={styles.formCard}>
          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="#999" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#BDBDBD"
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Email (read-only) */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.inputRow, styles.readonlyRow]}>
              <Ionicons name="mail-outline" size={20} color="#BDBDBD" style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.readonlyInput]}
                value={email}
                editable={false}
                placeholder="Email"
                placeholderTextColor="#BDBDBD"
              />
              <Ionicons name="lock-closed-outline" size={16} color="#BDBDBD" />
            </View>
            <Text style={styles.helperText}>Email cannot be changed here.</Text>
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputRow}>
              <Ionicons name="call-outline" size={20} color="#999" style={styles.inputIcon} />
              <Text style={styles.countryCode}>+94</Text>
              <TextInput
                style={styles.input}
                value={phone.startsWith('+94') ? phone.slice(3) : (phone.startsWith('0') ? phone.slice(1) : phone)}
                onChangeText={(val) => {
                  const cleaned = val.replace(/\D/g, "");
                  if (cleaned.length <= 9) setPhone(cleaned);
                }}
                placeholder="771234567"
                placeholderTextColor="#BDBDBD"
                keyboardType="phone-pad"
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    gap: 12,
  },
  loadingText: {
    color: "#666",
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#00002E",
    paddingTop: Platform.OS === "ios" ? 56 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#555",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F6FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8F0",
    paddingHorizontal: 14,
    height: 52,
  },
  readonlyRow: {
    backgroundColor: "#F0F0F5",
    borderColor: "#E0E0EB",
  },
  inputIcon: {
    marginRight: 10,
  },
  countryCode: {
    fontSize: 15,
    color: "#666",
    fontWeight: "600",
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: "#E8E8F0",
    paddingRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1A1A2E",
  },
  readonlyInput: {
    color: "#BDBDBD",
  },
  helperText: {
    fontSize: 11,
    color: "#BDBDBD",
    marginTop: 5,
    marginLeft: 4,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00002E",
    marginHorizontal: 16,
    marginTop: 24,
    borderRadius: 14,
    height: 54,
    gap: 8,
    shadowColor: "#00002E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  cancelButton: {
    alignItems: "center",
    marginTop: 14,
    marginHorizontal: 16,
    paddingVertical: 14,
  },
  cancelButtonText: {
    color: "#999",
    fontSize: 15,
    fontWeight: "500",
  },
});
