import { create } from 'zustand';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  supplier: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity' | 'image'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  
  addItem: (item) => {
    const items = get().items;
    const existingItem = items.find(i => i.id === item.id);
    
    if (existingItem) {
      set({
        items: items.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        ),
      });
    } else {
      set({ items: [...items, { ...item, quantity: 1 }] });
    }
  },
  
  removeItem: (id) => {
    set({ items: get().items.filter(i => i.id !== id) });
  },
  
  updateQuantity: (id, quantity) => {
    if (quantity <= 0) {
      get().removeItem(id);
      return;
    }
    
    set({
      items: get().items.map(i =>
        i.id === id ? { ...i, quantity } : i
      ),
    });
  },
  
  clearCart: () => {
    set({ items: [] });
  },
  
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPrice: () => {
    return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
  },
}));
