import { z } from "zod";

const lat = z.number().min(-90).max(90);
const lng = z.number().min(-180).max(180);
const uuid = z.string().uuid();

// ─── Operator schemas ──────────────────────────────────────────────────────────

export const shiftStartSchema = z.object({
  lat: lat.optional(),
  lng: lng.optional(),
  accuracyM: z.number().positive().optional(),
}).strict();

export const locationPingSchema = z.object({
  lat,
  lng,
  accuracyM: z.number().positive().optional(),
}).strict();

export const phaseUpdateSchema = z.object({
  phase: z.enum(["en_route", "on_site", "in_treatment", "completed", "no_show"]),
  notes: z.string().trim().max(2000).optional(),
}).strict();

export const vanRequestIdParamsSchema = z.object({ id: uuid }).strict();

// ─── Patient schemas ──────────────────────────────────────────────────────────

export const accessDetailsSchema = z.object({
  addressLine1: z.string().trim().min(1).max(255),
  addressLine2: z.string().trim().max(255).optional(),
  city: z.string().trim().min(1).max(100),
  postcode: z.string().trim().regex(/^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/i),
  lat,
  lng,
  parkingType: z.enum(["private_driveway", "permit_bay", "visitor", "other"]),
  gateCode: z.string().trim().max(50).optional(),
  accessNotes: z.string().trim().max(500).optional(),
}).strict();

export const createVanRequestSchema = z.object({
  serviceId: z.string().trim().min(1),
  accessDetails: accessDetailsSchema,
}).strict();

export const availabilityQuerySchema = z.object({
  lat: z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]),
  lng: z.union([z.number(), z.string().regex(/^-?\d+(\.\d+)?$/).transform(Number)]),
});

