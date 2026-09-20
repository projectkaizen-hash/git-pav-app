// ─── Auth Zustand store ───────────────────────────────────────────────────────
// Access token lives ONLY in memory (this store) — never in SecureStore.
// Refresh token lives in SecureStore (see lib/token-store.ts).
import { create } from "zustand";

export type UserRole = "patient" | "clinician" | "operator" | "admin";

export interface AuthUser {
  id: string;
  sub: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  isMfaEnabled: boolean;
  mfaEnabled: boolean;
  profileId?: string;
}

interface AuthState {
  // Access token — in memory only (15-min lifetime, never persisted)
  accessToken: string | null;
  user: AuthUser | null;
  // true while SecureStore / token hydration is in progress at app start
  isHydrating: boolean;
  // true when the user has passed the biometric gate this session
  biometricUnlocked: boolean;

  // Actions
  setAuth: (token: string, user: AuthUser) => void;
  clearAuth: () => void;
  setHydrating: (hydrating: boolean) => void;
  setBiometricUnlocked: (unlocked: boolean) => void;
  updateUser: (patch: Partial<AuthUser>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  user: null,
  isHydrating: true,
  biometricUnlocked: false,

  setAuth: (token, user) =>
    set({ accessToken: token, user, isHydrating: false }),

  clearAuth: () =>
    set({
      accessToken: null,
      user: null,
      biometricUnlocked: false,
      isHydrating: false,
    }),

  setHydrating: (isHydrating) => set({ isHydrating }),

  setBiometricUnlocked: (biometricUnlocked) => set({ biometricUnlocked }),

  updateUser: (patch) =>
    set((state) =>
      state.user ? { user: { ...state.user, ...patch } } : state
    ),
}));

// ─── Derived selectors ────────────────────────────────────────────────────────
export const useIsAuthenticated = () =>
  useAuthStore((s) => !!s.accessToken && !!s.user);

export const useCurrentUser = () => useAuthStore((s) => s.user);

export const useUserRole = () => useAuthStore((s) => s.user?.role ?? null);

export const useAccessToken = () => useAuthStore((s) => s.accessToken);

