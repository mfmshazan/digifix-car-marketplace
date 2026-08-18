import { getApiUrl } from "../config/api.config";
import { getToken } from "./storage";

export interface CustomerAddress {
  id: string;
  label: string | null;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
}

export interface AddressInput {
  label: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  isDefault: boolean;
}

interface AddressResponse {
  success: boolean;
  data: CustomerAddress;
  message?: string;
}

interface AddressListResponse {
  success: boolean;
  data: CustomerAddress[];
  message?: string;
}

const addressRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const token = await getToken();
  if (!token) {
    throw new Error("Please sign in to manage your addresses.");
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  let result: { message?: string } & Partial<T>;
  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    throw new Error(result.message || "Unable to manage saved addresses.");
  }

  return result as T;
};

export const getAddresses = async (): Promise<CustomerAddress[]> => {
  const response = await addressRequest<AddressListResponse>("/users/addresses");
  return response.data;
};

export const createAddress = async (
  input: AddressInput,
): Promise<CustomerAddress> => {
  const response = await addressRequest<AddressResponse>("/users/addresses", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
};

export const updateAddress = async (
  addressId: string,
  input: Partial<AddressInput>,
): Promise<CustomerAddress> => {
  const response = await addressRequest<AddressResponse>(
    `/users/addresses/${addressId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return response.data;
};

export const deleteAddress = async (addressId: string): Promise<void> => {
  await addressRequest<{ success: boolean; message?: string }>(
    `/users/addresses/${addressId}`,
    { method: "DELETE" },
  );
};

export const setDefaultAddress = async (
  addressId: string,
): Promise<CustomerAddress> => {
  return updateAddress(addressId, { isDefault: true });
};

