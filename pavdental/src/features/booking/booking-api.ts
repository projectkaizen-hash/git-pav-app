import { authFetch } from "../auth/auth-api";
import { DentalService, ClinicLocation, Clinician, TimeSlot } from "./booking-types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

// ─── Services ─────────────────────────────────────────────────────────────────
export async function fetchServices(): Promise<DentalService[]> {
  const res = await fetch(`${BASE_URL}/api/services`);
  if (!res.ok) throw new Error("Could not load services");
  return res.json();
}

// ─── Clinics ──────────────────────────────────────────────────────────────────
export async function fetchClinics(): Promise<ClinicLocation[]> {
  const res = await fetch(`${BASE_URL}/api/services/clinics`);
  if (!res.ok) throw new Error("Could not load clinics");
  return res.json();
}

// ─── Clinicians ───────────────────────────────────────────────────────────────
export async function fetchClinicians(channel?: string): Promise<Clinician[]> {
  const qs = channel ? `?channel=${channel}` : "";
  const res = await fetch(`${BASE_URL}/api/services/clinicians${qs}`);
  if (!res.ok) throw new Error("Could not load clinicians");
  return res.json();
}

// ─── Slots ────────────────────────────────────────────────────────────────────
export async function fetchSlots(params: {
  clinicianId?: string;
  serviceId?: string;
  date: string; // YYYY-MM-DD
  channel?: string;
}): Promise<TimeSlot[]> {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null)) as Record<string, string>
  ).toString();
  const res = await authFetch(`/api/booking/slots?${qs}`);
  if (!res.ok) throw new Error("Could not load slots");
  const raw: any[] = await res.json();

  // Normalise to TimeSlot shape
  return raw.map((s) => ({
    id: s.id,
    clinicianId: params.clinicianId ?? "",
    clinicId: "",
    startTimeUtc: s.startTimeUtc,
    endTimeUtc: s.endTimeUtc,
    displayTime: new Date(s.startTimeUtc).toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }),
    dateFormatted: new Date(s.startTimeUtc).toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      timeZone: "UTC",
    }),
    channel: params.channel as any ?? "clinic",
    isAvailable: s.available,
  }));
}

// ─── Hold Slot (Redis SET NX) ─────────────────────────────────────────────────
export async function holdSlot(slotId: string): Promise<{ holdExpiresAt: number }> {
  const res = await authFetch("/api/booking/hold-slot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slotId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Slot already taken");
  }
  return res.json();
}

// ─── Create Appointment ────────────────────────────────────────────────────────
export async function createAppointment(data: {
  serviceId: string;
  channel: string;
  clinicianId?: string;
  clinicId?: string;
  vanId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  slotId?: string;
  accessDetails?: Record<string, unknown>;
  triageData?: Record<string, unknown>;
}) {
  const res = await authFetch("/api/booking/appointments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Booking failed");
  }
  return res.json();
}

// ─── List Appointments ────────────────────────────────────────────────────────
export async function fetchMyAppointments() {
  const res = await authFetch("/api/booking/appointments");
  if (!res.ok) throw new Error("Could not load appointments");
  return res.json();
}

// ─── Payment intent ──────────────────────────────────────────────────────────
// Amount and confirmation are server-controlled; a verified Stripe webhook is
// the only path that changes an appointment to confirmed.
export async function createPaymentIntent(appointmentId: string) {
  const res = await authFetch("/api/payments/create-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ appointmentId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Could not prepare payment");
  }
  return res.json() as Promise<{
    clientSecret: string | null;
    paymentIntentId: string;
    publishableKey: string;
    isMock: boolean;
  }>;
}

// ─── Cancel Appointment ───────────────────────────────────────────────────────
export async function cancelAppointment(appointmentId: string) {
  const res = await authFetch(`/api/booking/appointments/${appointmentId}/cancel`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Cancellation failed");
  return res.json();
}

// ─── Van coverage check ────────────────────────────────────────────────────────
export async function checkVanCoverage(params: { lat?: number; lng?: number; postcode?: string }) {
  const res = await fetch(`${BASE_URL}/api/public/van/coverage-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Coverage check failed");
  }
  return res.json();
}

// ─── Helper: format pence to GBP ─────────────────────────────────────────────
export function formatGbp(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
