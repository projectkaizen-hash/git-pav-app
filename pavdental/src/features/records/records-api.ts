import { authFetch } from "../auth/auth-api";

// ─── Odontogram ───────────────────────────────────────────────────────────────
export async function fetchOdontogram(userId: string) {
  const res = await authFetch(`/api/patients/${userId}/odontogram`);
  if (!res.ok) throw new Error("Could not load odontogram");
  return res.json();
}

export async function updateOdontogram(
  userId: string,
  teeth: {
    toothNumber: number;
    arch: string;
    quadrant: string;
    condition: string;
    notes?: string;
  }[]
) {
  const res = await authFetch(`/api/patients/${userId}/odontogram`, {
    method: "PUT",
    body: JSON.stringify({ teeth }),
  });
  if (!res.ok) throw new Error("Could not save odontogram");
  return res.json();
}

// ─── Treatment Plans ──────────────────────────────────────────────────────────
export async function fetchTreatmentPlans(userId: string) {
  const res = await authFetch(`/api/patients/${userId}/plans`);
  if (!res.ok) throw new Error("Could not load treatment plans");
  return res.json();
}

export async function createTreatmentPlan(
  userId: string,
  plan: {
    title: string;
    items: { code: string; description: string; toothNumber?: number; costPence: number }[];
  }
) {
  const res = await authFetch(`/api/patients/${userId}/plans`, {
    method: "POST",
    body: JSON.stringify(plan),
  });
  if (!res.ok) throw new Error("Could not create treatment plan");
  return res.json();
}

export async function signTreatmentPlan(
  userId: string,
  planId: string,
  payload: { signerName: string; consentConfirmed: true; signatureData?: string }
) {
  const res = await authFetch(`/api/patients/${userId}/plans/${planId}/sign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not sign treatment plan");
  }
  return res.json();
}

export async function declineTreatmentPlan(userId: string, planId: string) {
  const res = await authFetch(`/api/patients/${userId}/plans/${planId}/decline`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not decline treatment plan");
  }
  return res.json();
}

// ─── Prescriptions ────────────────────────────────────────────────────────────
export async function fetchPatientPrescriptions(userId: string) {
  const res = await authFetch(`/api/prescriptions/patient/${userId}`);
  if (!res.ok) throw new Error("Could not load prescriptions");
  return res.json();
}

// ─── Patient Profile ──────────────────────────────────────────────────────────
export async function fetchPatientProfile(userId: string) {
  const res = await authFetch(`/api/patients/${userId}/profile`);
  if (!res.ok) throw new Error("Could not load profile");
  return res.json();
}

export async function updatePatientProfile(userId: string, data: Record<string, unknown>) {
  const res = await authFetch(`/api/patients/${userId}/profile`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Could not save profile");
  return res.json();
}

// ─── Document Vault ───────────────────────────────────────────────────────────
export async function fetchDocuments(userId: string) {
  const res = await authFetch(`/api/patients/${userId}/documents`);
  if (!res.ok) throw new Error("Could not load documents");
  return res.json();
}

// ─── Clinical Care Messaging ──────────────────────────────────────────────────
export async function fetchMessageThreads() {
  const res = await authFetch("/api/messages");
  if (!res.ok) throw new Error("Could not load message threads");
  return res.json();
}

export async function createMessageThread(payload: {
  subject: string;
  body: string;
  clinicianRole?: string;
  clinicianName?: string;
}) {
  const res = await authFetch("/api/messages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Could not create message thread");
  return res.json();
}

export async function replyToMessageThread(threadId: string, body: string) {
  const res = await authFetch(`/api/messages/${threadId}/reply`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error("Could not send message reply");
  return res.json();
}

export async function markMessageThreadRead(threadId: string) {
  const res = await authFetch(`/api/messages/${threadId}/read`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Could not mark thread read");
  return res.json();
}

// ─── Payment plans ───────────────────────────────────────────────────────────
// The app links to the practice's finance page; it makes no credit decisions.
export async function fetchFinancing(): Promise<{ financeInfoUrl: string }> {
  const res = await authFetch("/api/financing");
  if (!res.ok) throw new Error("Could not load payment plan details");
  return res.json();
}

// ─── Rewards & Oral Health Insights ───────────────────────────────────────────
export async function fetchRewards() {
  const res = await authFetch("/api/rewards");
  if (!res.ok) throw new Error("Could not load rewards");
  return res.json();
}

export async function redeemReward(payload: { rewardId: string }) {
  const res = await authFetch("/api/rewards/redeem", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Could not redeem perk");
  }
  return res.json();
}

export async function fetchOralHealthInsights() {
  const res = await authFetch("/api/rewards/insights");
  if (!res.ok) throw new Error("Could not load oral health insights");
  return res.json();
}

export async function logBrushingSession(payload: {
  day?: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  session: "am" | "pm";
  durationSec: number;
}) {
  const res = await authFetch("/api/rewards/brushing-log", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Could not log brushing session");
  return res.json();
}

// ─── Check-in & GDPR SAR ──────────────────────────────────────────────────────
export type CheckInTask = "form" | "consent" | "insurance" | "balance";

export async function completeAppointmentCheckIn(
  appointmentId: string,
  payload: { completedTasks: CheckInTask[] }
) {
  const res = await authFetch(`/api/booking/appointments/${appointmentId}/check-in`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Could not complete pre-visit check-in");
  return res.json();
}

export async function requestDataAccessExport(payload?: {
  reason?: string;
  format?: "json" | "csv";
}) {
  const res = await authFetch("/api/consents/data-access-request", {
    method: "POST",
    body: JSON.stringify(payload || { format: "json" }),
  });
  if (!res.ok) throw new Error("Could not generate GDPR data export");
  return res.json();
}
