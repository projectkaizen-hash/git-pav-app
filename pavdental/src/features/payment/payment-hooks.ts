import React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAccessToken } from "../auth/auth-store";

const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3002";

interface PaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  publishableKey: string;
  isMock: boolean;
}

interface AppointmentConfirmation {
  id: string;
  status: string;
  depositPaidPence: number;
  message: string;
}

// Create payment intent for appointment deposit
export function useCreatePaymentIntent() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appointmentId: string) => {
      const response = await fetch(`${API_BASE}/api/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ appointmentId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create payment intent");
      }

      return response.json() as Promise<PaymentIntentResponse>;
    },
    onSuccess: () => {
      // Invalidate appointments query to refresh status
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

// Confirm appointment after successful payment
export function useConfirmAppointment() {
  const accessToken = useAccessToken();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appointmentId, stripePaymentId, depositPaidPence }: {
      appointmentId: string;
      stripePaymentId: string;
      depositPaidPence: number;
    }) => {
      const response = await fetch(`${API_BASE}/api/booking/appointments/${appointmentId}/confirm`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          stripePaymentId,
          depositPaidPence,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to confirm appointment");
      }

      return response.json() as Promise<AppointmentConfirmation>;
    },
    onSuccess: () => {
      // Invalidate appointments query to refresh status
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

// Poll appointment status to reconcile with webhook confirmation
export function useAppointmentStatus(appointmentId: string | null) {
  const accessToken = useAccessToken();

  return useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;

      const response = await fetch(`${API_BASE}/api/booking/appointments`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch appointment status");
      }

      const appointments = await response.json();
      return appointments.find((apt: any) => apt.id === appointmentId) || null;
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
  const confirmAppointment = useConfirmAppointment();
  const [paymentStatus, setPaymentStatus] = React.useState<"idle" | "processing" | "success" | "error">("idle");

  const initiatePayment = async (appointmentId: string) => {
    try {
      setPaymentStatus("processing");
      
      // Step 1: Create payment intent
      const paymentData = await createIntent.mutateAsync(appointmentId);
      
      // Step 2: Present Stripe PaymentSheet (to be implemented in component)
      // This will be handled by the component using StripePaymentSheet
      
      return paymentData;
    } catch (error) {
      setPaymentStatus("error");
      throw error;
    }
  };

  const completePayment = async (appointmentId: string, stripePaymentId: string, depositPaidPence: number) => {
    try {
      setPaymentStatus("processing");
      
      // Step 3: Confirm appointment with payment details
      await confirmAppointment.mutateAsync({
        appointmentId,
        stripePaymentId,
        depositPaidPence,
      });
      
      setPaymentStatus("success");
    } catch (error) {
      setPaymentStatus("error");
      throw error;
    }
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
