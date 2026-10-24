let Platform: any = { OS: "web" };
try {
  Platform = require("react-native").Platform ?? require("react-native-web").Platform;
} catch {
  try {
    Platform = require("react-native-web").Platform;
  } catch {}
}

let SecureStore: any = null;
try {
  SecureStore = require("expo-secure-store");
} catch {}

// ─── SecureStore key constants ────────────────────────────────────────────────
// NEVER store access tokens here — they live in memory only.
// Only the rotating refresh token and biometric-flag are stored here.
const REFRESH_TOKEN_KEY = "pav_refresh_token";
export const BIOMETRIC_LOCK_KEY = "pavdental_biometric_app_lock_enabled";
const SESSION_ID_KEY = "pav_session_id";

const isWeb = Platform.OS === "web";
const memoryStore = new Map<string, string>();

async function getItem(key: string): Promise<string | null> {
  if (isWeb) {
    try {
      return typeof window !== "undefined" ? window.localStorage.getItem(key) : memoryStore.get(key) ?? null;
    } catch {
      return memoryStore.get(key) ?? null;
    }
  }
  if (!SecureStore?.getItemAsync) {
    return memoryStore.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string, options?: any): Promise<void> {
  memoryStore.set(key, value);
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  if (!SecureStore?.setItemAsync) return;
  return SecureStore.setItemAsync(key, value, options);
}

async function deleteItem(key: string): Promise<void> {
  memoryStore.delete(key);
  if (isWeb) {
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  if (!SecureStore?.deleteItemAsync) return;
  return SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  // Refresh token — persisted, rotated on every use
  getRefreshToken: () => getItem(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    setItem(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore?.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
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
