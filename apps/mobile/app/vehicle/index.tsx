import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

interface Vehicle {
  make: string;
  model: string;
  year: string;
}

const popularMakes = [
  "Toyota", "Honda", "Ford", "Chevrolet", "Nissan",
  "BMW", "Mercedes-Benz", "Audi", "Volkswagen", "Hyundai",
  "Kia", "Mazda", "Subaru", "Lexus", "Jeep"
];

const years = Array.from({ length: 30 }, (_, i) => (new Date().getFullYear() - i).toString());

export default function VehicleSelectionScreen() {
  const [step, setStep] = useState<"make" | "year" | "model">("make");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMake, setSelectedMake] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedModel, setSelectedModel] = useState("");

  // Mock models based on make
  const getModelsForMake = (make: string): string[] => {
    const models: { [key: string]: string[] } = {
      Toyota: ["Camry", "Corolla", "RAV4", "Highlander", "Tacoma", "Tundra", "4Runner"],
      Honda: ["Civic", "Accord", "CR-V", "Pilot", "Odyssey", "Ridgeline"],
      Ford: ["F-150", "Mustang", "Explorer", "Escape", "Edge", "Bronco"],
      Chevrolet: ["Silverado", "Equinox", "Malibu", "Traverse", "Tahoe"],
      BMW: ["3 Series", "5 Series", "X3", "X5", "X7", "M3", "M5"],
    };
    return models[make] || ["Model A", "Model B", "Model C", "Model D"];
  };

  const handleMakeSelect = (make: string) => {
    setSelectedMake(make);
    setStep("year");
  };

  const handleYearSelect = (year: string) => {
    setSelectedYear(year);
    setStep("model");
  };

  const handleModelSelect = async (model: string) => {
    setSelectedModel(model);
    
    const vehicle: Vehicle = {
      make: selectedMake,
      model: model,
      year: selectedYear,
    };

    try {
      await AsyncStorage.setItem('selectedVehicle', JSON.stringify(vehicle));
      showAlert(
        "Vehicle Selected",
        `${vehicle.year} ${vehicle.make} ${vehicle.model} has been selected as your vehicle.`
      );
      router.back();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      showAlert("Error", "Failed to save vehicle selection");
    }
  };

  const filteredMakes = popularMakes.filter(make =>
    make.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredYears = years.filter(year =>
    year.includes(searchQuery)
  );

  const models = getModelsForMake(selectedMake);
  const filteredModels = models.filter(model =>
    model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => {
          if (step === "make") {
            router.back();
          } else if (step === "year") {
            setStep("make");
            setSearchQuery("");
          } else {
            setStep("year");
            setSearchQuery("");
          }
        }}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {step === "make" && "Select Make"}
          {step === "year" && "Select Year"}
          {step === "model" && "Select Model"}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressStep, styles.progressStepActive]}>
            <Text style={styles.progressStepText}>Make</Text>
          </View>
          <View style={[styles.progressLine, step !== "make" && styles.progressLineActive]} />
          <View style={[styles.progressStep, step !== "make" && styles.progressStepActive]}>
            <Text style={styles.progressStepText}>Year</Text>
          </View>
          <View style={[styles.progressLine, step === "model" && styles.progressLineActive]} />
          <View style={[styles.progressStep, step === "model" && styles.progressStepActive]}>
            <Text style={styles.progressStepText}>Model</Text>
          </View>
        </View>
      </View>

      {/* Selection Info */}
      {selectedMake && (
        <View style={styles.selectionInfo}>
          <Text style={styles.selectionText}>
            {selectedMake}
            {selectedYear && ` • ${selectedYear}`}
          </Text>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder={`Search ${step}...`}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Options List */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === "make" && filteredMakes.map((make) => (
          <TouchableOpacity
            key={make}
            style={styles.optionCard}
            onPress={() => handleMakeSelect(make)}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="car-outline" size={24} color="#4285F4" />
            </View>
            <Text style={styles.optionText}>{make}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}

        {step === "year" && filteredYears.map((year) => (
          <TouchableOpacity
            key={year}
            style={styles.optionCard}
            onPress={() => handleYearSelect(year)}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="calendar-outline" size={24} color="#4285F4" />
            </View>
            <Text style={styles.optionText}>{year}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}

        {step === "model" && filteredModels.map((model) => (
          <TouchableOpacity
            key={model}
            style={styles.optionCard}
            onPress={() => handleModelSelect(model)}
          >
            <View style={styles.optionIcon}>
              <Ionicons name="car-sport-outline" size={24} color="#4285F4" />
            </View>
            <Text style={styles.optionText}>{model}</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>
        ))}

        {((step === "make" && filteredMakes.length === 0) ||
          (step === "year" && filteredYears.length === 0) ||
          (step === "model" && filteredModels.length === 0)) && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No results found</Text>
            <Text style={styles.emptyText}>Try a different search term</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  progressContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  progressBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressStep: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: "#4285F4",
  },
  progressStepText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 8,
  },
  progressLineActive: {
    backgroundColor: "#4285F4",
  },
  selectionInfo: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#4285F4",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    marginHorizontal: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: "#000",
  },
  content: {
    flex: 1,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F0FE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#666",
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 8,
  },
});
