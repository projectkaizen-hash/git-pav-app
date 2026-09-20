import { z } from "zod";

const uuid = z.string().uuid();
const postcode = z.string().trim().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i, "Invalid UK postcode");

// Coverage check accepts either GPS coordinates OR postcode
export const vanCoverageCheckSchema = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  postcode: postcode.optional(),
}).refine(
  (data) => (data.lat !== undefined && data.lng !== undefined) || data.postcode !== undefined,
  { message: "Either lat/lng coordinates or postcode must be provided" }
);

export const vanStopIdParamsSchema = z.object({ id: uuid }).strict();

export const completeVanStopSchema = z.object({
  notes: z.string().trim().max(2000).optional(),
}).strict();
