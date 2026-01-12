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

interface PaymentMethod {
  id: string;
  type: "credit" | "debit" | "paypal";
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  isDefault: boolean;
}

export default function PaymentMethodsScreen() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "credit" as "credit" | "debit" | "paypal",
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });

  useEffect(() => {
    loadPaymentMethods();
  }, []);

  const loadPaymentMethods = async () => {
    try {
      const saved = await AsyncStorage.getItem('paymentMethods');
      if (saved) {
        setMethods(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
    }
  };

  const savePaymentMethods = async (newMethods: PaymentMethod[]) => {
    try {
      await AsyncStorage.setItem('paymentMethods', JSON.stringify(newMethods));
      setMethods(newMethods);
    } catch (error) {
      console.error("Error saving payment methods:", error);
    }
  };

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g);
    return chunks ? chunks.join(' ') : cleaned;
  };

  const formatExpiryDate = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleSave = () => {
    if (!formData.cardNumber || !formData.cardHolder || !formData.expiryDate) {
      showAlert("Validation Error", "Please fill in all required fields");
      return;
    }

    const newMethod: PaymentMethod = {
      id: Date.now().toString(),
      type: formData.type,
      cardNumber: formData.cardNumber.replace(/\s/g, ''),
      cardHolder: formData.cardHolder,
      expiryDate: formData.expiryDate,
      isDefault: methods.length === 0,
    };

    savePaymentMethods([...methods, newMethod]);
    resetForm();
    showAlert("Success", "Payment method added successfully!");
  };

  const handleDelete = (id: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this payment method?")) {
        savePaymentMethods(methods.filter(m => m.id !== id));
      }
    }
  };

  const handleSetDefault = (id: string) => {
    const updated = methods.map(m => ({
      ...m,
      isDefault: m.id === id,
    }));
    savePaymentMethods(updated);
  };

  const resetForm = () => {
    setFormData({ type: "credit", cardNumber: "", cardHolder: "", expiryDate: "", cvv: "" });
    setShowForm(false);
  };

  const maskCardNumber = (number: string) => {
    if (number.length < 4) return number;
    return '**** **** **** ' + number.slice(-4);
  };

  const getCardIcon = (type: string) => {
    switch (type) {
      case 'credit':
        return 'card-outline';
      case 'debit':
        return 'card-outline';
      case 'paypal':
        return 'logo-paypal';
      default:
        return 'card-outline';
    }
  };

  if (showForm) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={resetForm} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Payment Method</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.content}>
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Type *</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setFormData({ ...formData, type: "credit" })}
                >
                  <Ionicons
                    name={formData.type === "credit" ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color="#4285F4"
                  />
                  <Text style={styles.radioText}>Credit Card</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.radioButton}
                  onPress={() => setFormData({ ...formData, type: "debit" })}
                >
                  <Ionicons
                    name={formData.type === "debit" ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color="#4285F4"
                  />
                  <Text style={styles.radioText}>Debit Card</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number *</Text>
              <TextInput
                style={styles.input}
                value={formatCardNumber(formData.cardNumber)}
                onChangeText={(text) => {
                  const cleaned = text.replace(/\s/g, '');
                  if (cleaned.length <= 16) {
                    setFormData({ ...formData, cardNumber: cleaned });
                  }
                }}
                placeholder="1234 5678 9012 3456"
                keyboardType="numeric"
                placeholderTextColor="#999"
                maxLength={19}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Holder Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.cardHolder}
                onChangeText={(text) => setFormData({ ...formData, cardHolder: text.toUpperCase() })}
                placeholder="JOHN DOE"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                <Text style={styles.label}>Expiry Date *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.expiryDate}
                  onChangeText={(text) => {
                    const formatted = formatExpiryDate(text);
                    setFormData({ ...formData, expiryDate: formatted });
                  }}
                  placeholder="MM/YY"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                <Text style={styles.label}>CVV *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.cvv}
                  onChangeText={(text) => {
                    if (text.length <= 3) {
                      setFormData({ ...formData, cvv: text });
                    }
                  }}
                  placeholder="123"
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#4CAF50" />
              <Text style={styles.securityText}>
                Your payment information is encrypted and secure
              </Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Add Payment Method</Text>
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
        <Text style={styles.headerTitle}>Payment Methods</Text>
        <TouchableOpacity onPress={() => setShowForm(true)}>
          <Ionicons name="add-circle-outline" size={24} color="#4285F4" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {methods.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="card-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No payment methods yet</Text>
            <Text style={styles.emptyText}>Add a payment method for faster checkout</Text>
            <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
              <Text style={styles.addButtonText}>Add Payment Method</Text>
            </TouchableOpacity>
          </View>
        ) : (
          methods.map((method) => (
            <View key={method.id} style={styles.paymentCard}>
              {method.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Default</Text>
                </View>
              )}
              <View style={styles.cardHeader}>
                <Ionicons name={getCardIcon(method.type) as any} size={32} color="#4285F4" />
                <View style={styles.cardInfo}>
                  <Text style={styles.cardType}>
                    {method.type.charAt(0).toUpperCase() + method.type.slice(1)} Card
                  </Text>
                  <Text style={styles.cardNumber}>{maskCardNumber(method.cardNumber)}</Text>
                  <Text style={styles.cardHolder}>{method.cardHolder}</Text>
                  <Text style={styles.cardExpiry}>Expires {method.expiryDate}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                {!method.isDefault && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleSetDefault(method.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={18} color="#4CAF50" />
                    <Text style={[styles.actionText, { color: "#4CAF50" }]}>Set Default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleDelete(method.id)}
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
  paymentCard: {
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
  cardHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cardType: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  cardNumber: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardHolder: {
    fontSize: 13,
    color: "#666",
    marginBottom: 2,
  },
  cardExpiry: {
    fontSize: 12,
    color: "#999",
  },
  cardActions: {
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
  radioGroup: {
    flexDirection: "row",
    gap: 20,
  },
  radioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  radioText: {
    fontSize: 15,
    color: "#000",
  },
  row: {
    flexDirection: "row",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    gap: 8,
  },
  securityText: {
    flex: 1,
    fontSize: 13,
    color: "#2E7D32",
  },
  saveButton: {
    backgroundColor: "#4285F4",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
