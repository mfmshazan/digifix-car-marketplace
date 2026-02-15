import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createCar, createCarPart } from "../../src/api/carParts";
import { getAllCategories, Category } from "../../src/api/categories";

const conditions = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];

export default function AddCarPartScreen() {
  // Car info (optional - for compatibility info)
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");

  // Categories from API
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  // Part form state
  const [partName, setPartName] = useState("");
  const [partDescription, setPartDescription] = useState("");
  const [partNumber, setPartNumber] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCondition, setSelectedCondition] = useState("NEW");
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load categories on mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setIsLoadingCategories(true);
      const response = await getAllCategories();
      if (response.success && response.data) {
        setCategories(response.data);
        // Auto-select first category if available
        if (response.data.length > 0) {
          setSelectedCategory(response.data[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert("Error", "Failed to load categories. Please try again.");
    } finally {
      setIsLoadingCategories(false);
    }
  };

  const handleSubmit = async () => {
    // Validate required part fields
    if (!partName || !price || !selectedCategory) {
      Alert.alert("Error", "Please fill in all required fields (Part Name, Price, Category)");
      return;
    }

    try {
      setIsSubmitting(true);

      // Generate car info for the part
      const make = carMake.trim() || "Universal";
      const model = carModel.trim() || "All Models";
      const year = carYear ? parseInt(carYear) : new Date().getFullYear();

      // Generate a unique number plate based on car details and timestamp
      const timestamp = Date.now();
      const generatedPlate = `${make.substring(0, 3).toUpperCase()}${model.substring(0, 2).toUpperCase()}-${year}-${timestamp}`;

      // Create car record first
      const carResponse = await createCar({
        numberPlate: generatedPlate,
        make: make,
        model: model,
        year: year,
      });

      if (!carResponse.success) {
        throw new Error(carResponse.message || "Failed to create car record");
      }

      const carId = carResponse.data.id;

      // Create the car part
      const partResponse = await createCarPart({
        name: partName,
        description: partDescription || undefined,
        partNumber: partNumber || undefined,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        stock: stock ? parseInt(stock) : 1,
        condition: selectedCondition as "NEW" | "USED" | "REFURBISHED",
        carId: carId,
        categoryId: selectedCategory,
      });

      if (partResponse.success) {
        Alert.alert("Success", "Car part added successfully!", [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]);
      } else {
        throw new Error(partResponse.message || "Failed to create part");
      }
    } catch (error: any) {
      console.error("Submit error:", error);
      Alert.alert("Error", error.message || "Failed to add car part. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header Info */}
      <View style={styles.infoCard}>
        <Ionicons name="information-circle" size={24} color="#00002E" />
        <Text style={styles.infoText}>
          Add car parts to your store. Enter part details and optionally specify compatible car info.
        </Text>
      </View>

      {/* Part Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Part Details</Text>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Part Name <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Front Brake Pad Set"
            placeholderTextColor="#999"
            value={partName}
            onChangeText={setPartName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe the part condition, compatibility, etc."
            placeholderTextColor="#999"
            value={partDescription}
            onChangeText={setPartDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Manufacturer part number"
            placeholderTextColor="#999"
            value={partNumber}
            onChangeText={setPartNumber}
          />
        </View>

        {/* Category Picker */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>
            Category <Text style={styles.required}>*</Text>
          </Text>
          {isLoadingCategories ? (
            <View style={styles.selectInput}>
              <ActivityIndicator size="small" color="#00002E" />
              <Text style={styles.placeholderText}>Loading categories...</Text>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowCategoryPicker(!showCategoryPicker)}
              >
                <Text style={[styles.selectInputText, !selectedCategory && styles.placeholderText]}>
                  {categories.find((c) => c.id === selectedCategory)?.name || "Select category"}
                </Text>
                <Ionicons
                  name={showCategoryPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#999"
                />
              </TouchableOpacity>
              {showCategoryPicker && (
                <View style={styles.picker}>
                  <ScrollView style={{ maxHeight: 200 }}>
                    {categories.map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.pickerOption,
                          selectedCategory === category.id && styles.pickerOptionSelected,
                        ]}
                        onPress={() => {
                          setSelectedCategory(category.id);
                          setShowCategoryPicker(false);
                        }}
                      >
                        <Text style={styles.pickerOptionText}>
                          {category.icon ? `${category.icon} ` : ''}{category.name}
                        </Text>
                        {selectedCategory === category.id && (
                          <Ionicons name="checkmark" size={18} color="#00002E" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </View>

        {/* Condition */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Condition</Text>
          <View style={styles.conditionRow}>
            {conditions.map((condition) => (
              <TouchableOpacity
                key={condition.value}
                style={[
                  styles.conditionButton,
                  selectedCondition === condition.value && styles.conditionButtonActive,
                ]}
                onPress={() => setSelectedCondition(condition.value)}
              >
                <Text
                  style={[
                    styles.conditionButtonText,
                    selectedCondition === condition.value && styles.conditionButtonTextActive,
                  ]}
                >
                  {condition.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Price Row */}
        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>
              Price (Rs.) <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#999"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>Discount Price (Rs.)</Text>
            <TextInput
              style={styles.input}
              placeholder="0"
              placeholderTextColor="#999"
              value={discountPrice}
              onChangeText={setDiscountPrice}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Stock */}
        <View style={styles.inputGroup}>
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

        {/* Image Upload Placeholder */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Part Images</Text>
          <TouchableOpacity style={styles.imageUpload}>
            <Ionicons name="camera" size={32} color="#999" />
            <Text style={styles.imageUploadText}>Add Images</Text>
            <Text style={styles.imageUploadSubtext}>Tap to upload (max 5)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Compatible Car Info Section (Optional) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compatible Car Info (Optional)</Text>
        <Text style={styles.sectionSubtitle}>
          Add car details to help customers find compatible parts
        </Text>

        <View style={styles.rowInputs}>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>Make</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Toyota"
              placeholderTextColor="#999"
              value={carMake}
              onChangeText={setCarMake}
            />
          </View>
          <View style={[styles.inputGroup, styles.halfInput]}>
            <Text style={styles.label}>Model</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Corolla"
              placeholderTextColor="#999"
              value={carModel}
              onChangeText={setCarModel}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 2020"
            placeholderTextColor="#999"
            value={carYear}
            onChangeText={setCarYear}
            keyboardType="numeric"
            maxLength={4}
          />
        </View>
      </View>

      {/* Submit Button */}
      <View style={styles.submitSection}>
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Add Car Part</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8EAF6",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CAE9",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A2E",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
  },
  modeButtonActive: {
    backgroundColor: "#00002E",
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  modeButtonTextActive: {
    color: "#FFFFFF",
  },
  inputGroup: {
    marginBottom: 16,
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
  picker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  pickerOptionSelected: {
    backgroundColor: "#E5E7EB",
  },
  pickerOptionText: {
    fontSize: 14,
    color: "#1A1A2E",
  },
  carPlateText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#00002E",
  },
  carDetailsText: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  rowInputs: {
    flexDirection: "row",
    marginHorizontal: -8,
  },
  halfInput: {
    flex: 1,
    marginHorizontal: 8,
  },
  conditionRow: {
    flexDirection: "row",
    gap: 8,
  },
  conditionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
  },
  conditionButtonActive: {
    backgroundColor: "#00002E",
  },
  conditionButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  conditionButtonTextActive: {
    color: "#FFFFFF",
  },
  imageUpload: {
    height: 120,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  imageUploadText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 8,
  },
  imageUploadSubtext: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
  },
  submitSection: {
    padding: 16,
    paddingBottom: 40,
  },
  submitButton: {
    backgroundColor: "#00002E",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#00002E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});



