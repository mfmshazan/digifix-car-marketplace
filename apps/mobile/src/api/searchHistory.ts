import AsyncStorage from '@react-native-async-storage/async-storage';
import type { VehicleInfo } from './vehicle';

// ---------------------------------------------------------------------------
// On-device history of vehicle registration searches, used to power the
// "Based on Your Searches" recommendations on the customer home screen.
// Device-scoped like cartStore's offline cache — no per-user key needed.
// ---------------------------------------------------------------------------
const SEARCH_HISTORY_KEY = '@digifix_vehicle_search_history';
const MAX_HISTORY = 8;

export interface VehicleSearchHistoryEntry {
  registrationNumber: string;
  vehicleInfo: VehicleInfo;
  searchedAt: number;
}

/** Record a successful registration search, newest first, deduped by plate. */
export const recordVehicleSearch = async (
  registrationNumber: string,
  vehicleInfo: VehicleInfo
): Promise<void> => {
  try {
    const history = await getSearchHistory();
    const deduped = history.filter((h) => h.registrationNumber !== registrationNumber);
    const next = [{ registrationNumber, vehicleInfo, searchedAt: Date.now() }, ...deduped].slice(
      0,
      MAX_HISTORY
    );
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  } catch (error) {
    console.error('Error recording vehicle search:', error);
  }
};

export const getSearchHistory = async (): Promise<VehicleSearchHistoryEntry[]> => {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Error reading vehicle search history:', error);
    return [];
  }
};
