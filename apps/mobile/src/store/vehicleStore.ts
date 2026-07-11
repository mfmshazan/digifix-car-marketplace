import { create } from 'zustand';
import type { VehicleSearchData } from '../api/vehicle';

// ================================
// Vehicle Store
// ================================
// Shared state between the Home screen and Categories screen.
// When the customer searches by registration number on Home and a vehicle is
// identified, the result is stored here so the Categories tab can filter its
// part-type list and product listings to only show compatible items.

interface VehicleStore {
  /** Full search result including vehicleInfo, compatibleProducts, compatiblePartTypes */
  vehicleData: VehicleSearchData | null;
  /** The raw registration number that was searched */
  registrationNumber: string;
  /** Persist the latest search result */
  setVehicleData: (data: VehicleSearchData, registrationNumber: string) => void;
  /** Clear the current vehicle context (user taps "Clear") */
  clearVehicle: () => void;
}

export const useVehicleStore = create<VehicleStore>((set) => ({
  vehicleData: null,
  registrationNumber: '',

  setVehicleData: (data, registrationNumber) =>
    set({ vehicleData: data, registrationNumber }),

  clearVehicle: () =>
    set({ vehicleData: null, registrationNumber: '' }),
}));
