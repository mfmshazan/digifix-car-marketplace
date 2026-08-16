import React from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import * as Location from "expo-location";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import {
  AddressInput,
  createAddress,
  CustomerAddress,
  deleteAddress,
  getAddresses,
  setDefaultAddress,
  updateAddress,
} from "../../src/api/addresses";

const EMPTY_FORM: AddressInput = {
  label: "Home",
  street: "",
  city: "",
  state: "",
  postalCode: "",
  country: "Sri Lanka",
  latitude: null,
  longitude: null,
  isDefault: false,
};

const LABEL_OPTIONS = ["Home", "Work", "Other"];

const formatAddress = (address: CustomerAddress) =>
  [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");

export default function SavedAddressesScreen() {
  const [addresses, setAddresses] = React.useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [busyAddressId, setBusyAddressId] = React.useState<string | null>(null);
  const [formVisible, setFormVisible] = React.useState(false);
  const [editingAddress, setEditingAddress] =
    React.useState<CustomerAddress | null>(null);
  const [form, setForm] = React.useState<AddressInput>(EMPTY_FORM);
  const [mapVisible, setMapVisible] = React.useState(false);
  const [tempPin, setTempPin] = React.useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [isLocating, setIsLocating] = React.useState(false);
  const [isGeocoding, setIsGeocoding] = React.useState(false);

  const loadAddresses = React.useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    try {
      const data = await getAddresses();
      setAddresses(data);
    } catch (error: any) {
      Alert.alert(
        "Could Not Load Addresses",
        error?.message || "Please check your connection and try again.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  const openAddForm = () => {
    setEditingAddress(null);
    setTempPin(null);
    setForm({
      ...EMPTY_FORM,
      isDefault: addresses.length === 0,
    });
    setFormVisible(true);
  };

  const openEditForm = (address: CustomerAddress) => {
    setEditingAddress(address);
    setForm({
      label: address.label || "Home",
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country || "Sri Lanka",
      latitude: address.latitude,
      longitude: address.longitude,
      isDefault: address.isDefault,
    });
    if (address.latitude !== null && address.longitude !== null) {
      setTempPin({ latitude: address.latitude, longitude: address.longitude });
    } else {
      setTempPin(null);
    }
    setFormVisible(true);
  };

  const closeForm = () => {
    if (isSaving) return;
    setFormVisible(false);
    setEditingAddress(null);
    setForm(EMPTY_FORM);
    setTempPin(null);
  };

  const setField = <K extends keyof AddressInput>(
    field: K,
    value: AddressInput[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const validateForm = () => {
    if (
      form.latitude === null ||
      form.longitude === null ||
      !Number.isFinite(form.latitude) ||
      !Number.isFinite(form.longitude)
    ) {
      Alert.alert(
        "Pin Delivery Location",
        "Use your current location or choose the exact delivery point on the map.",
      );
      return false;
    }

    const requiredFields: [keyof AddressInput, string][] = [
      ["street", "street address"],
      ["city", "city"],
      ["state", "province/state"],
      ["postalCode", "postal code"],
    ];

    const missing = requiredFields
      .filter(([field]) => !String(form[field]).trim())
      .map(([, label]) => label);

    if (missing.length > 0) {
      Alert.alert("Address Required", `Please enter ${missing.join(", ")}.`);
      return false;
    }
    return true;
  };

  const applyPinnedLocation = async (latitude: number, longitude: number) => {
    setForm((current) => ({ ...current, latitude, longitude }));
    setIsGeocoding(true);
    try {
      const currentPermission = await Location.getForegroundPermissionsAsync();
      const permission = currentPermission.status === "granted"
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") return;

      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (!place) return;

      const streetParts = [place.streetNumber, place.street || place.name]
        .filter(Boolean)
        .filter((value, index, values) => values.indexOf(value) === index);
      setForm((current) => ({
        ...current,
        latitude,
        longitude,
        street: streetParts.join(" ") || current.street,
        city: place.city || place.subregion || place.district || current.city,
        state: place.region || current.state,
        postalCode: place.postalCode || current.postalCode,
        country: place.country || current.country || "Sri Lanka",
      }));
    } catch {
      Alert.alert(
        "Location Pinned",
        "The coordinates were saved, but the address text could not be filled automatically. Please enter it below.",
      );
    } finally {
      setIsGeocoding(false);
    }
  };

  const useCurrentLocation = async () => {
    setIsLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Allow location access, or choose the delivery point on the map.",
        );
        return;
      }
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const pin = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      setTempPin(pin);
      await applyPinnedLocation(pin.latitude, pin.longitude);
    } catch {
      Alert.alert("Location Error", "Could not read your current location. Please choose it on the map.");
    } finally {
      setIsLocating(false);
    }
  };

  const openMapPicker = () => {
    if (form.latitude !== null && form.longitude !== null) {
      setTempPin({ latitude: form.latitude, longitude: form.longitude });
    }
    setMapVisible(true);
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      const payload: AddressInput = {
        label: form.label.trim() || "Home",
        street: form.street.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.postalCode.trim(),
        country: form.country.trim() || "Sri Lanka",
        latitude: form.latitude,
        longitude: form.longitude,
        isDefault: form.isDefault || addresses.length === 0,
      };

      if (editingAddress) {
        await updateAddress(editingAddress.id, payload);
      } else {
        await createAddress(payload);
      }

      setFormVisible(false);
      setEditingAddress(null);
      setForm(EMPTY_FORM);
      await loadAddresses(false);
    } catch (error: any) {
      Alert.alert(
        "Could Not Save Address",
        error?.message || "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetDefault = async (address: CustomerAddress) => {
    if (address.isDefault || busyAddressId) return;

    setBusyAddressId(address.id);
    try {
      await setDefaultAddress(address.id);
      await loadAddresses(false);
    } catch (error: any) {
      Alert.alert(
        "Could Not Update Address",
        error?.message || "Please try again.",
      );
    } finally {
      setBusyAddressId(null);
    }
  };

  const handleDelete = (address: CustomerAddress) => {
    Alert.alert(
      "Delete Address",
      `Remove your ${address.label || "saved"} address?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusyAddressId(address.id);
            try {
              await deleteAddress(address.id);
              await loadAddresses(false);
            } catch (error: any) {
              Alert.alert(
                "Could Not Delete Address",
                error?.message || "Please try again.",
              );
            } finally {
              setBusyAddressId(null);
            }
          },
        },
      ],
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#00002E" />
        <Text style={styles.loadingText}>Loading saved addresses...</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor="#00002E"
            onRefresh={() => {
              setIsRefreshing(true);
              loadAddresses(false);
            }}
          />
        }
      >
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="location" size={25} color="#FFFFFF" />
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Delivery addresses</Text>
            <Text style={styles.heroText}>
              Your default address will be used when you place an order.
            </Text>
          </View>
        </View>

        {addresses.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="map-outline" size={38} color="#00002E" />
            </View>
            <Text style={styles.emptyTitle}>No saved address yet</Text>
            <Text style={styles.emptyText}>
              Add a complete delivery address before checking out.
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={openAddForm}>
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Add delivery address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Saved addresses ({addresses.length})
              </Text>
              <Text style={styles.sectionHint}>Tap a card to make it default</Text>
            </View>

            {addresses.map((address) => {
              const isBusy = busyAddressId === address.id;
              return (
                <Pressable
                  key={address.id}
                  style={[
                    styles.addressCard,
                    address.isDefault && styles.defaultAddressCard,
                  ]}
                  onPress={() => handleSetDefault(address)}
                  disabled={isBusy}
                >
                  <View style={styles.addressTopRow}>
                    <View
                      style={[
                        styles.addressIcon,
                        address.isDefault && styles.defaultAddressIcon,
                      ]}
                    >
                      <Ionicons
                        name={
                          address.label?.toLowerCase() === "work"
                            ? "business"
                            : "home"
                        }
                        size={20}
                        color={address.isDefault ? "#FFFFFF" : "#00002E"}
                      />
                    </View>
                    <View style={styles.addressHeading}>
                      <View style={styles.labelRow}>
                        <Text style={styles.addressLabel}>
                          {address.label || "Address"}
                        </Text>
                        {address.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Ionicons
                              name="checkmark-circle"
                              size={13}
                              color="#0F766E"
                            />
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                        <View
                          style={address.latitude !== null && address.longitude !== null
                            ? styles.locationBadge
                            : styles.locationMissingBadge}
                        >
                          <Ionicons
                            name={address.latitude !== null && address.longitude !== null
                              ? "location"
                              : "alert-circle-outline"}
                            size={12}
                            color={address.latitude !== null && address.longitude !== null
                              ? "#166534"
                              : "#B45309"}
                          />
                          <Text
                            style={address.latitude !== null && address.longitude !== null
                              ? styles.locationBadgeText
                              : styles.locationMissingBadgeText}
                          >
                            {address.latitude !== null && address.longitude !== null
                              ? "Pinned"
                              : "Pin required"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.addressText}>
                        {formatAddress(address)}
                      </Text>
                    </View>
                    {isBusy && (
                      <ActivityIndicator size="small" color="#00002E" />
                    )}
                  </View>

                  <View style={styles.cardActions}>
                    {!address.isDefault && (
                      <TouchableOpacity
                        style={styles.defaultAction}
                        onPress={() => handleSetDefault(address)}
                        disabled={isBusy}
                      >
                        <Ionicons
                          name="checkmark-circle-outline"
                          size={17}
                          color="#00002E"
                        />
                        <Text style={styles.defaultActionText}>Set default</Text>
                      </TouchableOpacity>
                    )}
                    <View style={styles.actionSpacer} />
                    <TouchableOpacity
                      style={styles.iconAction}
                      onPress={() => openEditForm(address)}
                      disabled={isBusy}
                    >
                      <Ionicons name="create-outline" size={19} color="#374151" />
                      <Text style={styles.editText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteAction}
                      onPress={() => handleDelete(address)}
                      disabled={isBusy}
                    >
                      <Ionicons name="trash-outline" size={19} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      {addresses.length > 0 && (
        <TouchableOpacity
          style={styles.floatingButton}
          onPress={openAddForm}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={25} color="#FFFFFF" />
          <Text style={styles.floatingButtonText}>Add address</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={formVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.modalScreen}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={closeForm}
              disabled={isSaving}
            >
              <Ionicons name="close" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingAddress ? "Edit address" : "Add address"}
            </Text>
            <View style={styles.headerPlaceholder} />
          </View>

          <ScrollView
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.inputLabel}>Address label</Text>
            <View style={styles.labelOptions}>
              {LABEL_OPTIONS.map((label) => (
                <TouchableOpacity
                  key={label}
                  style={[
                    styles.labelOption,
                    form.label === label && styles.selectedLabelOption,
                  ]}
                  onPress={() => setField("label", label)}
                >
                  <Ionicons
                    name={
                      label === "Home"
                        ? "home-outline"
                        : label === "Work"
                          ? "business-outline"
                          : "location-outline"
                    }
                    size={18}
                    color={form.label === label ? "#FFFFFF" : "#4B5563"}
                  />
                  <Text
                    style={[
                      styles.labelOptionText,
                      form.label === label && styles.selectedLabelOptionText,
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Exact delivery location</Text>
            <View style={styles.locationPanel}>
              <View style={styles.locationStatusRow}>
                <View style={styles.locationStatusIcon}>
                  <Ionicons
                    name={form.latitude !== null ? "location" : "location-outline"}
                    size={22}
                    color="#00002E"
                  />
                </View>
                <View style={styles.locationStatusCopy}>
                  <Text style={styles.locationStatusTitle}>
                    {form.latitude !== null ? "Delivery pin set" : "Pin your delivery point"}
                  </Text>
                  <Text style={styles.locationStatusText}>
                    {form.latitude !== null && form.longitude !== null
                      ? `${form.latitude.toFixed(6)}, ${form.longitude.toFixed(6)}`
                      : "This location will be sent directly to the shop and rider."}
                  </Text>
                </View>
                {(isLocating || isGeocoding) && (
                  <ActivityIndicator size="small" color="#00002E" />
                )}
              </View>
              <View style={styles.locationActions}>
                <TouchableOpacity
                  style={styles.locationAction}
                  onPress={useCurrentLocation}
                  disabled={isLocating || isGeocoding}
                >
                  <Ionicons name="navigate" size={18} color="#00002E" />
                  <Text style={styles.locationActionText}>Use current</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.locationAction, styles.primaryLocationAction]}
                  onPress={openMapPicker}
                  disabled={isLocating || isGeocoding}
                >
                  <Ionicons name="map" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryLocationActionText}>Choose on map</Text>
                </TouchableOpacity>
              </View>
            </View>

            <AddressField
              label="Street address"
              value={form.street}
              onChangeText={(value) => setField("street", value)}
              placeholder="House number, street, area"
              icon="navigate-outline"
              autoCapitalize="words"
            />
            <AddressField
              label="City"
              value={form.city}
              onChangeText={(value) => setField("city", value)}
              placeholder="e.g. Colombo"
              icon="business-outline"
              autoCapitalize="words"
            />
            <View style={styles.twoColumnRow}>
              <View style={styles.column}>
                <AddressField
                  label="Province / State"
                  value={form.state}
                  onChangeText={(value) => setField("state", value)}
                  placeholder="Western"
                  icon="map-outline"
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.column}>
                <AddressField
                  label="Postal code"
                  value={form.postalCode}
                  onChangeText={(value) => setField("postalCode", value)}
                  placeholder="00100"
                  icon="mail-outline"
                  keyboardType="number-pad"
                />
              </View>
            </View>
            <AddressField
              label="Country"
              value={form.country}
              onChangeText={(value) => setField("country", value)}
              placeholder="Sri Lanka"
              icon="globe-outline"
              autoCapitalize="words"
            />

            <View style={styles.defaultSwitchRow}>
              <View style={styles.switchIcon}>
                <Ionicons name="star-outline" size={20} color="#00002E" />
              </View>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Use as default address</Text>
                <Text style={styles.switchText}>
                  {editingAddress?.isDefault
                    ? "Select another saved address to change the default."
                    : "Checkout will automatically use this address."}
                </Text>
              </View>
              <Switch
                value={form.isDefault || addresses.length === 0}
                onValueChange={(value) => setField("isDefault", value)}
                disabled={addresses.length === 0 || editingAddress?.isDefault}
                trackColor={{ false: "#D1D5DB", true: "#9CA3C7" }}
                thumbColor={
                  form.isDefault || addresses.length === 0
                    ? "#00002E"
                    : "#F9FAFB"
                }
              />
            </View>
          </ScrollView>

          <View style={styles.formFooter}>
            <TouchableOpacity
              style={[
                styles.saveButton,
                isSaving && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                  <Text style={styles.saveButtonText}>
                    {editingAddress ? "Save changes" : "Save address"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Modal
            visible={mapVisible}
            animationType="slide"
            onRequestClose={() => setMapVisible(false)}
          >
            <View style={styles.mapScreen}>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setMapVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#111827" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Pin delivery location</Text>
                <View style={styles.headerPlaceholder} />
              </View>
              <View style={styles.mapHint}>
                <Ionicons name="information-circle-outline" size={18} color="#374151" />
                <Text style={styles.mapHintText}>Tap the map or drag the marker to the exact entrance.</Text>
              </View>
              <MapView
                style={styles.map}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
                initialRegion={tempPin
                  ? { ...tempPin, latitudeDelta: 0.01, longitudeDelta: 0.01 }
                  : { latitude: 6.9271, longitude: 79.8612, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
                onPress={(event) => setTempPin(event.nativeEvent.coordinate)}
              >
                {tempPin && (
                  <Marker
                    coordinate={tempPin}
                    draggable
                    onDragEnd={(event) => setTempPin(event.nativeEvent.coordinate)}
                    title="Delivery location"
                  />
                )}
              </MapView>
              <View style={styles.mapFooter}>
                <Text style={styles.mapCoordinates}>
                  {tempPin
                    ? `${tempPin.latitude.toFixed(6)}, ${tempPin.longitude.toFixed(6)}`
                    : "Tap the map to place a pin"}
                </Text>
                <TouchableOpacity
                  style={[styles.saveButton, (!tempPin || isGeocoding) && styles.saveButtonDisabled]}
                  disabled={!tempPin || isGeocoding}
                  onPress={async () => {
                    if (!tempPin) return;
                    await applyPinnedLocation(tempPin.latitude, tempPin.longitude);
                    setMapVisible(false);
                  }}
                >
                  {isGeocoding ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={21} color="#FFFFFF" />
                      <Text style={styles.saveButtonText}>Confirm location</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

interface AddressFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  autoCapitalize?: React.ComponentProps<typeof TextInput>["autoCapitalize"];
}

function AddressField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  keyboardType = "default",
  autoCapitalize = "none",
}: AddressFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <Ionicons name={icon} size={19} color="#6B7280" />
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          returnKeyType="next"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F6F7FB",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F6F7FB",
  },
  loadingText: {
    marginTop: 12,
    color: "#6B7280",
    fontSize: 14,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00002E",
    borderRadius: 18,
    padding: 18,
    marginBottom: 22,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    marginRight: 14,
  },
  heroCopy: {
    flex: 1,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 4,
  },
  heroText: {
    color: "#D8D8E7",
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  sectionHint: {
    marginTop: 3,
    fontSize: 12,
    color: "#6B7280",
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EAECF2",
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#111827",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 7,
    marginBottom: 22,
  },
  emptyButton: {
    height: 50,
    paddingHorizontal: 22,
    borderRadius: 13,
    backgroundColor: "#00002E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  addressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 12,
  },
  defaultAddressCard: {
    borderColor: "#00002E",
    borderWidth: 1.5,
  },
  addressTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  addressIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  defaultAddressIcon: {
    backgroundColor: "#00002E",
  },
  addressHeading: {
    flex: 1,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 5,
  },
  addressLabel: {
    color: "#111827",
    fontSize: 16,
    fontWeight: "700",
  },
  defaultBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#CCFBF1",
  },
  defaultBadgeText: {
    color: "#0F766E",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  addressText: {
    color: "#5F6673",
    fontSize: 13,
    lineHeight: 19,
    paddingRight: 4,
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: "#F0F1F4",
  },
  actionSpacer: {
    flex: 1,
  },
  defaultAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
  },
  defaultActionText: {
    color: "#00002E",
    fontWeight: "600",
    fontSize: 12,
  },
  iconAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    padding: 7,
    marginRight: 4,
  },
  editText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12,
  },
  deleteAction: {
    padding: 7,
  },
  floatingButton: {
    position: "absolute",
    right: 18,
    bottom: 20,
    minWidth: 144,
    height: 54,
    paddingHorizontal: 19,
    borderRadius: 27,
    backgroundColor: "#00002E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#00002E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  floatingButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalScreen: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  modalHeader: {
    height: 60,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#EAECF0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  headerPlaceholder: {
    width: 40,
  },
  formContent: {
    padding: 18,
    paddingBottom: 30,
  },
  inputLabel: {
    color: "#374151",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  labelOptions: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 20,
  },
  labelOption: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DAE1",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  selectedLabelOption: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  labelOptionText: {
    color: "#4B5563",
    fontSize: 13,
    fontWeight: "600",
  },
  selectedLabelOptionText: {
    color: "#FFFFFF",
  },
  fieldGroup: {
    marginBottom: 17,
  },
  inputContainer: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D8DAE1",
    backgroundColor: "#FFFFFF",
  },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 10,
    color: "#111827",
    fontSize: 14,
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 11,
  },
  column: {
    flex: 1,
  },
  defaultSwitchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E4EA",
    borderRadius: 14,
    padding: 14,
    marginTop: 2,
  },
  switchIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F0F0F7",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  switchCopy: {
    flex: 1,
    paddingRight: 8,
  },
  switchTitle: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 14,
  },
  switchText: {
    marginTop: 3,
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 16,
  },
  formFooter: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EAECF0",
  },
  saveButton: {
    height: 53,
    borderRadius: 13,
    backgroundColor: "#00002E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#DCFCE7",
  },
  locationBadgeText: {
    color: "#166534",
    fontSize: 10,
    fontWeight: "700",
  },
  locationMissingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#FEF3C7",
  },
  locationMissingBadgeText: {
    color: "#B45309",
    fontSize: 10,
    fontWeight: "700",
  },
  locationPanel: {
    borderWidth: 1,
    borderColor: "#D8DAE1",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    padding: 14,
    marginBottom: 20,
  },
  locationStatusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F0F7",
    marginRight: 11,
  },
  locationStatusCopy: {
    flex: 1,
    paddingRight: 8,
  },
  locationStatusTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700",
  },
  locationStatusText: {
    color: "#6B7280",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  locationActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 13,
  },
  locationAction: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7CAD4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryLocationAction: {
    backgroundColor: "#00002E",
    borderColor: "#00002E",
  },
  locationActionText: {
    color: "#00002E",
    fontSize: 13,
    fontWeight: "700",
  },
  primaryLocationActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  mapScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  mapHint: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F3F4F6",
  },
  mapHintText: {
    flex: 1,
    color: "#374151",
    fontSize: 12,
    lineHeight: 17,
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    padding: 16,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: "#EAECF0",
    backgroundColor: "#FFFFFF",
  },
  mapCoordinates: {
    color: "#4B5563",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 10,
  },
});
