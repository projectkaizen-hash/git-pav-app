import { authFetch } from "../auth/auth-api";

export interface PaymentMethodItem {
  id: string;
  brand: "visa" | "mastercard" | "amex" | "apple_pay" | "google_pay";
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface DependantItem {
  id: string;
  firstName: string;
  lastName: string;
  dob: string;
  relationship: "Son" | "Daughter" | "Ward" | "Other";
  consentSigned: boolean;
}

// In-memory / mock storage fallbacks when backend mocks are active
let mockPaymentMethods: PaymentMethodItem[] = [
  {
    id: "pm_mock_visa_4242",
    brand: "visa",
    last4: "4242",
    expMonth: 12,
    expYear: 2028,
    isDefault: true,
  },
  {
    id: "pm_mock_mc_5555",
    brand: "mastercard",
    last4: "5555",
    expMonth: 8,
    expYear: 2027,
    isDefault: false,
  },
];

let mockDependants: DependantItem[] = [
  {
    id: "dep_child_1",
    firstName: "Oliver",
    lastName: "Jenkins",
    dob: "2018-04-12",
    relationship: "Son",
    consentSigned: true,
  },
];

export const accountApi = {
  changePassword: async (currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update password");
      }
      return res.json();
    } catch (error: any) {
      if (error?.message && !error.message.includes("404")) {
        throw error;
      }
      // Demo fallback success
      return { success: true, message: "Password updated successfully" };
    }
  },

  deleteAccount: async (reason?: string, confirmPassword?: string): Promise<{ success: boolean }> => {
    try {
      const res = await authFetch("/api/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ reason, confirmPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to soft-delete account");
      }
      return res.json();
    } catch (error: any) {
      if (error?.message && !error.message.includes("404")) {
        throw error;
      }
      // Demo fallback
      return { success: true };
    }
  },

  resendVerificationEmail: async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await authFetch("/api/auth/verify-email/resend", {
        method: "POST",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to send verification email");
      }
      return res.json();
    } catch {
      return { success: true, message: "Verification link sent to your email address" };
    }
  },

  getPaymentMethods: async (): Promise<PaymentMethodItem[]> => {
    try {
      const res = await authFetch("/api/payments/methods");
      if (res.ok) return res.json();
    } catch {
      // Fallback
    }
    return [...mockPaymentMethods];
  },

  addPaymentMethod: async (card: Omit<PaymentMethodItem, "id" | "isDefault">): Promise<PaymentMethodItem> => {
    const newMethod: PaymentMethodItem = {
      id: `pm_${Date.now()}`,
      ...card,
      isDefault: mockPaymentMethods.length === 0,
    };
    mockPaymentMethods.push(newMethod);
    return newMethod;
  },

  removePaymentMethod: async (id: string): Promise<void> => {
    try {
      const res = await authFetch(`/api/payments/methods/${id}`, { method: "DELETE" });
      if (res.ok || res.status === 404) return; // 404 = already gone
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error ?? "Failed to remove payment method");
    } catch (error: any) {
      if (error?.message?.includes("404") || error?.message?.includes("Network")) {
        // Fallback: mutate mock array
        mockPaymentMethods = mockPaymentMethods.filter((pm) => pm.id !== id);
        return;
      }
      throw error;
    }
  },

  setDefaultPaymentMethod: async (id: string): Promise<void> => {
    try {
      const res = await authFetch(`/api/payments/methods/${id}/default`, { method: "PATCH" });
      if (res.ok) return;
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error ?? "Failed to set default");
    } catch (error: any) {
      if (error?.message?.includes("404") || error?.message?.includes("Network")) {
        // Fallback: mutate mock array
        mockPaymentMethods = mockPaymentMethods.map((pm) => ({
          ...pm,
          isDefault: pm.id === id,
        }));
        return;
      }
      throw error;
    }
  },

  // ── Stripe SetupIntent for saving a card ──────────────────────────────────
  createSetupIntent: async (): Promise<{ clientSecret: string }> => {
    try {
      const res = await authFetch("/api/payments/setup-intent", { method: "POST" });
      if (res.ok) return res.json();
    } catch {
      // Fallback
    }
    // Dev/mock fallback — Stripe SDK will reject this but UI won't crash
    return { clientSecret: `seti_mock_${Date.now()}_secret_mock` };
  },

  attachPaymentMethod: async (paymentMethodId: string): Promise<void> => {
    try {
      const res = await authFetch("/api/payments/methods/attach", {
        method: "POST",
        body: JSON.stringify({ paymentMethodId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error ?? "Failed to save payment method");
      }
    } catch (error: any) {
      // If backend returns 404 (endpoint not yet wired), treat as silent success
      if (!error?.message?.includes("404")) throw error;
    }
  },

  getDependants: async (): Promise<DependantItem[]> => {
    try {
      const res = await authFetch("/api/patients/dependants");
      if (res.ok) return res.json();
    } catch {
      // Fallback
    }
    return [...mockDependants];
  },

  addDependant: async (dependant: Omit<DependantItem, "id">): Promise<DependantItem> => {
    const newDep: DependantItem = {
      id: `dep_${Date.now()}`,
      ...dependant,
    };
    mockDependants.push(newDep);
    return newDep;
  },

  removeDependant: async (id: string): Promise<void> => {
    mockDependants = mockDependants.filter((d) => d.id !== id);
  },
};

