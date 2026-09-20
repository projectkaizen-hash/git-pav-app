import { tokenStore } from "@/lib/token-store";
import { useAuthStore } from "./auth-store";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── In-flight refresh de-duplication ────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

// ─── Core authenticated fetch with transparent refresh ───────────────────────
export async function authFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { accessToken } = useAuthStore.getState();
  const token = accessToken ?? (await ensureValidToken());

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...options.headers,
    },
  });

  if (res.status === 401) {
    try {
      const freshToken = await ensureValidToken(true);
      return fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${freshToken}`,
          ...options.headers,
        },
      });
    } catch {
      useAuthStore.getState().clearAuth();
      await tokenStore.deleteRefreshToken();
      throw new Error("Session expired. Please sign in again.");
    }
  }

  return res;
}

async function ensureValidToken(forceRefresh = false): Promise<string> {
  const { accessToken } = useAuthStore.getState();
  if (accessToken && !forceRefresh) return accessToken;

  if (!refreshPromise) {
    refreshPromise = doRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function doRefresh(): Promise<string> {
  const refreshToken = await tokenStore.getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await tokenStore.deleteRefreshToken();
    useAuthStore.getState().clearAuth();
    throw new Error("Refresh failed");
  }

  const data = await res.json();
  await tokenStore.setRefreshToken(data.refreshToken);
  useAuthStore.getState().setAuth(data.accessToken, data.user);
  return data.accessToken;
}

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone?: string
  ) => {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, firstName, lastName, phone }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Registration failed");
    }
    const data = await res.json();
    await tokenStore.setRefreshToken(data.refreshToken);
    useAuthStore.getState().setAuth(data.accessToken, data.user);
    return data;
  },

  signIn: async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Sign-in failed");
    }
    const data = await res.json();
    await tokenStore.setRefreshToken(data.refreshToken);
    useAuthStore.getState().setAuth(data.accessToken, data.user);
    return data;
  },

  signOut: async () => {
    try {
      await authFetch("/api/auth/logout", { method: "POST" });
    } finally {
      useAuthStore.getState().clearAuth();
      await tokenStore.deleteRefreshToken();
    }
  },

  requestPhoneOtp: async (phone: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/otp/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) throw new Error("Could not send OTP");
    return res.json();
  },

  verifyPhoneOtp: async (phone: string, code: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) throw new Error("Invalid or expired code");
    const data = await res.json();
    await tokenStore.setRefreshToken(data.refreshToken);
    useAuthStore.getState().setAuth(data.accessToken, data.user);
    return data;
  },

  forgotPassword: async (email: string) => {
    // Fire-and-forget — always 200 to prevent email enumeration
    await fetch(`${BASE_URL}/api/auth/password-reset/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  },

  resetPassword: async (token: string, password: string) => {
    const res = await fetch(`${BASE_URL}/api/auth/password-reset/confirm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, newPassword: password }),
    });
    if (!res.ok) throw new Error("Reset link expired or invalid");
    return res.json();
  },

  listSessions: async () => {
    const res = await authFetch("/api/auth/sessions");
    if (!res.ok) throw new Error("Could not fetch sessions");
    return res.json();
  },

  revokeSession: async (sessionId: string) => {
    const res = await authFetch(`/api/auth/sessions/${sessionId}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Could not revoke session");
  },

  refresh: async () => {
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) {
      await tokenStore.deleteRefreshToken();
      useAuthStore.getState().clearAuth();
      throw new Error("Refresh failed");
    }

    const data = await res.json();
    await tokenStore.setRefreshToken(data.refreshToken);
    useAuthStore.getState().setAuth(data.accessToken, data.user);
    return data;
  },
};
