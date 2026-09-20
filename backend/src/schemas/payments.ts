import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  appointmentId: z.string().uuid(),
}).strict();
