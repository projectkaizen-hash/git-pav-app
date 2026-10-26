import { z } from "zod";

export const createPaymentIntentSchema = z.object({
  appointmentId: z.string().guid(),
  // A rewards voucher to take off this deposit (decisions log #14).
  voucherCode: z.string().trim().min(1).max(40).optional(),
}).strict();
