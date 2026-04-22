import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CART_STORAGE_KEY = 'digifix_cart';

export interface CartItem {
  id: string;
  productId: string;
  itemType: 'PRODUCT' | 'CAR_PART';
  name: string;
  price: number;
  discountPrice?: number;
  quantity: number;
  image?: string;
  carInfo?: string;
  categoryName?: string;
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

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadCart = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error('Failed to load local cart:', error);
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveCart = useCallback(async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (error) {
      console.error('Failed to save local cart:', error);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const addItem = useCallback(
    async (item: Omit<CartItem, 'id' | 'quantity'>) => {
      const localId = `${item.itemType}:${item.productId}`;

      setItems((currentItems) => {
        const existingItem = currentItems.find((i) => i.id === localId);
        const nextItems = existingItem
          ? currentItems.map((i) =>
              i.id === localId ? { ...i, quantity: i.quantity + 1 } : i
            )
          : [...currentItems, { ...item, id: localId, quantity: 1 }];

        saveCart(nextItems);
        return nextItems;
      });
    },
    [saveCart]
  );

  const removeItem = useCallback(
    async (id: string) => {
      setItems((currentItems) => {
        const nextItems = currentItems.filter((i) => i.id !== id);
        saveCart(nextItems);
        return nextItems;
      });
    },
    [saveCart]
  );

  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      setItems((currentItems) => {
        const nextItems = currentItems
          .map((i) => (i.id === id ? { ...i, quantity: Math.max(0, quantity) } : i))
          .filter((i) => i.quantity > 0);

        saveCart(nextItems);
        return nextItems;
      });
    },
    [saveCart]
  );

  const clearCart = useCallback(async () => {
    setItems([]);
    await saveCart([]);
  }, [saveCart]);

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
