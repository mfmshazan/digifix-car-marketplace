# OneSignal Push Notification Setup Guide

This guide will help you set up OneSignal push notifications for the DIGIFIX Auto Parts mobile app.

## 📋 Prerequisites

- OneSignal account (free at https://onesignal.com)
- Apple Developer account (for iOS)
- Firebase account (for Android)

## 🚀 Step 1: Install Dependencies

Run the following command in the `apps/mobile` directory:

```bash
npm install onesignal-expo-plugin react-native-onesignal --save
```

## 🔧 Step 2: Create OneSignal App

1. Go to [OneSignal Dashboard](https://app.onesignal.com)
2. Click **"New App/Website"**
3. Enter app name: `DIGIFIX Auto Parts`
4. Select platform: **Google Android (FCM)** and **Apple iOS (APNs)**

## 📱 Step 3: Configure Android (FCM)

### 3.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Add an Android app with package name: `com.digifix.autoparts`
4. Download `google-services.json`
5. Place it in: `apps/mobile/google-services.json`

### 3.2 Get Firebase Server Key

1. In Firebase Console, go to **Project Settings > Cloud Messaging**
2. Copy the **Server Key** (Legacy server key)
3. In OneSignal Dashboard, paste the Server Key

## 🍎 Step 4: Configure iOS (APNs)

### 4.1 Create APNs Key (Recommended)

1. Go to [Apple Developer Portal](https://developer.apple.com/account)
2. Navigate to **Certificates, Identifiers & Profiles > Keys**
3. Create a new key with **Apple Push Notifications service (APNs)** enabled
4. Download the `.p8` file
5. Note the **Key ID** and **Team ID**

### 4.2 Upload to OneSignal

1. In OneSignal Dashboard, go to **Settings > Platforms > Apple iOS**
2. Upload the `.p8` file
3. Enter Key ID, Team ID, and Bundle ID: `com.digifix.autoparts`

## 🔑 Step 5: Get OneSignal App ID

1. In OneSignal Dashboard, go to **Settings > Keys & IDs**
2. Copy the **OneSignal App ID**

## ⚙️ Step 6: Configure the App

### 6.1 Update app.json

The `app.json` has already been configured. Just update the App ID:

```json
{
  "expo": {
    "extra": {
      "oneSignalAppId": "YOUR_ACTUAL_ONESIGNAL_APP_ID"
    }
  }
}
```

### 6.2 Update onesignal.config.ts (Alternative)

Or update directly in `src/config/onesignal.config.ts`:

```typescript
const ONESIGNAL_APP_ID = 'YOUR_ACTUAL_ONESIGNAL_APP_ID';
```

## 🏗️ Step 7: Build the App

OneSignal requires a **development build** (not Expo Go):

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure EAS Build
eas build:configure

# Build for development
eas build --profile development --platform android
eas build --profile development --platform ios
```

## 🧪 Step 8: Test Notifications

### Using OneSignal Dashboard

1. Go to **Messages > Push > New Push**
2. Select your audience (All Users or specific segment)
3. Add title and message
4. Click **Send**

### Using OneSignal API

```bash
curl -X POST https://onesignal.com/api/v1/notifications \
  -H "Authorization: Basic YOUR_REST_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "app_id": "YOUR_APP_ID",
    "included_segments": ["All"],
    "headings": {"en": "Order Update"},
    "contents": {"en": "Your order has been shipped!"}
  }'
```

## 📊 User Segmentation

The app automatically sets tags for user segmentation:

| Tag | Values | Usage |
|-----|--------|-------|
| `user_role` | `CUSTOMER`, `SALESMAN`, `ADMIN` | Target by role |

### Send to Specific Role

```json
{
  "app_id": "YOUR_APP_ID",
  "filters": [
    {"field": "tag", "key": "user_role", "value": "SALESMAN"}
  ],
  "headings": {"en": "New Order!"},
  "contents": {"en": "You have a new order waiting."}
}
```

## 🔔 Notification Types for DIGIFIX

### Order Notifications

```json
{
  "headings": {"en": "Order Confirmed"},
  "contents": {"en": "Your order #12345 has been confirmed!"},
  "data": {
    "screen": "/(customer)/orders",
    "orderId": "12345"
  }
}
```

### Shipping Updates

```json
{
  "headings": {"en": "Order Shipped"},
  "contents": {"en": "Your order is on its way!"},
  "data": {
    "screen": "/(customer)/orders",
    "orderId": "12345",
    "trackingUrl": "https://tracking.example.com/12345"
  }
}
```

### New Product Alerts (for Customers)

```json
{
  "filters": [
    {"field": "tag", "key": "user_role", "value": "CUSTOMER"}
  ],
  "headings": {"en": "New Arrival!"},
  "contents": {"en": "Check out our new brake pads - 20% off!"},
  "data": {
    "screen": "/(customer)/categories"
  }
}
```

### New Order Alert (for Salesmen)

```json
{
  "filters": [
    {"field": "tag", "key": "user_role", "value": "SALESMAN"}
  ],
  "headings": {"en": "New Order Received"},
  "contents": {"en": "Customer John placed an order for $150.00"},
  "data": {
    "screen": "/(salesman)/orders",
    "orderId": "12345"
  }
}
```

## 🔧 Backend Integration

To send notifications from your backend, install the OneSignal Node.js SDK:

```bash
cd backend
npm install @onesignal/node-onesignal
```

### Example Backend Service

```typescript
import * as OneSignal from '@onesignal/node-onesignal';

const configuration = OneSignal.createConfiguration({
  appKey: process.env.ONESIGNAL_APP_ID,
  restApiKey: process.env.ONESIGNAL_REST_API_KEY,
});

const client = new OneSignal.DefaultApi(configuration);

// Send notification to specific user
export async function sendOrderNotification(userId: string, orderId: string, message: string) {
  const notification = new OneSignal.Notification();
  notification.app_id = process.env.ONESIGNAL_APP_ID!;
  notification.include_external_user_ids = [userId];
  notification.headings = { en: 'Order Update' };
  notification.contents = { en: message };
  notification.data = { orderId, screen: '/(customer)/orders' };

  await client.createNotification(notification);
}

// Send to all salesmen
export async function notifySalesmen(message: string) {
  const notification = new OneSignal.Notification();
  notification.app_id = process.env.ONESIGNAL_APP_ID!;
  notification.filters = [
    { field: 'tag', key: 'user_role', value: 'SALESMAN' }
  ];
  notification.headings = { en: 'New Order' };
  notification.contents = { en: message };

  await client.createNotification(notification);
}
```

## 🐛 Troubleshooting

### Notifications not working in Expo Go
OneSignal requires a **development build**. Expo Go does not support native push notifications.

### iOS notifications not appearing
1. Ensure APNs is configured correctly in OneSignal
2. Check that the bundle ID matches: `com.digifix.autoparts`
3. Verify the `.p8` key is valid

### Android notifications not appearing
1. Ensure `google-services.json` is in the correct location
2. Check Firebase Server Key is correct in OneSignal
3. Verify package name matches: `com.digifix.autoparts`

### User not receiving targeted notifications
1. Ensure user has logged in after OneSignal was initialized
2. Check that `setOneSignalUserId()` was called
3. Verify tags are set correctly in OneSignal Dashboard > Audience

## 📚 Resources

- [OneSignal React Native SDK Docs](https://documentation.onesignal.com/docs/react-native-sdk-setup)
- [OneSignal Expo Plugin](https://github.com/OneSignal/onesignal-expo-plugin)
- [OneSignal REST API](https://documentation.onesignal.com/reference/create-notification)
