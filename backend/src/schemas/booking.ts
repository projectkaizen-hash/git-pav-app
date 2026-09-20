import { z } from "zod";

const resourceId = z.string().trim().min(1).max(100).regex(/^[a-zA-Z0-9_-]+$/);
const uuid = z.string().uuid();
const bookingChannel = z.enum(["clinic", "van", "video"]);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");
const isoDateTime = z.string().datetime({ offset: true });
const compactJsonObject = z.record(z.unknown()).refine(
  (value) => JSON.stringify(value).length <= 16_384,
  "Object is too large"
);

export const slotsQuerySchema = z.object({
  clinicianId: uuid.optional(),
  serviceId: resourceId.optional(),
  date: isoDate,
  channel: bookingChannel.optional(),
}).strict();

export const holdSlotSchema = z.object({
  slotId: z.string().trim().min(1).max(512).regex(/^[a-zA-Z0-9:._-]+$/),
}).strict();

export const createAppointmentSchema = z.object({
  serviceId: resourceId,
  channel: bookingChannel,
  clinicianId: uuid.optional(),
  clinicId: uuid.optional(),
  vanId: uuid.optional(),
  startTimeUtc: isoDateTime,
  endTimeUtc: isoDateTime,
  slotId: z.string().trim().min(1).max(512).regex(/^[a-zA-Z0-9:._-]+$/).optional(),
  accessDetails: compactJsonObject.optional(),
  triageData: compactJsonObject.optional(),
}).strict().superRefine((appointment, context) => {
  if (new Date(appointment.endTimeUtc) <= new Date(appointment.startTimeUtc)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "endTimeUtc must be after startTimeUtc" });
  }
});

export const appointmentIdParamsSchema = z.object({ id: uuid }).strict();
