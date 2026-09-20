import { z } from "zod";

const uuid = z.string().uuid();

export const createPrescriptionSchema = z.object({
  appointmentId: uuid.optional(),
  medicationName: z.string().trim().min(1).max(500),
  dosageInstructions: z.string().trim().min(1).max(1000),
  dispensingPharmacy: z.string().trim().min(1).max(255),
}).strict();

export const userIdParamsSchema = z.object({ userId: uuid }).strict();
