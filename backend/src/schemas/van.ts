import { z } from "zod";

const uuid = z.string().uuid();
const postcode = z.string().trim().transform(val => {
  // Normalize postcode format: ensure space in the right place
  const cleaned = val.toUpperCase().replace(/\s/g, '');
  if (cleaned.length >= 5) {
    const inward = cleaned.slice(-3);
    const outward = cleaned.slice(0, -3);
    return `${outward} ${inward}`;
  }
  return cleaned;
}).refine(val => /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/.test(val), {
  message: "Invalid UK postcode format"
});

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
