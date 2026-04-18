import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const initializeOneSignal = (): void => {};
export const setOneSignalUserId = (userId: string): void => {};
export const removeOneSignalUserId = (): void => {};
export const setOneSignalTags = (tags: Record<string, string>): void => {};
export const setUserRoleTag = (role: 'CUSTOMER' | 'SALESMAN' | 'ADMIN'): void => {};
export const removeOneSignalTags = (tagKeys: string[]): void => {};
export const setupNotificationHandlers = (
  onNotificationReceived?: (notification: any) => void,
  onNotificationOpened?: (notification: any) => void
): void => {};
export const areNotificationsEnabled = async (): Promise<boolean> => false;
export const requestNotificationPermission = (): void => {};

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
