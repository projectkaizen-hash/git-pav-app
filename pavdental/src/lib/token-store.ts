import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// ─── SecureStore key constants ────────────────────────────────────────────────
// NEVER store access tokens here — they live in memory only.
// Only the rotating refresh token and biometric-flag are stored here.
const REFRESH_TOKEN_KEY = "pav_refresh_token";
export const BIOMETRIC_LOCK_KEY = "pavdental_biometric_app_lock_enabled";
const SESSION_ID_KEY = "pav_session_id";

const isWeb = Platform.OS === "web";

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  return SecureStore.setItemAsync(key, value, options);
}

async function deleteItem(key: string): Promise<void> {
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  // Refresh token — persisted, rotated on every use
  getRefreshToken: () => getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    setItem(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  deleteRefreshToken: () => deleteItem(REFRESH_TOKEN_KEY),

  // Biometric preference
  getBiometricEnabled: async () => {
    const val = await getItem(BIOMETRIC_LOCK_KEY);
    return val === "true";
  },
  setBiometricEnabled: (enabled: boolean) =>
    setItem(BIOMETRIC_LOCK_KEY, String(enabled)),

  // Session ID (for the current device session, used in audit logs)
  getSessionId: () => getItem(SESSION_ID_KEY),
  setSessionId: (id: string) =>
    setItem(SESSION_ID_KEY, id),
  deleteSessionId: () => deleteItem(SESSION_ID_KEY),
};

