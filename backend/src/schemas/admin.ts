import { z } from "zod";

const uuid = z.string().uuid();
const role = z.enum(["patient", "clinician", "operator", "admin"]);
const appointmentStatus = z.enum(["draft_hold", "confirmed", "in_progress", "completed", "cancelled", "no_show"]);
const channel = z.enum(["clinic", "van", "video"]);

export const adminUsersQuerySchema = z.object({
  role: role.optional(),
  search: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const adminAppointmentsQuerySchema = z.object({
  status: appointmentStatus.optional(),
  channel: channel.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

export const appointmentIdParamsSchema = z.object({ id: uuid }).strict();

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatus,
}).strict();

export const adminAuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
}).strict();

// ─── Opening hours and rota (CS-30, CS-31) ──────────────────────────────────
// Times are minutes after midnight, UK time; weekday 0 = Sunday.
const minuteOfDay = z.number().int().min(0).max(1440);
const weekday = z.number().int().min(0).max(6);
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");

const block = <T extends z.ZodRawShape>(shape: T, start: string, end: string) =>
  z.object(shape).strict().refine((b: any) => b[start] < b[end], `${start} must be before ${end}`);

export const clinicHoursSchema = z.object({
  hours: z
    .array(block({ weekday, opensMinute: minuteOfDay, closesMinute: minuteOfDay }, "opensMinute", "closesMinute"))
    .max(7)
    .refine((rows) => new Set(rows.map((r) => r.weekday)).size === rows.length, "One row per weekday"),
}).strict();

export const clinicClosureSchema = z.object({
  date: calendarDate,
  reason: z.string().trim().min(1).max(200).optional(),
}).strict();

export const clinicianRotaSchema = z.object({
  blocks: z
    .array(block({ weekday, startMinute: minuteOfDay, endMinute: minuteOfDay, clinicId: uuid.nullable().optional() }, "startMinute", "endMinute"))
    .max(50)
    .refine((blocks) => {
      // Blocks on the same day can't overlap.
      const sorted = [...blocks].sort((a, b) => a.weekday - b.weekday || a.startMinute - b.startMinute);
      return sorted.every((b, i) => i === 0 || sorted[i - 1].weekday !== b.weekday || sorted[i - 1].endMinute <= b.startMinute);
    }, "Blocks on the same day overlap"),
}).strict();

export const rotaOverrideSchema = z.union([
  // Not working that day.
  z.object({ working: z.literal(false), reason: z.string().trim().min(1).max(200).optional() }).strict(),
  block(
    {
      working: z.literal(true),
      startMinute: minuteOfDay,
      endMinute: minuteOfDay,
      clinicId: uuid.nullable().optional(),
      reason: z.string().trim().min(1).max(200).optional(),
    },
    "startMinute",
    "endMinute"
  ),
]);

export const idParamsSchema = z.object({ id: uuid }).strict();
export const idDateParamsSchema = z.object({ id: uuid, date: calendarDate }).strict();
export const dateRangeQuerySchema = z.object({ from: calendarDate.optional(), to: calendarDate.optional() }).strict();
