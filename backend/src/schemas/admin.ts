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
