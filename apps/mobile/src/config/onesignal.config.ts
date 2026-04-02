/**
 * OneSignal Push Notification Configuration
 * 
 * Setup Instructions:
 * 1. Create a OneSignal account at https://onesignal.com
 * 2. Create a new app in OneSignal dashboard
 * 3. Get your App ID from Settings > Keys & IDs
 * 4. Replace the placeholder below with your actual App ID
 * 5. Configure iOS: Upload APNs certificate in OneSignal dashboard
 * 6. Configure Android: Add Firebase Server Key in OneSignal dashboard
 */

import { Platform } from 'react-native';
import { OneSignal, LogLevel } from 'react-native-onesignal';
import Constants from 'expo-constants';

// ============================================
// CONFIGURATION - Update this value
// ============================================

// Your OneSignal App ID (get from OneSignal Dashboard > Settings > Keys & IDs)
const ONESIGNAL_APP_ID = Constants.expoConfig?.extra?.oneSignalAppId || 'YOUR_ONESIGNAL_APP_ID_HERE';

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize OneSignal push notifications
 * Call this function once when the app starts (in _layout.tsx)
 */
export const initializeOneSignal = (): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') {
    console.warn('⚠️ OneSignal App ID not configured. Push notifications will not work.');
    console.warn('📝 Update ONESIGNAL_APP_ID in src/config/onesignal.config.ts');
    return;
  }

  // Enable verbose logging in development (remove in production)
  if (__DEV__) {
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
  }

  // Initialize with your app ID
  OneSignal.initialize(ONESIGNAL_APP_ID);

  // Request push notification permission
  // For iOS, this will show the native permission prompt
  // For Android 13+, this will show the permission prompt
  OneSignal.Notifications.requestPermission(true);

  console.log('✅ OneSignal initialized successfully');
};

// ============================================
// USER IDENTIFICATION
// ============================================

/**
 * Set the external user ID to link OneSignal with your backend user
 * Call this after user logs in
 * @param userId - Your backend user ID
 */
export const setOneSignalUserId = (userId: string): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;
  
  OneSignal.login(userId);
  console.log('✅ OneSignal user ID set:', userId);
};

/**
 * Remove user ID when user logs out
 */
export const removeOneSignalUserId = (): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;
  
  OneSignal.logout();
  console.log('✅ OneSignal user logged out');
};

// ============================================
// TAGS (for segmentation)
// ============================================

/**
 * Set user tags for segmentation
 * Use tags to send targeted notifications (e.g., by role, preferences)
 * @param tags - Key-value pairs for user segmentation
 */
export const setOneSignalTags = (tags: Record<string, string>): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;
  
  OneSignal.User.addTags(tags);
  console.log('✅ OneSignal tags set:', tags);
};

/**
 * Set user role tag for targeted notifications
 * @param role - User role (CUSTOMER, SALESMAN, ADMIN)
 */
export const setUserRoleTag = (role: 'CUSTOMER' | 'SALESMAN' | 'ADMIN'): void => {
  setOneSignalTags({ user_role: role });
};

/**
 * Remove specific tags
 * @param tagKeys - Array of tag keys to remove
 */
export const removeOneSignalTags = (tagKeys: string[]): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;
  
  OneSignal.User.removeTags(tagKeys);
  console.log('✅ OneSignal tags removed:', tagKeys);
};

// ============================================
// NOTIFICATION HANDLERS
// ============================================

/**
 * Set up notification event listeners
 * Call this in your root layout component
 */
export const setupNotificationHandlers = (
  onNotificationReceived?: (notification: any) => void,
  onNotificationOpened?: (notification: any) => void
): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;

  // Handle notification received while app is in foreground
  OneSignal.Notifications.addEventListener('foregroundWillDisplay', (event) => {
    console.log('📬 Notification received in foreground:', event.notification);
    
    // Display the notification (you can also suppress it)
    event.getNotification().display();
    
    if (onNotificationReceived) {
      onNotificationReceived(event.notification);
    }
  });

  // Handle notification click/open
  OneSignal.Notifications.addEventListener('click', (event) => {
    console.log('👆 Notification clicked:', event.notification);
    
    if (onNotificationOpened) {
      onNotificationOpened(event.notification);
    }
    
    // Handle deep linking based on notification data
    const data = event.notification.additionalData as any;
    if (data?.screen) {
      // Navigate to specific screen based on notification data
      // You can use expo-router here: router.push(data.screen)
      console.log('📱 Navigate to:', data.screen);
    }
  });

  console.log('✅ Notification handlers set up');
};

// ============================================
// PERMISSION HELPERS
// ============================================

/**
 * Check if notifications are enabled
 */
export const areNotificationsEnabled = async (): Promise<boolean> => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return false;
  
  const permission = await OneSignal.Notifications.getPermissionAsync();
  return permission;
};

/**
 * Request notification permission (useful for deferred permission request)
 */
export const requestNotificationPermission = (): void => {
  if (ONESIGNAL_APP_ID === 'YOUR_ONESIGNAL_APP_ID_HERE') return;
  
  OneSignal.Notifications.requestPermission(true);
};

// ============================================
// EXPORTS
// ============================================

export default {
  initialize: initializeOneSignal,
  setUserId: setOneSignalUserId,
  removeUserId: removeOneSignalUserId,
  setTags: setOneSignalTags,
  setUserRoleTag,
  removeTags: removeOneSignalTags,
  setupHandlers: setupNotificationHandlers,
  areEnabled: areNotificationsEnabled,
  requestPermission: requestNotificationPermission,
};
