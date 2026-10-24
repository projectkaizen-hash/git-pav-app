import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authFetch } from "../auth/auth-api";

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  isMock: boolean;
}

// Create payment intent for appointment deposit
export function useCreatePaymentIntent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await authFetch("/api/payments/create-intent", {
        method: "POST",
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to create payment intent");
      }

      return response.json() as Promise<PaymentIntentResponse>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
    },
  });
}

// Poll appointment status to reconcile with webhook confirmation (MA-1).
// Calls GET /api/booking/appointments/:id directly instead of downloading the entire list.
export function useAppointmentStatus(appointmentId: string | null) {
  return useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;

      const response = await authFetch(`/api/booking/appointments/${appointmentId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch appointment status");
      }

      return response.json();
    },
    enabled: !!appointmentId,
    refetchInterval: (query: any) => {
      // Poll every 3 seconds if appointment is in draft_hold status
      // Stop polling once confirmed or failed
      return query?.state?.data?.status === "draft_hold" ? 3000 : false;
    },
  });
}

// Combined hook for payment flow with Stripe PaymentSheet
export function usePaymentFlow() {
  const createIntent = useCreatePaymentIntent();
  const [paymentStatus, setPaymentStatus] = React.useState<"idle" | "processing" | "success" | "error">("idle");

  const initiatePayment = async (appointmentId: string) => {
    try {
      setPaymentStatus("processing");
      const paymentData = await createIntent.mutateAsync(appointmentId);
      return paymentData;
    } catch (error) {
      setPaymentStatus("error");
      throw error;
    }
  };

  const completePayment = async () => {
    // Webhook confirms the appointment; client reconciles via useAppointmentStatus
    setPaymentStatus("success");
  };

  return {
    initiatePayment,
    completePayment,
    paymentStatus,
    isProcessing: paymentStatus === "processing",
    isSuccess: paymentStatus === "success",
    isError: paymentStatus === "error",
    reset: () => setPaymentStatus("idle"),
  };
}
