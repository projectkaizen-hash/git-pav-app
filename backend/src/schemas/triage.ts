import { z } from "zod";

export const triageCheckSchema = z.object({
  chiefComplaint: z.string().trim().min(1).max(500),
  painLevel: z.coerce.number().int().min(1).max(10).optional(),
  symptoms: z.array(z.string()).optional(),
  duration: z.string().optional(),
  location: z.string().optional(),
  swelling: z.boolean().optional(),
  bleeding: z.boolean().optional(),
  fever: z.boolean().optional(),
  difficultyBreathing: z.boolean().optional(),
  difficultySwallowing: z.boolean().optional(),
  traumaHistory: z.string().optional(),
}).strict();
