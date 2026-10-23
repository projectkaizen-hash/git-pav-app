// Shapes and helpers for the opening hours and rota screens. The app stores
// times as minutes after midnight, UK time, and weekdays as 0 = Sunday.

export const APP_API = "/api/v1/admin/app";

// Monday first, as staff read a week.
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const;
export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface OutsideHoursVisit {
  id: string;
  clinicianId: string | null;
  clinicId: string | null;
  channel: string;
  startTimeUtc: string;
}

export interface Clinic {
  id: string;
  name: string;
  city: string | null;
  isActive: boolean;
  openingHours: { weekday: number; opensMinute: number; closesMinute: number }[];
  closures: { date: string; reason: string | null }[];
}

export interface RotaBlock {
  weekday: number;
  startMinute: number;
  endMinute: number;
  clinicId: string | null;
}

export interface Clinician {
  id: string;
  fullName: string;
  roleTitle: string | null;
  rota: RotaBlock[];
}

export interface RotaOverride {
  date: string;
  working: boolean;
  startMinute: number | null;
  endMinute: number | null;
  clinicId: string | null;
  reason: string | null;
}

export const toTime = (minute: number) =>
  `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;

export const toMinute = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const ukDateTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export const ukDate = (date: string) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const todayInUk = () => new Date().toLocaleDateString("en-CA", { timeZone: "Europe/London" });

/** Sends a request to the app backend through the dashboard; throws the backend's message on failure. */
export async function appRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${APP_API}/${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? "Something went wrong");
  return body as T;
}

export interface ErasureRequest {
  id: string;
  source: "account_deletion" | "patient_request";
  status: "pending" | "completed" | "rejected";
  reason: string | null;
  requestedAt: string;
  dueAt: string;
  daysLeft: number;
  overdue: boolean;
  completedAt: string | null;
  outcomeNote: string | null;
  patient: { userId: string; name: string | null; email: string | null; retainUntil: string | null };
  upcomingBookings: number;
}
