import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchServices,
  fetchClinics,
  fetchClinicians,
  fetchSlots,
  fetchMyAppointments,
  holdSlot,
  createAppointment,
  cancelAppointment,
} from "../booking/booking-api";
import {
  fetchPatientProfile,
  updatePatientProfile,
  fetchOdontogram,
  updateOdontogram,
  fetchTreatmentPlans,
  createTreatmentPlan,
  fetchDocuments,
} from "../records/records-api";

// ─── Dental Catalogue Hooks ──────────────────────────────────────────────────
export function useServices() {
  return useQuery({
    queryKey: ["services"],
    queryFn: fetchServices,
    staleTime: 5 * 60 * 1000,
  });
}

export function useClinics() {
  return useQuery({
    queryKey: ["clinics"],
    queryFn: fetchClinics,
    staleTime: 10 * 60 * 1000,
  });
}

export function useClinicians(channel?: string) {
  return useQuery({
    queryKey: ["clinicians", channel],
    queryFn: () => fetchClinicians(channel),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Slot & Booking Hooks ─────────────────────────────────────────────────────
export function useSlots(params: {
  clinicianId?: string;
  serviceId?: string;
  date: string;
  channel?: string;
}) {
  return useQuery({
    queryKey: ["slots", params],
    queryFn: () => fetchSlots(params),
    enabled: !!params.date,
    refetchInterval: 30 * 1000, // refresh availability every 30s
  });
}

export function useMyAppointments() {
  return useQuery({
    queryKey: ["my-appointments"],
    queryFn: fetchMyAppointments,
  });
}

export function useHoldSlotMutation() {
  return useMutation({
    mutationFn: (slotId: string) => holdSlot(slotId),
  });
}

export function useCreateAppointmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createAppointment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

export function useCancelAppointmentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (appointmentId: string) => cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["slots"] });
    },
  });
}

// ─── Patient Profile & Clinical Records Hooks ─────────────────────────────────
export function usePatientProfile(userId: string) {
  return useQuery({
    queryKey: ["patient-profile", userId],
    queryFn: () => fetchPatientProfile(userId),
    enabled: !!userId,
  });
}

export function useUpdateProfileMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => updatePatientProfile(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile", userId] });
    },
  });
}

export function useOdontogram(userId: string) {
  return useQuery({
    queryKey: ["odontogram", userId],
    queryFn: () => fetchOdontogram(userId),
    enabled: !!userId,
  });
}

export function useUpdateOdontogramMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (teeth: any[]) => updateOdontogram(userId, teeth),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["odontogram", userId] });
    },
  });
}

export function useTreatmentPlans(userId: string) {
  return useQuery({
    queryKey: ["treatment-plans", userId],
    queryFn: () => fetchTreatmentPlans(userId),
    enabled: !!userId,
  });
}

export function useCreateTreatmentPlanMutation(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (plan: { title: string; items: any[] }) =>
      createTreatmentPlan(userId, plan),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treatment-plans", userId] });
    },
  });
}

export function useDocumentVault(userId: string) {
  return useQuery({
    queryKey: ["document-vault", userId],
    queryFn: () => fetchDocuments(userId),
    enabled: !!userId,
  });
}
