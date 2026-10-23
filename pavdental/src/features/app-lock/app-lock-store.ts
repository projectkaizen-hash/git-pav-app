import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';
import { tokenStore } from '@/lib/token-store';

interface AppLockState {
  isLocked: boolean;
  backgroundedAt: number | null;
  lockTimeoutMs: number; // Time in background before lock is required
  requiresBiometric: boolean;

  lock: () => void;
  unlock: () => Promise<boolean>;
  setRequiresBiometric: (enabled: boolean) => void;
  hydrateBiometricPreference: () => Promise<void>;
  checkLockRequired: () => boolean;
  setBackgrounded: () => void;
  setForegrounded: () => void;
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  backgroundedAt: null,
  lockTimeoutMs: 60 * 1000, // 1 minute default
  requiresBiometric: false,

  lock: () => set({ isLocked: true }),

  setRequiresBiometric: (enabled: boolean) => set({ requiresBiometric: enabled }),

  hydrateBiometricPreference: async () => {
    try {
      const enabled = await tokenStore.getBiometricEnabled();
      set({ requiresBiometric: enabled });
    } catch {
      set({ requiresBiometric: false });
    }
  },

  unlock: async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        // Device doesn't support biometrics or not enrolled - auto-unlock
        set({ isLocked: false });
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access your health data',
        fallbackLabel: 'Use passcode',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (result.success) {
        set({ isLocked: false });
        return true;
      }

      return false;
    } catch (error) {
      console.error('[App Lock] Authentication error:', error);
      return false;
    }
  },

  checkLockRequired: () => {
    const { backgroundedAt, lockTimeoutMs, requiresBiometric } = get();
    if (!requiresBiometric || !backgroundedAt) return false;
    const timeInBackground = Date.now() - backgroundedAt;
    return timeInBackground > lockTimeoutMs;
  },

  setBackgrounded: () => set({ backgroundedAt: Date.now() }),

  setForegrounded: () => {
    const { backgroundedAt, lockTimeoutMs, requiresBiometric } = get();

    // If biometric lock is enabled and app was backgrounded longer than timeout, lock
    if (requiresBiometric && backgroundedAt) {
      const timeInBackground = Date.now() - backgroundedAt;
      if (timeInBackground > lockTimeoutMs) {
        set({ isLocked: true });
      }
    }

    set({ backgroundedAt: null });
  },
}));

// Hydrate stored biometric preference on module load
useAppLockStore.getState().hydrateBiometricPreference();
