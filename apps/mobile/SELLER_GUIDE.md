# Seller Account Guide

## Overview
The DigiFix Car Marketplace now includes complete seller functionality with real-time order management, product listings, and buyer-seller interactions.

## Seller Login Credentials
- **Email**: ranjithwn@gmail.com
- **Password**: abcd1234

## Features

### 1. Seller Dashboard
- **Real-time Statistics**:
  - Total Sales (calculated from delivered orders)
  - Total Orders Count
  - Products Count
  - Unique Customers Count
  - Pending, Shipped, and Delivered Orders Breakdown

- **Quick Actions**:
  - Add Product
  - View Orders
  - Manage Products
  - Edit Profile

- **Recent Orders**:
  - View last 5 orders
  - Quick access to order details
  - Status indicators with color coding

### 2. Orders Management
Complete order lifecycle management with the following features:

#### Order Statuses
1. **Pending**: New order from buyer
   - Seller can: Confirm or Cancel
2. **Confirmed**: Order accepted by seller
   - Seller can: Start Processing
3. **Processing**: Order being prepared
   - Seller can: Ship with tracking number
4. **Shipped**: Order in transit
   - Buyer can: Confirm delivery
   - Shows tracking number if provided
5. **Delivered**: Order received by buyer
   - Shows if confirmed by buyer
6. **Cancelled**: Order cancelled by seller

#### Seller Actions
- **Confirm Order**: Accept pending orders
- **Start Processing**: Begin preparing confirmed orders
- **Ship Order**: 
  - Enter tracking number
  - Updates order status to "shipped"
  - Buyer receives notification
- **Cancel Order**: Cancel unwanted orders (not delivered/cancelled)

#### Order Filters
- All Orders
- Pending (pending, confirmed, processing)
- Shipped
- Completed (delivered, cancelled)

#### Order Statistics
Real-time stats showing:
- Total orders
- Pending count
- Shipped count
- Delivered count

### 3. Product Management
- View all seller products
- Add new products
- Edit existing products
- Delete products
- Product inventory tracking

### 4. Profile Management
- Edit business information
- Update contact details
- Manage business settings

## Buyer-Seller Flow

### Complete Order Flow:
1. **Buyer Places Order**
   - Selects products and completes checkout
   - Order saved with seller email (from product supplier)
   - Order status: "Pending"

2. **Seller Receives Order**
   - Sees new order in dashboard (notification badge)
   - Can view full order details
   - Actions: Confirm or Cancel

3. **Seller Confirms Order**
   - Order status changes to "Confirmed"
   - Seller can start processing

4. **Seller Processes Order**
   - Order status changes to "Processing"
   - Seller prepares items for shipping

5. **Seller Ships Order**
   - Enters tracking number
   - Order status changes to "Shipped"
   - Buyer can see tracking information

6. **Buyer Receives Order**
   - Buyer clicks "Confirm Delivery"
   - Order status changes to "Delivered"
   - `confirmedByBuyer` flag set to true
   - Transaction complete

### Alternative Flows:
- **Seller Cancels**: Order marked as "Cancelled" at any time before delivery
- **Direct Processing**: Seller can skip "Confirmed" and go straight to "Processing"

## Data Storage

### AsyncStorage Keys:
- `allOrders`: Shared storage for all orders (buyer + seller)
- `userOrders`: Backup storage for backward compatibility
- `sellerProducts`: Products listed by sellers
- `userRoles`: User role assignments (buyer/seller)

### Order Object Structure:
```typescript
{
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  sellerEmail: string;
  items: OrderItem[];
  address?: Address;
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  updatedAt: string;
  confirmedByBuyer: boolean;
  trackingNumber?: string;
  notes?: string;
}
```

## Technical Implementation

### Key Files:
1. **utils/orderManager.ts**: Central order management system
   - `getSellerOrders(sellerEmail)`: Get all orders for a seller
   - `getBuyerOrders(userId)`: Get all orders for a buyer
   - `updateOrderStatus(orderId, status, trackingNumber?)`: Update order status
   - `confirmOrderDelivery(orderId)`: Buyer confirms delivery
   - `saveOrder(order)`: Save order to storage
   - `updateOrder(order)`: Update order details
   - `getUserRole(email)`: Get user role (buyer/seller)
   - `initializeDefaultSeller()`: Set default seller account

2. **app/(salesman)/orders.tsx**: Seller order management screen
3. **app/(salesman)/index.tsx**: Seller dashboard with real statistics
4. **app/(customer)/orders.tsx**: Buyer order list
5. **app/order/[id].tsx**: Order details with edit/cancel/confirm

### Real-time Updates:
- Uses `useFocusEffect` to reload data when screens gain focus
- Automatic refresh when navigating between screens
- Pull-to-refresh on all list screens

## Testing the Flow

### As Seller (ranjithwn@gmail.com):
1. Login with seller credentials
2. View dashboard with real statistics
3. Go to Orders tab
4. See all orders placed by buyers
5. Confirm pending orders
6. Ship orders with tracking numbers
7. Monitor delivery confirmations

### As Buyer:
1. Login with any buyer account
2. Browse products and add to cart
3. Complete checkout
4. View order in "My Orders"
5. Wait for seller to ship
6. Confirm delivery when received

### Complete Test Scenario:
1. **Login as Buyer**: Place an order
2. **Login as Seller**: See the new order (notification badge)
3. **As Seller**: Confirm the order
4. **As Seller**: Mark as processing
5. **As Seller**: Ship with tracking number (e.g., "TRACK123")
6. **Login as Buyer**: See "Shipped" status with tracking
7. **As Buyer**: Click "Confirm Delivery"
8. **Login as Seller**: See order marked as "Delivered" with buyer confirmation

## Notes
- Default seller account is initialized automatically on app launch
- Seller email is assigned based on product supplier during checkout
- All order updates are synchronized across buyer and seller views
- Tracking numbers are optional but recommended for better customer experience
- Orders can be edited by buyers before shipping
- Sellers cannot modify delivered or cancelled orders
