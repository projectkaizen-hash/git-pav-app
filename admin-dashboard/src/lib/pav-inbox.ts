// Staff inbox for patient messages (CS-29). The threads live in the app
// backend; the dashboard reads and answers them through /api/v1/admin/app.

export type RecipientType = "practice" | "care_team" | "clinician";

export interface InboxMessage {
  id: string;
  senderRole: string;
  senderName: string;
  body: string;
  sentAtIso: string;
}

export interface InboxThread {
  id: string;
  from: string;
  subject: string;
  preview: string;
  sentAtIso: string;
  isRead: boolean;
  recipientType: RecipientType;
  patientName: string;
  messages: InboxMessage[];
}

export const INBOX_FILTERS = [
  { value: "practice", label: "Practice" },
  { value: "all", label: "All threads" },
] as const;
export type InboxFilter = (typeof INBOX_FILTERS)[number]["value"];

export const PAGE_SIZE = 25;
export const REPLY_MAX = 4000;

/** The backend path for one page of threads. */
export function inboxPath(filter: InboxFilter, offset = 0): string {
  const query = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(Math.max(0, offset)) });
  if (filter !== "all") query.set("recipientType", filter);
  return `messages?${query}`;
}

/** The reply body to send, or null when it is empty or too long. */
export function replyPayload(text: string): { body: string } | null {
  const body = text.trim();
  if (!body || body.length > REPLY_MAX) return null;
  return { body };
}

export const RECIPIENT_LABELS: Record<RecipientType, string> = {
  practice: "Practice",
  care_team: "Care team",
  clinician: "Clinician",
};
