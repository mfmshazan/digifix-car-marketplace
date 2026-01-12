import AsyncStorage from "@react-native-async-storage/async-storage";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  supplier: string;
}

export interface Address {
  id: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export interface Order {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  items: OrderItem[];
  address?: Address;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  notes?: string;
  sellerId?: string;
  sellerEmail?: string;
  trackingNumber?: string;
  confirmedByBuyer?: boolean;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  supplier: string;
  sellerId: string;
  sellerEmail: string;
  images: string[];
  specifications: { [key: string]: string };
  rating: number;
  reviews: number;
  status: "active" | "inactive" | "out_of_stock";
  sales: number;
  createdAt: string;
  updatedAt: string;
}

// Get all orders for a specific seller
export const getSellerOrders = async (sellerEmail: string): Promise<Order[]> => {
  try {
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    if (!allOrdersStr) return [];
    
    const allOrders: Order[] = JSON.parse(allOrdersStr);
    // Return orders where items contain products from this seller
    return allOrders.filter(order => 
      order.items.some(item => item.supplier === sellerEmail) ||
      order.sellerEmail === sellerEmail
    );
  } catch (error) {
    console.error("Error getting seller orders:", error);
    return [];
  }
};

// Get all orders for a specific buyer
export const getBuyerOrders = async (userId: string): Promise<Order[]> => {
  try {
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    if (!allOrdersStr) {
      // Fallback to user-specific orders
      const userOrdersStr = await AsyncStorage.getItem('userOrders');
      return userOrdersStr ? JSON.parse(userOrdersStr) : [];
    }
    
    const allOrders: Order[] = JSON.parse(allOrdersStr);
    return allOrders.filter(order => order.userId === userId);
  } catch (error) {
    console.error("Error getting buyer orders:", error);
    return [];
  }
};

// Save order to shared storage
export const saveOrder = async (order: Order): Promise<void> => {
  try {
    // Save to all orders
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    const allOrders: Order[] = allOrdersStr ? JSON.parse(allOrdersStr) : [];
    allOrders.unshift(order);
    await AsyncStorage.setItem('allOrders', JSON.stringify(allOrders));
    
    // Also save to user orders for backward compatibility
    const userOrdersStr = await AsyncStorage.getItem('userOrders');
    const userOrders: Order[] = userOrdersStr ? JSON.parse(userOrdersStr) : [];
    userOrders.unshift(order);
    await AsyncStorage.setItem('userOrders', JSON.stringify(userOrders));
  } catch (error) {
    console.error("Error saving order:", error);
    throw error;
  }
};

// Update order status
export const updateOrderStatus = async (
  orderId: string,
  status: Order["status"],
  trackingNumber?: string
): Promise<void> => {
  try {
    // Update in all orders
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    if (allOrdersStr) {
      const allOrders: Order[] = JSON.parse(allOrdersStr);
      const updatedOrders = allOrders.map(order =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString(), trackingNumber }
          : order
      );
      await AsyncStorage.setItem('allOrders', JSON.stringify(updatedOrders));
    }
    
    // Update in user orders
    const userOrdersStr = await AsyncStorage.getItem('userOrders');
    if (userOrdersStr) {
      const userOrders: Order[] = JSON.parse(userOrdersStr);
      const updatedOrders = userOrders.map(order =>
        order.id === orderId
          ? { ...order, status, updatedAt: new Date().toISOString(), trackingNumber }
          : order
      );
      await AsyncStorage.setItem('userOrders', JSON.stringify(updatedOrders));
    }
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

// Update order (for editing)
export const updateOrder = async (updatedOrder: Order): Promise<void> => {
  try {
    updatedOrder.updatedAt = new Date().toISOString();
    
    // Update in all orders
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    if (allOrdersStr) {
      const allOrders: Order[] = JSON.parse(allOrdersStr);
      const updatedOrders = allOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      );
      await AsyncStorage.setItem('allOrders', JSON.stringify(updatedOrders));
    }
    
    // Update in user orders
    const userOrdersStr = await AsyncStorage.getItem('userOrders');
    if (userOrdersStr) {
      const userOrders: Order[] = JSON.parse(userOrdersStr);
      const updatedOrders = userOrders.map(order =>
        order.id === updatedOrder.id ? updatedOrder : order
      );
      await AsyncStorage.setItem('userOrders', JSON.stringify(updatedOrders));
    }
  } catch (error) {
    console.error("Error updating order:", error);
    throw error;
  }
};

// Confirm order delivery by buyer
export const confirmOrderDelivery = async (orderId: string): Promise<void> => {
  try {
    const allOrdersStr = await AsyncStorage.getItem('allOrders');
    if (allOrdersStr) {
      const allOrders: Order[] = JSON.parse(allOrdersStr);
      const updatedOrders = allOrders.map(order =>
        order.id === orderId
          ? { 
              ...order, 
              status: "delivered" as const, 
              confirmedByBuyer: true,
              updatedAt: new Date().toISOString() 
            }
          : order
      );
      await AsyncStorage.setItem('allOrders', JSON.stringify(updatedOrders));
    }
    
    const userOrdersStr = await AsyncStorage.getItem('userOrders');
    if (userOrdersStr) {
      const userOrders: Order[] = JSON.parse(userOrdersStr);
      const updatedOrders = userOrders.map(order =>
        order.id === orderId
          ? { 
              ...order, 
              status: "delivered" as const, 
              confirmedByBuyer: true,
              updatedAt: new Date().toISOString() 
            }
          : order
      );
      await AsyncStorage.setItem('userOrders', JSON.stringify(updatedOrders));
    }
  } catch (error) {
    console.error("Error confirming delivery:", error);
    throw error;
  }
};

// Get seller products
export const getSellerProducts = async (sellerEmail: string): Promise<Product[]> => {
  try {
    const productsStr = await AsyncStorage.getItem('sellerProducts');
    if (!productsStr) return [];
    
    const allProducts: Product[] = JSON.parse(productsStr);
    return allProducts.filter(p => p.sellerEmail === sellerEmail);
  } catch (error) {
    console.error("Error getting seller products:", error);
    return [];
  }
};

// Save product
export const saveProduct = async (product: Product): Promise<void> => {
  try {
    const productsStr = await AsyncStorage.getItem('sellerProducts');
    const products: Product[] = productsStr ? JSON.parse(productsStr) : [];
    
    const existingIndex = products.findIndex(p => p.id === product.id);
    if (existingIndex >= 0) {
      products[existingIndex] = product;
    } else {
      products.unshift(product);
    }
    
    await AsyncStorage.setItem('sellerProducts', JSON.stringify(products));
  } catch (error) {
    console.error("Error saving product:", error);
    throw error;
  }
};

// Delete product
export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const productsStr = await AsyncStorage.getItem('sellerProducts');
    if (!productsStr) return;
    
