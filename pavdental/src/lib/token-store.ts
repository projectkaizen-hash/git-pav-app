import * as SecureStore from "expo-secure-store";

// ─── SecureStore key constants ────────────────────────────────────────────────
// NEVER store access tokens here — they live in memory only.
// Only the rotating refresh token and biometric-flag are stored here.
const REFRESH_TOKEN_KEY = "pav_refresh_token";
const BIOMETRIC_ENABLED_KEY = "pav_biometric_enabled";
const SESSION_ID_KEY = "pav_session_id";

export const tokenStore = {
  // Refresh token — persisted, rotated on every use
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  setRefreshToken: (token: string) =>
    SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  deleteRefreshToken: () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),

  // Biometric preference
  getBiometricEnabled: async () => {
    const val = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return val === "true";
  },
  setBiometricEnabled: (enabled: boolean) =>
    SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, String(enabled)),

  // Session ID (for the current device session, used in audit logs)
  getSessionId: () => SecureStore.getItemAsync(SESSION_ID_KEY),
  setSessionId: (id: string) =>
    SecureStore.setItemAsync(SESSION_ID_KEY, id),
  deleteSessionId: () => SecureStore.deleteItemAsync(SESSION_ID_KEY),
};

