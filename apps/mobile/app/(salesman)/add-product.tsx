import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

const categories = [
  "Engine Parts",
  "Brake System",
  "Filters",
  "Electrical",
  "Suspension",
  "Cooling System",
  "Exhaust System",
  "Transmission",
  "Body Parts",
  "Lighting",
  "Interior",
  "Accessories",
];

export default function AddProductScreen() {
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("");
  const [sku, setSku] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleSubmit = () => {
    if (!productName || !price || !stock || !selectedCategory) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    // TODO: Implement API call to create product
    Alert.alert("Success", "Product added successfully!", [
      {
        text: "OK",
        onPress: () => router.back(),
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Product Image Section */}
      <View style={styles.imageSection}>
        <TouchableOpacity style={styles.imageUpload}>
          <Ionicons name="camera" size={40} color="#999" />
          <Text style={styles.imageUploadText}>Add Product Images</Text>
          <Text style={styles.imageUploadSubtext}>Tap to upload (max 5)</Text>
        </TouchableOpacity>
      </View>

      {/* Form Section */}
      <View style={styles.formSection}>
        {/* Product Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Product Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter product name"
            placeholderTextColor="#999"
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        {/* Description */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter product description"
            placeholderTextColor="#999"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Category */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          <TouchableOpacity
            style={styles.selectInput}
            onPress={() => setShowCategoryPicker(!showCategoryPicker)}
          >
            <Text
              style={[
                styles.selectInputText,
                !selectedCategory && styles.placeholderText,
              ]}
            >
              {selectedCategory || "Select category"}
            </Text>
            <Ionicons
              name={showCategoryPicker ? "chevron-up" : "chevron-down"}
              size={20}
              color="#999"
            />
          </TouchableOpacity>
          {showCategoryPicker && (
            <View style={styles.categoryPicker}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryOption,
                    selectedCategory === category && styles.categoryOptionSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(category);
                    setShowCategoryPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.categoryOptionText,
                      selectedCategory === category &&
                        styles.categoryOptionTextSelected,
                    ]}
                  >
                    {category}
                  </Text>
                  {selectedCategory === category && (
                    <Ionicons name="checkmark" size={18} color="#FF6B35" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Price Row */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>
              Price ($) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>Discount Price ($)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#999"
              value={discountPrice}
              onChangeText={setDiscountPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Stock and SKU Row */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>
              Stock Quantity <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#999"
              value={stock}
              onChangeText={setStock}
              keyboardType="number-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>SKU</Text>
            <TextInput
              style={styles.input}
              placeholder="SKU-001"
              placeholderTextColor="#999"
              value={sku}
              onChangeText={setSku}
            />
          </View>
        </View>

        {/* Vehicle Compatibility */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Compatibility</Text>
          <TouchableOpacity style={styles.addCompatibilityButton}>
            <Ionicons name="add-circle-outline" size={20} color="#FF6B35" />
            <Text style={styles.addCompatibilityText}>
              Add compatible vehicles
            </Text>
          </TouchableOpacity>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Product</Text>
        </TouchableOpacity>

        {/* Save as Draft */}
        <TouchableOpacity style={styles.draftButton}>
          <Text style={styles.draftButtonText}>Save as Draft</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  imageSection: {
    padding: 16,
  },
  imageUpload: {
    height: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    marginTop: 12,
  },
  imageUploadSubtext: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  formSection: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  required: {
    color: "#FF4444",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#1A1A2E",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 100,
    paddingTop: 14,
  },
  selectInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectInputText: {
    fontSize: 15,
    color: "#1A1A2E",
  },
  placeholderText: {
    color: "#999",
  },
  categoryPicker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    maxHeight: 200,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  categoryOptionSelected: {
    backgroundColor: "#FFF8F5",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#1A1A2E",
  },
  categoryOptionTextSelected: {
    color: "#FF6B35",
    fontWeight: "600",
  },
  rowInputs: {
    flexDirection: "row",
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  addCompatibilityButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF8F5",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#FFE0D3",
  },
  addCompatibilityText: {
    fontSize: 14,
    color: "#FF6B35",
    fontWeight: "500",
    marginLeft: 8,
  },
  submitButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  draftButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  draftButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
  },
});