    const products: Product[] = JSON.parse(productsStr);
    const filteredProducts = products.filter(p => p.id !== productId);
    await AsyncStorage.setItem('sellerProducts', JSON.stringify(filteredProducts));
  } catch (error) {
    console.error("Error deleting product:", error);
    throw error;
  }
};

// Get user role (buyer or seller)
export const getUserRole = async (email: string): Promise<"buyer" | "seller"> => {
  try {
    const rolesStr = await AsyncStorage.getItem('userRoles');
    if (!rolesStr) {
      // Default seller account
      if (email === "ranjithwn@gmail.com") return "seller";
      return "buyer";
    }
    
    const roles: { [email: string]: "buyer" | "seller" } = JSON.parse(rolesStr);
    return roles[email] || "buyer";
  } catch (error) {
    console.error("Error getting user role:", error);
    return "buyer";
  }
};

// Set user role
export const setUserRole = async (email: string, role: "buyer" | "seller"): Promise<void> => {
  try {
    const rolesStr = await AsyncStorage.getItem('userRoles');
    const roles: { [email: string]: "buyer" | "seller" } = rolesStr ? JSON.parse(rolesStr) : {};
    roles[email] = role;
    await AsyncStorage.setItem('userRoles', JSON.stringify(roles));
  } catch (error) {
    console.error("Error setting user role:", error);
  }
};

// Initialize default seller account
export const initializeDefaultSeller = async (): Promise<void> => {
  try {
    await setUserRole("ranjithwn@gmail.com", "seller");
  } catch (error) {
    console.error("Error initializing default seller:", error);
  }
};
