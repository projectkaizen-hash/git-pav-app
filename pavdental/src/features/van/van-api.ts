import { authFetch } from "../auth/auth-api";
import {
  VanShift,
  VanServiceRequest,
  VanAvailability,
  VanAccessDetails,
  VanStopPhase,
} from "./van-types";

// ─── Patient endpoints ────────────────────────────────────────────────────────

/** Check live van availability and ETA for a GPS point */
export async function fetchVanAvailability(lat: number, lng: number): Promise<VanAvailability> {
  const res = await authFetch(`/api/van/availability?lat=${lat}&lng=${lng}`);
  if (!res.ok) throw new Error("Could not check van availability");
  return res.json();
}

/** Create a new van visit request */
export async function createVanRequest(data: {
  serviceId: string;
  accessDetails: VanAccessDetails;
}): Promise<VanServiceRequest & { etaLabel?: string }> {
  const res = await authFetch("/api/van/requests", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not request van visit");
  }
  return res.json();
}

/** Fetch a van request by ID (for live tracking) */
export async function fetchVanRequest(id: string): Promise<VanServiceRequest> {
  const res = await authFetch(`/api/van/requests/${id}`);
  if (!res.ok) throw new Error("Could not load van request");
  return res.json();
}

/** Fetch patient's currently active van request */
export async function fetchActiveVanRequest(): Promise<VanServiceRequest | null> {
  const res = await authFetch("/api/van/requests/mine/active");
  if (!res.ok) throw new Error("Could not load active request");
  return res.json();
}

/** Cancel a van request */
export async function cancelVanRequest(id: string): Promise<VanServiceRequest> {
  const res = await authFetch(`/api/van/requests/${id}/cancel`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not cancel request");
  }
  return res.json();
}

// ─── Operator endpoints ───────────────────────────────────────────────────────

/** Start van shift (put van online) */
export async function startShift(location?: {
  lat?: number;
  lng?: number;
  accuracyM?: number;
}): Promise<VanShift> {
  const res = await authFetch("/api/van/shift/start", {
    method: "POST",
    body: JSON.stringify(location ?? {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not start shift");
  }
  return res.json();
}

/** Pause accepting new requests */
export async function pauseShift(): Promise<VanShift> {
  const res = await authFetch("/api/van/shift/pause", { method: "POST" });
  if (!res.ok) throw new Error("Could not pause shift");
  return res.json();
}

/** Resume accepting new requests */
export async function resumeShift(): Promise<VanShift> {
  const res = await authFetch("/api/van/shift/resume", { method: "POST" });
  if (!res.ok) throw new Error("Could not resume shift");
  return res.json();
}

/** End van shift (blocks if stops remain open) */
export async function endShift(): Promise<VanShift> {
  const res = await authFetch("/api/van/shift/end", { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not end shift");
  }
  return res.json();
}

/** Send GPS location ping */
export async function sendLocationPing(data: {
  lat: number;
  lng: number;
  accuracyM?: number;
}): Promise<void> {
  const res = await authFetch("/api/van/shift/location", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Could not send location ping");
}

/** Get operator dashboard data (shift, van, queue, incoming) */
export async function fetchCurrentShift(): Promise<{
  shift: VanShift | null;
  van?: { name: string; registrationPlate: string };
  queue?: VanServiceRequest[];
  incoming?: VanServiceRequest[];
}> {
  const res = await authFetch("/api/van/shift/current");
  if (!res.ok) throw new Error("Could not load current shift");
  return res.json();
}

/** Accept an incoming request */
export async function acceptRequest(id: string): Promise<VanServiceRequest> {
  const res = await authFetch(`/api/van/requests/${id}/accept`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not accept request");
  }
  return res.json();
}

/** Decline an incoming request */
export async function declineRequest(id: string): Promise<VanServiceRequest> {
  const res = await authFetch(`/api/van/requests/${id}/decline`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not decline request");
  }
  return res.json();
}

/** Advance stop phase */
export async function updatePhase(
  id: string,
  phase: VanStopPhase | "no_show",
  notes?: string
): Promise<VanServiceRequest> {
  const res = await authFetch(`/api/van/requests/${id}/phase`, {
    method: "POST",
    body: JSON.stringify({ phase, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || err.error || "Could not update phase");
  }
  return res.json();
}

