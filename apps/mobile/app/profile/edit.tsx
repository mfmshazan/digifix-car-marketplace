import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { auth } from "../../config/firebase";
import { updateProfile } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

export default function EditProfileScreen() {
  const user = auth.currentUser;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
    phone: "",
    company: "",
  });

  useEffect(() => {
    loadProfileData();
  }, []);

  // Reload profile data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadProfileData();
    }, [])
  );

  const loadProfileData = async () => {
    try {
      const savedPhone = await AsyncStorage.getItem('userPhone');
      const savedCompany = await AsyncStorage.getItem('userCompany');
      if (savedPhone) setFormData(prev => ({ ...prev, phone: savedPhone }));
      if (savedCompany) setFormData(prev => ({ ...prev, company: savedCompany }));
    } catch (error) {
      console.error("Error loading profile data:", error);
    }
  };

  const handleSave = async () => {
    if (!formData.displayName.trim()) {
      showAlert("Validation Error", "Name is required");
      return;
    }

    setLoading(true);
    try {
      // Update Firebase display name
      if (user) {
        await updateProfile(user, {
          displayName: formData.displayName,
        });
      }

      // Save additional data to AsyncStorage
      await AsyncStorage.setItem('userPhone', formData.phone);
      await AsyncStorage.setItem('userCompany', formData.company);

      showAlert("Success", "Profile updated successfully!");
      router.back();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      showAlert("Error", error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Picture */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarLarge}>
            <Ionicons name="person" size={60} color="#4285F4" />
          </View>
          <TouchableOpacity
            style={styles.changePhotoButton}
            onPress={() => showAlert("Coming Soon", "Photo upload feature coming soon!")}
          >
            <Text style={styles.changePhotoText}>Change Photo</Text>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={formData.displayName}
              onChangeText={(text) => setFormData({ ...formData, displayName: text })}
              placeholder="Enter your full name"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={formData.email}
              editable={false}
              placeholderTextColor="#999"
            />
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={formData.phone}
              onChangeText={(text) => setFormData({ ...formData, phone: text })}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Company</Text>
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
              placeholder="Enter your company name"
              placeholderTextColor="#999"
            />
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => showAlert("Delete Account", "This feature is coming soon. Please contact support to delete your account.")}
        >
          <Ionicons name="trash-outline" size={20} color="#F44336" />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  avatarLarge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  changePhotoButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  changePhotoText: {
    color: "#4285F4",
    fontSize: 15,
    fontWeight: "600",
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#000",
    backgroundColor: "#fff",
  },
  inputDisabled: {
    backgroundColor: "#F5F5F5",
    color: "#999",
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  saveButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deleteButton: {
    flexDirection: "row",
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  deleteButtonText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "600",
  },
});
