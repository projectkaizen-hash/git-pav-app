import { create } from 'zustand';
import * as LocalAuthentication from 'expo-local-authentication';

interface AppLockState {
  isLocked: boolean;
  backgroundedAt: number | null;
  lockTimeoutMs: number; // Time in background before lock is required
  requiresBiometric: boolean;

  lock: () => void;
  unlock: () => Promise<boolean>;
  checkLockRequired: () => boolean;
  setBackgrounded: () => void;
  setForegrounded: () => void;
}

export const useAppLockStore = create<AppLockState>((set, get) => ({
  isLocked: false,
  backgroundedAt: null,
  lockTimeoutMs: 60 * 1000, // 1 minute default
  requiresBiometric: true,

  lock: () => set({ isLocked: true }),

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
    const { backgroundedAt, lockTimeoutMs } = get();
    
    // If never backgrounded, no lock required
    if (!backgroundedAt) return false;
    
    // If backgrounded for longer than timeout, lock required
    const timeInBackground = Date.now() - backgroundedAt;
    return timeInBackground > lockTimeoutMs;
  },

  setBackgrounded: () => set({ backgroundedAt: Date.now() }),

  setForegrounded: () => {
    const { backgroundedAt, lockTimeoutMs } = get();
    
    // If backgrounded for longer than timeout, lock required
    if (backgroundedAt) {
      const timeInBackground = Date.now() - backgroundedAt;
      if (timeInBackground > lockTimeoutMs) {
        set({ isLocked: true });
      }
    }
    
    set({ backgroundedAt: null });
  },
}));
