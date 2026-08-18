import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  fetchCart,
  addItemToCart,
  updateCartItemQty,
  removeCartItem,
  clearCartApi,
  BackendCartItem,
  SessionExpiredError,
} from '../api/cart';
import { getToken } from '../api/storage';
import { router } from 'expo-router';

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
  // `silent` skips the loading flag so a background reconcile (e.g. after an
  // optimistic add) doesn't flash a spinner over already-visible items.
  const loadCart = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const token = await getToken();

      if (token) {
        // Authenticated → fetch from backend
        console.log('🛒 Cart: Found auth token, attempting backend fetch...');
        try {
          const response = await fetchCart();
          if (response.success && response.data) {
            console.log('🛒 Cart: Backend fetch successful, loaded', response.data.items.length, 'items');
            const normalized = response.data.items.map(normalizeItem);
            setItems(normalized);
            // Keep offline cache in sync
            await AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(normalized));
            return;
          }
        } catch (backendError) {
          if (backendError instanceof SessionExpiredError) {
            setItems([]);
            await AsyncStorage.removeItem(CART_OFFLINE_KEY);
            router.replace('/(auth)/login');
            return;
          }
          console.warn('🛒 Cart: Backend fetch failed, falling back to offline cache:', String(backendError).substring(0, 100));
        }
      } else {
        console.log('🛒 Cart: No auth token, using offline cache');
      }

      // Not authenticated or backend failed → use offline cache
      const cached = await AsyncStorage.getItem(CART_OFFLINE_KEY);
      const items = cached ? JSON.parse(cached) : [];
      console.log('🛒 Cart: Loaded', items.length, 'items from offline cache');
      setItems(items);
    } catch (error) {
      console.error('🛒 Cart: Failed to load cart:', error);
      // Fallback to offline cache
      try {
        const cached = await AsyncStorage.getItem(CART_OFFLINE_KEY);
        setItems(cached ? JSON.parse(cached) : []);
      } catch {
        setItems([]);
      }
    } finally {
      if (!silent) setIsLoading(false);
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

      // Optimistic update first so the cart reflects the add instantly. If the item
      // is already in the cart we bump its quantity, otherwise append a temporary row.
      let prevItems: CartItem[] = [];
      setItems((curr) => {
        prevItems = curr;
        const existing = curr.find(
          (i) => i.productId === item.productId && i.itemType === item.itemType
        );
        const next = existing
          ? curr.map((i) => (i === existing ? { ...i, quantity: i.quantity + 1 } : i))
          : [...curr, { ...item, id: `temp-${Date.now()}`, quantity: 1 }];
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(next));
        return next;
      });

      try {
        await addItemToCart(item.productId, 1, item.itemType);
        // Reconcile in the background (silent) to pick up the real cart item ID and
        // any server-side merge, without blocking the UI or flashing a spinner.
        loadCart(true);
      } catch (error) {
        // Roll back the optimistic change on failure.
        setItems(prevItems);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(prevItems));
        throw error;
      }
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

      // Optimistic UI update first so removal feels instant; roll back on failure.
      let prevItems: CartItem[] = [];
      setItems((curr) => {
        prevItems = curr;
        const next = curr.filter((i) => i.id !== id);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(next));
        return next;
      });

      try {
        await removeCartItem(id);
      } catch (error) {
        setItems(prevItems);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(prevItems));
        throw error;
      }
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

      // Optimistic UI update first so +/- feels instant; roll back on failure.
      let prevItems: CartItem[] = [];
      setItems((curr) => {
        prevItems = curr;
        const next = curr
          .map((i) => (i.id === id ? { ...i, quantity } : i))
          .filter((i) => i.quantity > 0);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(next));
        return next;
      });

      try {
        await updateCartItemQty(id, quantity);
      } catch (error) {
        setItems(prevItems);
        AsyncStorage.setItem(CART_OFFLINE_KEY, JSON.stringify(prevItems));
        throw error;
      }
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
