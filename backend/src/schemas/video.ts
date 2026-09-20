import { z } from "zod";

const uuid = z.string().uuid();

export const createVideoRoomSchema = z.object({
  appointmentId: uuid.optional(),
}).strict();

export const submitTriageSchema = z.object({
  appointmentId: uuid,
  chiefComplaint: z.string().trim().min(1).max(500),
  painLevel: z.number().int().min(0).max(10),
  duration: z.string().trim().max(100).optional(),
  symptoms: z.array(z.string().trim().max(200)).max(20).optional(),
  photos: z.array(z.string().url()).max(10).optional(),
}).strict();

export const admitPatientSchema = z.object({
  appointmentId: uuid,
}).strict();
