import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    alert(`${title}\n\n${message}`);
  }
};

interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export default function AddressesScreen() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
  });

  useEffect(() => {
    loadAddresses();
  }, []);

  const loadAddresses = async () => {
    try {
      const saved = await AsyncStorage.getItem('userAddresses');
      if (saved) {
        setAddresses(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading addresses:", error);
    }
  };

  const saveAddresses = async (newAddresses: Address[]) => {
    try {
      await AsyncStorage.setItem('userAddresses', JSON.stringify(newAddresses));
      setAddresses(newAddresses);
    } catch (error) {
      console.error("Error saving addresses:", error);
    }
  };

  const handleSave = () => {
    if (!formData.name || !formData.phone || !formData.street || !formData.city) {
      showAlert("Validation Error", "Please fill in all required fields");
      return;
    }

    if (editingId) {
      const updated = addresses.map(addr =>
        addr.id === editingId ? { ...formData, id: editingId, isDefault: addr.isDefault } : addr
      );
      saveAddresses(updated);
    } else {
      const newAddress: Address = {
        ...formData,
        id: Date.now().toString(),
        isDefault: addresses.length === 0,
      };
      saveAddresses([...addresses, newAddress]);
    }

    resetForm();
    showAlert("Success", "Address saved successfully!");
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this address?")) {
        saveAddresses(addresses.filter(addr => addr.id !== id));
      }
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = addresses.map(addr => ({
      ...addr,
      isDefault: addr.id === id,
    }));
    saveAddresses(updated);
  };

  const handleEdit = (address: Address) => {
    setFormData({
      name: address.name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      zipCode: address.zipCode,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: "", phone: "", street: "", city: "", state: "", zipCode: "" });
    setEditingId(null);
    setShowForm(false);
  };

  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetForm} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{editingId ? "Edit" : "Add"} Address</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter recipient name"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number *</Text>
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Street Address *</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.street}
                onChangeText={(text) => setFormData({ ...formData, street: text })}
                placeholder="Enter street address"
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                value={formData.city}
                onChangeText={(text) => setFormData({ ...formData, city: text })}
                placeholder="Enter city"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>State</Text>
                <TextInput
                  style={styles.input}
                  value={formData.state}
                  onChangeText={(text) => setFormData({ ...formData, state: text })}
                  placeholder="State"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>ZIP Code</Text>
                <TextInput
                  style={styles.input}
                  value={formData.zipCode}
                  onChangeText={(text) => setFormData({ ...formData, zipCode: text })}
                  placeholder="ZIP"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Address</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Addresses</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {addresses.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No addresses yet</Text>
            <Text style={styles.emptyText}>Add a delivery address to get started</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addButtonText}>Add Address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((address) => (
            <View key={address.id} style={styles.addressCard}>
              {address.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
              <Text style={styles.addressName}>{address.name}</Text>
              <Text style={styles.addressPhone}>{address.phone}</Text>
              <Text style={styles.addressText}>
                {address.street}, {address.city}
                {address.state && `, ${address.state}`}
                {address.zipCode && ` ${address.zipCode}`}
              </Text>
              <View style={styles.addressActions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleEdit(address)}
                >
                  <Ionicons name="create-outline" size={18} color="#4285F4" />
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                {!address.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(address.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                    <Text style={[styles.actionText, { color: "#4CAF50" }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(address.id)}
                >
                  <Ionicons name="trash-outline" size={18} color="#F44336" />
                  <Text style={[styles.actionText, { color: "#F44336" }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
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
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
    textAlign: "center",
  },
  addButton: {
    backgroundColor: "#4285F4",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  addressCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  defaultBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
  },
  addressName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
  },
  addressPhone: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  addressText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
    marginBottom: 12,
  },
  addressActions: {
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: "#4285F4",
    fontWeight: "500",
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
  },
  row: {
    flexDirection: "row",
  },
  saveButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
