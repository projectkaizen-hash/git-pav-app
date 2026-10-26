// Shapes and helpers for the app appointments and audit log screens. The
// backend decides which status changes are allowed and refunds the deposit on
// a cancel; these only build requests and the words staff see.

export const APPOINTMENT_STATUSES = [
  "draft_hold",
  "confirmed",
  "in_progress",
  "completed",
  "no_show",
  "cancelled",
] as const;
export const APPOINTMENT_CHANNELS = ["clinic", "van", "video"] as const;
export const APPOINTMENTS_PAGE_SIZE = 25;
export const AUDIT_PAGE_SIZE = 50;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
export type AppointmentChannel = (typeof APPOINTMENT_CHANNELS)[number];

export interface AppAppointment {
  id: string;
  patientId: string;
  patientName: string;
  dependantName: string | null;
  clinicianName: string | null;
  serviceName: string;
  channel: AppointmentChannel;
  placeName: string | null;
  startTimeUtc: string;
  endTimeUtc: string;
  status: AppointmentStatus;
  allowedStatuses: AppointmentStatus[];
  totalPricePence: number;
  depositPaidPence: number;
}

export interface AuditEntry {
  id: string;
  action: string;
  actorEmail: string | null;
  actorRole: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  timestampUtc: string;
  archived: boolean;
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  draft_hold: "Held, not paid",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  no_show: "Didn't attend",
  cancelled: "Cancelled",
};

export const CHANNEL_LABELS: Record<AppointmentChannel, string> = {
  clinic: "Clinic",
  van: "Van visit",
  video: "Video call",
};

export interface AppointmentFilters {
  status: AppointmentStatus | "";
  channel: AppointmentChannel | "";
  from: string;
  to: string;
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The proxy path for one page of appointments; empty or malformed filters are left out. */
export function appointmentsPath(filters: AppointmentFilters, page = 1): string {
  const query = new URLSearchParams({
    page: String(Math.max(1, Math.floor(page))),
    limit: String(APPOINTMENTS_PAGE_SIZE),
  });
  if (filters.status) query.set("status", filters.status);
  if (filters.channel) query.set("channel", filters.channel);
  if (DAY.test(filters.from)) query.set("from", filters.from);
  if (DAY.test(filters.to)) query.set("to", filters.to);
  return `appointments?${query}`;
}

/** The proxy path for one page of the audit log. */
export function auditPath(filters: { action: string; resourceId: string }, page = 1): string {
  const query = new URLSearchParams({ page: String(Math.max(1, Math.floor(page))), limit: String(AUDIT_PAGE_SIZE) });
  const action = filters.action.trim().toLowerCase();
  const resourceId = filters.resourceId.trim();
  if (/^[a-z_.]{1,80}$/.test(action)) query.set("action", action);
  if (resourceId) query.set("resourceId", resourceId.slice(0, 100));
  return `audit-logs?${query}`;
}

export const pageCount = (total: number, pageSize: number) => Math.max(1, Math.ceil(total / pageSize));

const pounds = (pence: number) => `£${(pence / 100).toFixed(2)}`;

/** What staff confirm before a status change. Cancelling says whether a deposit goes back. */
export function statusChangeQuestion(appointment: AppAppointment, to: AppointmentStatus): string {
  const who = appointment.dependantName
    ? `${appointment.dependantName} (booked by ${appointment.patientName})`
    : appointment.patientName;
  const base = `Mark ${who}'s ${appointment.serviceName} as "${STATUS_LABELS[to]}"?`;
  if (to === "cancelled") {
    const refund =
      appointment.depositPaidPence > 0
        ? ` The ${pounds(appointment.depositPaidPence)} deposit is refunded to their card.`
        : " No deposit was paid, so nothing is refunded.";
    return `${base}${refund} The patient isn't told automatically, so let them know. This can't be undone.`;
  }
  if (to === "completed") return `${base} Their reward points are added. This can't be undone.`;
  if (to === "no_show") return `${base} This can't be undone.`;
  return base;
}

/** One line for an audit entry's details, without the request noise. */
export function auditDetails(entry: AuditEntry): string {
  const meta = entry.metadata ?? {};
  if (typeof meta.fromStatus === "string" && typeof meta.toStatus === "string") {
    const from = STATUS_LABELS[meta.fromStatus as AppointmentStatus] ?? meta.fromStatus;
    const to = STATUS_LABELS[meta.toStatus as AppointmentStatus] ?? meta.toStatus;
    return `${from} → ${to}`;
  }
  const parts: string[] = [];
  if (typeof meta.outcome === "string") parts.push(meta.outcome);
  if (typeof meta.statusCode === "number") parts.push(String(meta.statusCode));
  const shown = new Set(["outcome", "statusCode", "requestId", "method", "path"]);
  for (const [key, value] of Object.entries(meta)) {
    if (shown.has(key) || value === null || typeof value === "object") continue;
    parts.push(`${key}: ${String(value)}`);
  }
  return parts.join(" · ");
}
