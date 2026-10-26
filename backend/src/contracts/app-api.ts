import { z } from "zod";

// What the mobile app reads from the API, written once here. Two things keep
// it true:
//  - src/__tests__/app-contract.test.ts calls each endpoint and parses the
//    real response with these schemas, so a backend change that drops or
//    retypes a field fails the backend's tests;
//  - `npm run contract:app` turns these schemas into TypeScript types in
//    pavdental/src/features/api-contract.gen.ts, which the app's own types
//    are built from, so the app stops compiling if it reads a field the API
//    doesn't send. The same test fails if that file is out of date.
// Dates are ISO strings, as they arrive over JSON.

const isoDateTime = z.string().datetime();

export const careChannelSchema = z.enum(["clinic", "van", "video"]);

export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["checkup", "hygiene", "emergency", "restorative", "cosmetic"]),
  description: z.string(),
  durationMinutes: z.number().int(),
  pricePence: z.number().int(),
  depositPence: z.number().int(),
  supportedChannels: z.array(careChannelSchema),
  prepInstructions: z.array(z.string()),
  requiresPriorConsult: z.boolean(),
  isActive: z.boolean(),
});

export const clinicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  postcode: z.string(),
  city: z.string(),
  phone: z.string(),
  operatingHours: z.string().describe("Free-text summary; openingHours is what slots are built from."),
  isActive: z.boolean(),
  createdAt: isoDateTime,
  openingHours: z
    .array(z.object({ weekday: z.number().int(), opensMinute: z.number().int(), closesMinute: z.number().int() }))
    .describe("UK time, minutes after midnight; weekday 0 is Sunday."),
  closures: z.array(z.object({ date: isoDateTime, reason: z.string().nullable() })).describe("Closure days from today, at most 30."),
});

export const clinicianSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  gdcNumber: z.string(),
  roleTitle: z.string(),
  specialisms: z.array(z.string()),
  bio: z.string().nullable(),
  photoUrl: z.string().nullable().describe("https link or uploaded image, set on the dashboard's Dentist profiles page."),
  isTelehealthActive: z.boolean(),
});

export const slotSchema = z.object({
  id: z.string().describe("Also the hold key passed to POST /api/booking/hold-slot."),
  startTimeUtc: isoDateTime,
  endTimeUtc: isoDateTime,
  available: z.boolean(),
  durationMinutes: z.number().int(),
});

export const holdSlotResponseSchema = z.object({
  success: z.literal(true),
  slotId: z.string(),
  holdExpiresAt: z.number().int().describe("Epoch milliseconds."),
  holdDurationSeconds: z.number().int(),
  message: z.string(),
});

/** Name in the generated file → schema. Order is the order in the file. */
export const appContract = {
  ApiCareChannel: careChannelSchema,
  ApiService: serviceSchema,
  ApiClinic: clinicSchema,
  ApiClinician: clinicianSchema,
  ApiSlot: slotSchema,
  ApiHoldSlotResponse: holdSlotResponseSchema,
} as const;
