import { z } from "zod";

const uuid = z.string().uuid();
const postcode = z.string().trim().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, "Invalid UK postcode");

export const vanCoverageCheckSchema = z.object({
  postcode: postcode,
}).strict();

export const vanStopIdParamsSchema = z.object({ id: uuid }).strict();

export const completeVanStopSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
}).strict();
