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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { createCar, createCarPart, getAllCars, Car } from "../../src/api/carParts";

const categories = [
  { id: "", name: "Select category" },
  { id: "brakes", name: "🛑 Brakes" },
  { id: "engine", name: "⚙️ Engine Parts" },
  { id: "filters", name: "🔧 Filters" },
  { id: "lighting", name: "💡 Lighting" },
  { id: "suspension", name: "🚗 Suspension" },
  { id: "electrical", name: "🔋 Electrical" },
  { id: "tires", name: "🛞 Tires & Wheels" },
  { id: "fluids", name: "🛢️ Fluids & Chemicals" },
  { id: "exhaust", name: "💨 Exhaust" },
  { id: "interior", name: "🪑 Interior" },
];

const conditions = [
  { value: "NEW", label: "New" },
  { value: "USED", label: "Used" },
  { value: "REFURBISHED", label: "Refurbished" },
];

export default function AddCarPartScreen() {
  // Car form state
  const [carMode, setCarMode] = useState<"existing" | "new">("existing");
  const [numberPlate, setNumberPlate] = useState("");
  const [carMake, setCarMake] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [engineType, setEngineType] = useState("");
  const [carColor, setCarColor] = useState("");
  const [existingCars, setExistingCars] = useState<Car[]>([]);
  const [selectedCar, setSelectedCar] = useState<Car | null>(null);
  const [showCarPicker, setShowCarPicker] = useState(false);
  const [isLoadingCars, setIsLoadingCars] = useState(true);

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

  // Load existing cars on mount
  useEffect(() => {
    loadExistingCars();
  }, []);

  const loadExistingCars = async () => {
    try {
      setIsLoadingCars(true);
      const response = await getAllCars({ limit: 100 });
      if (response.success) {
        setExistingCars(response.data.cars);
      }
    } catch (error) {
      console.error("Failed to load cars:", error);
    } finally {
      setIsLoadingCars(false);
    }
  };

  const handleSubmit = async () => {
    // Validate part fields
    if (!partName || !price || !stock || !selectedCategory) {
      Alert.alert("Error", "Please fill in all required part fields");
      return;
    }

    // Validate car fields based on mode
    if (carMode === "existing" && !selectedCar) {
      Alert.alert("Error", "Please select an existing car");
      return;
    }

    if (carMode === "new" && (!numberPlate || !carMake || !carModel || !carYear)) {
      Alert.alert("Error", "Please fill in all required car fields");
      return;
    }

    try {
      setIsSubmitting(true);
      let carId = selectedCar?.id;

      // Create new car if needed
      if (carMode === "new") {
        const carResponse = await createCar({
          numberPlate,
          make: carMake,
          model: carModel,
          year: parseInt(carYear),
          engineType: engineType || undefined,
          color: carColor || undefined,
        });

        if (carResponse.success) {
          carId = carResponse.data.id;
        } else {
          throw new Error(carResponse.message || "Failed to create car");
        }
      }

      // Create the car part
      const partResponse = await createCarPart({
        name: partName,
        description: partDescription || undefined,
        partNumber: partNumber || undefined,
        price: parseFloat(price),
        discountPrice: discountPrice ? parseFloat(discountPrice) : undefined,
        stock: parseInt(stock),
        condition: selectedCondition as "NEW" | "USED" | "REFURBISHED",
        carId: carId!,
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
          Add car parts that customers can find by searching their cars number plate
        </Text>
      </View>

      {/* Car Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 1: Select or Add Car</Text>

        {/* Mode Toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeButton, carMode === "existing" && styles.modeButtonActive]}
            onPress={() => setCarMode("existing")}
          >
            <Text style={[styles.modeButtonText, carMode === "existing" && styles.modeButtonTextActive]}>
              Existing Car
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeButton, carMode === "new" && styles.modeButtonActive]}
            onPress={() => setCarMode("new")}
          >
            <Text style={[styles.modeButtonText, carMode === "new" && styles.modeButtonTextActive]}>
              New Car
            </Text>
          </TouchableOpacity>
        </View>

        {carMode === "existing" ? (
          // Existing Car Picker
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Select Car <Text style={styles.required}>*</Text>
            </Text>
            {isLoadingCars ? (
              <ActivityIndicator size="small" color="#00002E" />
            ) : (
              <>
                <TouchableOpacity
                  style={styles.selectInput}
                  onPress={() => setShowCarPicker(!showCarPicker)}
                >
                  <Text style={[styles.selectInputText, !selectedCar && styles.placeholderText]}>
                    {selectedCar
                      ? `${selectedCar.numberPlate} - ${selectedCar.make} ${selectedCar.model}`
                      : "Select a car"}
                  </Text>
                  <Ionicons
                    name={showCarPicker ? "chevron-up" : "chevron-down"}
                    size={20}
                    color="#999"
                  />
                </TouchableOpacity>
                {showCarPicker && (
                  <View style={styles.picker}>
                    <ScrollView style={{ maxHeight: 200 }}>
                      {existingCars.map((car) => (
                        <TouchableOpacity
                          key={car.id}
                          style={[
                            styles.pickerOption,
                            selectedCar?.id === car.id && styles.pickerOptionSelected,
                          ]}
                          onPress={() => {
                            setSelectedCar(car);
                            setShowCarPicker(false);
                          }}
                        >
                          <View>
                            <Text style={styles.carPlateText}>{car.numberPlate}</Text>
                            <Text style={styles.carDetailsText}>
                              {car.make} {car.model} ({car.year})
                            </Text>
                          </View>
                          {selectedCar?.id === car.id && (
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
        ) : (
          // New Car Form
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Number Plate <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., CAB-1234"
                placeholderTextColor="#999"
                value={numberPlate}
                onChangeText={setNumberPlate}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>
                  Make <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Toyota"
                  placeholderTextColor="#999"
                  value={carMake}
                  onChangeText={setCarMake}
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>
                  Model <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Corolla"
                  placeholderTextColor="#999"
                  value={carModel}
                  onChangeText={setCarModel}
                />
              </View>
            </View>

            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>
                  Year <Text style={styles.required}>*</Text>
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 2020"
                  placeholderTextColor="#999"
                  value={carYear}
                  onChangeText={setCarYear}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.inputGroup, styles.halfInput]}>
                <Text style={styles.label}>Engine Type</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., 1.8L Petrol"
                  placeholderTextColor="#999"
                  value={engineType}
                  onChangeText={setEngineType}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., White"
                placeholderTextColor="#999"
                value={carColor}
                onChangeText={setCarColor}
              />
            </View>
          </>
        )}
      </View>

      {/* Part Details Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Step 2: Part Details</Text>

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
              {categories.filter((c) => c.id).map((category) => (
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
                  <Text style={styles.pickerOptionText}>{category.name}</Text>
                  {selectedCategory === category.id && (
                    <Ionicons name="checkmark" size={18} color="#00002E" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
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
    backgroundColor: "#FFFFFF",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E5E7EB",
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  infoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  section: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A2E",
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



