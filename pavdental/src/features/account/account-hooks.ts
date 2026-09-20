import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { accountApi, PaymentMethodItem, DependantItem } from "./account-api";
import { useAuthStore } from "../auth/auth-store";

export function useChangePasswordMutation() {
  return useMutation({
    mutationFn: async ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => {
      return accountApi.changePassword(currentPassword, newPassword);
    },
  });
}

export function useDeleteAccountMutation() {
  const clearAuth = useAuthStore((s) => s.clearAuth);

  return useMutation({
    mutationFn: async (params?: { reason?: string; confirmPassword?: string }) => {
      return accountApi.deleteAccount(params?.reason, params?.confirmPassword);
    },
    onSuccess: () => {
      clearAuth();
    },
  });
}

export function useResendVerificationMutation() {
  return useMutation({
    mutationFn: async () => {
      return accountApi.resendVerificationEmail();
    },
  });
}

export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: accountApi.getPaymentMethods,
  });
}

export function useAddPaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (card: Omit<PaymentMethodItem, "id" | "isDefault">) =>
      accountApi.addPaymentMethod(card),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}

export function useRemovePaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountApi.removePaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}

export function useSetDefaultPaymentMethodMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountApi.setDefaultPaymentMethod(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}

export function useDependants() {
  return useQuery({
    queryKey: ["patient-dependants"],
    queryFn: accountApi.getDependants,
  });
}

export function useAddDependantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<DependantItem, "id">) => accountApi.addDependant(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dependants"] });
    },
  });
}

export function useRemoveDependantMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accountApi.removeDependant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-dependants"] });
    },
  });
}

