import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchCart,
  addItemToCart,
  updateCartItemQty,
  removeCartItem,
  clearCartApi,
  BackendCartItem,
} from '../api/cart';
import { getToken } from '../api/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CartItem {
  id: string;           // backend CartItem ID (used for API calls)
  productId: string;    // actual Product or CarPart ID
  itemType: 'PRODUCT' | 'CAR_PART';
  name: string;
  price: number;
  discountPrice?: number | null;
  quantity: number;
  image?: string | null;
  carInfo?: string | null;
  categoryName?: string | null;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id' | 'quantity'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  getTotalItems: () => number;
  refreshCart: () => Promise<void>;
  isLoading: boolean;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextType | undefined>(undefined);

// Local storage key used only as an offline fallback
const CART_OFFLINE_KEY = 'digifix_cart_offline';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Convert backend item shape → local CartItem shape
  const normalizeItem = (item: BackendCartItem): CartItem => ({
    id: item.id,
    productId: item.productId,
    itemType: item.itemType,
    name: item.name,
    price: item.price,
    discountPrice: item.discountPrice ?? undefined,
    quantity: item.quantity,
    image: item.image ?? undefined,
    carInfo: item.carInfo ?? undefined,
    categoryName: item.categoryName ?? undefined,
  });

  // ── Load from backend (or local fallback) ──
  const loadCart = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = await getToken();

      if (token) {
        // Authenticated → fetch from backend because the server is the source
        // of truth for cart contents and prices.
        const response = await fetchCart();
        if (response.success && response.data) {
          const normalized = response.data.items.map(normalizeItem);
          setItems(normalized);
          // Keep offline cache in sync so the user still sees the last cart if
          // the network drops later.
          await AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(normalized));
          return;
        }
      }

      // Not authenticated or backend failed → use offline cache
      const cached = await AsyncStorage.getItem(CART_OFFLINE_KEY);
      setItems(cached ? JSON.parse(cached) : []);
    } catch (error) {
      console.error('Failed to load cart:', error);
      // Fallback to offline cache
      try {
        const cached = await AsyncStorage.getItem(CART_OFFLINE_KEY);
        setItems(cached ? JSON.parse(cached) : []);
      } catch {
        setItems([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  // ── Add item ──
  const addItem = useCallback(
    async (item: Omit<CartItem, 'id' | 'quantity'>) => {
      const token = await getToken();

      if (!token) {
        throw new Error('You must be logged in to add items to cart.');
      }

      // Call backend first so quantity checks and duplicate-item merging happen
      // in one place.
      await addItemToCart(item.productId, 1, item.itemType);

      // Reload after the write because the backend assigns the real cart item
      // ID and may merge with an existing row.
      await loadCart();
    },
    [loadCart]
  );

  // ── Remove item (id = backend CartItem ID) ──
  const removeItem = useCallback(
    async (id: string) => {
      const token = await getToken();

      if (!token) {
        throw new Error('You must be logged in.');
      }

      await removeCartItem(id);

      // Optimistic UI update
      setItems((curr) => {
        const next = curr.filter((i) => i.id !== id);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  // ── Update quantity (id = backend CartItem ID) ──
  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      const token = await getToken();

      if (!token) {
        throw new Error('You must be logged in.');
      }

      if (quantity <= 0) {
        return removeItem(id);
      }

      await updateCartItemQty(id, quantity);

      // Optimistic UI update
      setItems((curr) => {
        const next = curr
          .map((i) => (i.id === id ? { ...i, quantity } : i))
          .filter((i) => i.quantity > 0);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(next));
        return next;
      });
    },
    [removeItem]
  );

  // ── Clear cart ──
  const clearCart = useCallback(async () => {
    const token = await getToken();

    if (!token) {
      throw new Error('You must be logged in.');
    }

    await clearCartApi();
    setItems([]);
    await AsyncStorage.removeItem(CART_OFFLINE_KEY);
  }, []);

  // ── Price helpers ──
  const getTotalPrice = useCallback(() => {
    return items.reduce((sum, item) => {
      const price = item.discountPrice || item.price;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const getTotalItems = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotalPrice,
        getTotalItems,
        refreshCart: loadCart,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
