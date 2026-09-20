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

