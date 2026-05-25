import AsyncStorage from '@react-native-async-storage/async-storage';


const TOKEN_KEY = '@digifix_auth_token';
const USER_KEY = '@digifix_user_data';

/**
 * Web / Expo web often uses `blob:` URIs from the image picker. Those URLs are tied to the
 * current document session and break after Metro `--clear` or a full reload (ERR_FILE_NOT_FOUND).
 * Never restore them from AsyncStorage — fall back to the server `/uploads/...` avatar instead.
 */
export const isEphemeralWebAvatarUri = (uri: string | null | undefined): boolean => {
  if (uri == null || typeof uri !== 'string') return false;
  return uri.trim().startsWith('blob:');
};

export const stripEphemeralAvatarFromUser = (user: Record<string, any> | null): Record<string, any> | null => {
  if (!user || typeof user !== 'object') return user;
  const next = { ...user };
  let dirty = false;
  if (isEphemeralWebAvatarUri(next.avatar_local)) {
    next.avatar_local = null;
    dirty = true;
  }
  if (isEphemeralWebAvatarUri(next.avatar)) {
    next.avatar = null;
    dirty = true;
  }
  return dirty ? next : user;
};

// Save authentication token
export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error saving token:', error);
    throw error;
  }
};

// Get authentication token
export const getToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting token:', error);
    return null;
  }
};

// Remove authentication token
export const removeToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing token:', error);
    throw error;
  }
};

// Save user data
export const saveUser = async (user: any): Promise<void> => {
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user:', error);
    throw error;
  }
};

// Get user data
export const getUser = async (): Promise<any | null> => {
  try {
    const userData = await AsyncStorage.getItem(USER_KEY);
    if (!userData) return null;
    const parsed = JSON.parse(userData);
    const cleaned = stripEphemeralAvatarFromUser(parsed);
    if (cleaned !== parsed) {
      try {
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(cleaned));
      } catch {
        /* ignore persist errors */
      }
    }
    return cleaned;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

// Remove user data
export const removeUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing user:', error);
    throw error;
  }
};

// Clear all auth data (token + user cache) — called on logout
export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  } catch (error) {
    console.error('Error clearing auth data:', error);
    throw error;
  }
};

// ---------------------------------------------------------------------------
// Logout-safe user preferences (survive clearAuthData, scoped by email)
// Used to persist profile edits (name, phone) across logout/re-login when
// the backend is unavailable. Keyed by email so multiple users on one device
// never mix data.
// ---------------------------------------------------------------------------
const userPrefKey = (email: string) => `@digifix_prefs_${email.toLowerCase()}`;

export const saveUserPrefs = async (email: string, prefs: Record<string, any>): Promise<void> => {
  try {
    const existing = await getUserPrefs(email);
    await AsyncStorage.setItem(userPrefKey(email), JSON.stringify({ ...existing, ...prefs }));
  } catch (error) {
    console.error('Error saving user prefs:', error);
  }
};

export const getUserPrefs = async (email: string): Promise<Record<string, any>> => {
  try {
    const raw = await AsyncStorage.getItem(userPrefKey(email));
    if (!raw) return {};
    let parsed = JSON.parse(raw);
    // Legacy: prefs must never store server `avatar` (only name/phone/avatar_local).
    if (parsed && typeof parsed === 'object' && 'avatar' in parsed) {
      const { avatar: _removed, ...rest } = parsed;
      parsed = rest;
      await AsyncStorage.setItem(userPrefKey(email), JSON.stringify(parsed));
    }
    if (parsed && typeof parsed === 'object' && isEphemeralWebAvatarUri(parsed.avatar_local)) {
      const next = { ...parsed, avatar_local: null };
      await AsyncStorage.setItem(userPrefKey(email), JSON.stringify(next));
      return next;
    }
    return parsed;
  } catch (error) {
    console.error('Error getting user prefs:', error);
    return {};
  }
};

export const clearUserPrefs = async (email: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(userPrefKey(email));
  } catch (error) {
    console.error('Error clearing user prefs:', error);
  }
};

/** Only these prefs may overlay the server user — never spread full prefs (legacy data could include `avatar` and wipe the real photo). */
const PREFS_OVERLAY_KEYS = ['name', 'phone', 'avatar_local'] as const;

/**
 * Merge backend user with logout-safe prefs. Local prefs overlay the server
 * for name/phone/avatar_local only; the server's `avatar` must never be
 * overwritten by stray keys in prefs.
 */
export const mergeServerUserAndPrefs = (
  serverUser: Record<string, any>,
  prefs: Record<string, any>
): Record<string, any> => {
  const overlay: Record<string, any> = {};
  for (const key of PREFS_OVERLAY_KEYS) {
    if (prefs && Object.prototype.hasOwnProperty.call(prefs, key)) {
      if (key === 'avatar_local' && isEphemeralWebAvatarUri(prefs[key])) {
        continue;
      }
      overlay[key] = prefs[key];
    }
  }
  const merged: Record<string, any> = { ...serverUser, ...overlay };
  if (serverUser?.avatar) {
    merged.avatar = serverUser.avatar;
    merged.avatar_local = null;
  } else if (serverUser && Object.prototype.hasOwnProperty.call(serverUser, 'avatar')) {
    merged.avatar = serverUser.avatar;
  }
  return merged;
};
