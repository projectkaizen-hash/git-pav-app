import { z } from "zod";

// ─── Base Response Schemas ──────────────────────────────────────────────────────
export const errorResponseSchema = z.object({
  error: z.string(),
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
});

export const successResponseSchema = z.object({
  requestId: z.string().optional(),
  timestamp: z.string().datetime(),
});

// ─── Auth Response Schemas ─────────────────────────────────────────────────────
export const authUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(["patient", "clinician", "operator", "admin"]),
  firstName: z.string(),
  lastName: z.string(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  mfaEnabled: z.boolean(),
});

export const authSessionSchema = z.object({
  id: z.string().uuid(),
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
  expiresAt: z.string().datetime(),
});

export const sessionListItemSchema = z.object({
  id: z.string().uuid(),
  deviceInfo: z.string().nullable(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
});

// ─── Patient Response Schemas ───────────────────────────────────────────────────
export const patientProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string(),
  lastName: z.string(),
  dob: z.string().datetime().nullable(),
  gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).nullable(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  address: z.object({
    line1: z.string().nullable(),
    line2: z.string().nullable(),
    city: z.string().nullable(),
    postcode: z.string().nullable(),
  }),
  emergencyContact: z.object({
    name: z.string().nullable(),
    phone: z.string().nullable(),
  }),
  medicalHistory: z.string().nullable(),
  consents: z.record(z.string(), z.string()).nullable(),
});

export const toothRecordSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  toothNumber: z.number().int().min(1).max(32),
  arch: z.enum(["upper", "lower"]),
  quadrant: z.enum(["upper_right", "upper_left", "lower_right", "lower_left"]),
  condition: z.enum(["healthy", "decay", "filling", "crown", "bridge", "implant", "missing", "root_canal", "other"]),
  notes: z.string().nullable(),
  updatedAt: z.string().datetime(),
});

export const treatmentPlanItemSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  description: z.string(),
  toothNumber: z.number().int().nullable(),
  costPence: z.number().int(),
});

export const treatmentPlanSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  clinicianId: z.string().uuid(),
  title: z.string(),
  totalCostPence: z.number().int(),
  status: z.enum(["draft", "active", "completed", "cancelled"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  items: z.array(treatmentPlanItemSchema),
  clinician: z.object({
    fullName: z.string(),
    roleTitle: z.string(),
  }),
});

export const documentVaultSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  docType: z.enum(["xray", "photo", "treatment_plan", "consent", "other"]),
  title: z.string(),
  fileSizeBytes: z.number().int(),
  createdAt: z.string().datetime(),
  downloadUrl: z.string(),
});

// ─── Service & Booking Response Schemas ────────────────────────────────────────
export const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["checkup", "hygiene", "emergency", "cosmetic", "restorative", "orthodontic"]),
  durationMinutes: z.number().int(),
  pricePence: z.number().int(),
  depositPence: z.number().int(),
  description: z.string().nullable(),
});

export const clinicianSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  roleTitle: z.string(),
  gdcNumber: z.string(),
  photoUrl: z.string().nullable(),
});

export const clinicSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  postcode: z.string(),
  phone: z.string().nullable(),
});

export const slotSchema = z.object({
  id: z.string(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  available: z.boolean(),
  durationMinutes: z.number().int(),
});

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  clinicianId: z.string().uuid().nullable(),
  serviceId: z.string(),
  channel: z.enum(["clinic", "van", "video"]),
  clinicId: z.string().uuid().nullable(),
  vanId: z.string().uuid().nullable(),
  startTimeUtc: z.string().datetime(),
  endTimeUtc: z.string().datetime(),
  status: z.enum(["draft_hold", "confirmed", "in_progress", "completed", "cancelled", "no_show"]),
  totalPricePence: z.number().int(),
  depositPaidPence: z.number().int(),
  holdExpiresAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  service: serviceSchema,
  clinician: clinicianSchema.nullable(),
  clinic: clinicSchema.nullable(),
});

export const slotHoldResponseSchema = z.object({
  success: z.boolean(),
  slotId: z.string(),
  holdExpiresAt: z.number().int(),
  holdDurationSeconds: z.number().int(),
  message: z.string(),
});

// ─── Payment Response Schemas ──────────────────────────────────────────────────
export const paymentIntentSchema = z.object({
  id: z.string(),
  clientSecret: z.string(),
  amountPence: z.number().int(),
  currency: z.string(),
  status: z.string(),
});

export const refundResponseSchema = z.object({
  refundId: z.string(),
  amountPence: z.number().int(),
  status: z.string(),
  refundPercentage: z.number().int(),
});

// ─── Mobile Van Response Schemas ───────────────────────────────────────────────
export const vanCoverageSchema = z.object({
  isCovered: z.boolean(),
  assignedVan: z.string().nullable(),
  postcode: z.string(),
  nextAvailableDate: z.string().datetime().nullable(),
});

export const vanStopSchema = z.object({
  id: z.string().uuid(),
  vanId: z.string().uuid(),
  scheduledDate: z.string().datetime(),
  address: z.string(),
  postcode: z.string(),
  patientName: z.string(),
  procedure: z.string(),
  status: z.enum(["scheduled", "checked_in", "in_progress", "completed", "missed"]),
  estimatedArrival: z.string().datetime().nullable(),
  checkInTime: z.string().datetime().nullable(),
  completionTime: z.string().datetime().nullable(),
});

// ─── Video Consultation Response Schemas ───────────────────────────────────────
export const videoRoomSchema = z.object({
  id: z.string().uuid(),
  appointmentId: z.string().uuid(),
  url: z.string(),
  roomName: z.string(),
  expiresAt: z.string().datetime(),
  status: z.enum(["scheduled", "active", "ended"]),
});

// ─── Notification Response Schemas ──────────────────────────────────────────────
export const pushTokenRegistrationSchema = z.object({
  id: z.string().uuid(),
  token: z.string(),
  platform: z.enum(["ios", "android"]),
  registeredAt: z.string().datetime(),
});

// ─── Waitlist Response Schemas ──────────────────────────────────────────────────
export const waitlistEntrySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  serviceId: z.string(),
  preferredDate: z.string(),
  position: z.number().int(),
  status: z.enum(["active", "notified", "cancelled", "fulfilled"]),
  createdAt: z.string().datetime(),
});

// ─── Audit Response Schemas ─────────────────────────────────────────────────────
export const auditLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  action: z.string(),
  resourceId: z.string().nullable(),
  resourceType: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  ipAddressHash: z.string().nullable(),
  timestamp: z.string().datetime(),
});

// ─── Export TypeScript Types ───────────────────────────────────────────────────
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type SessionListItem = z.infer<typeof sessionListItemSchema>;
export type PatientProfile = z.infer<typeof patientProfileSchema>;
export type ToothRecord = z.infer<typeof toothRecordSchema>;
export type TreatmentPlanItem = z.infer<typeof treatmentPlanItemSchema>;
export type TreatmentPlan = z.infer<typeof treatmentPlanSchema>;
export type DocumentVault = z.infer<typeof documentVaultSchema>;
export type Service = z.infer<typeof serviceSchema>;
export type Clinician = z.infer<typeof clinicianSchema>;
export type Clinic = z.infer<typeof clinicSchema>;
export type Slot = z.infer<typeof slotSchema>;
export type Appointment = z.infer<typeof appointmentSchema>;
export type SlotHoldResponse = z.infer<typeof slotHoldResponseSchema>;
export type PaymentIntent = z.infer<typeof paymentIntentSchema>;
export type RefundResponse = z.infer<typeof refundResponseSchema>;
export type VanCoverage = z.infer<typeof vanCoverageSchema>;
export type VanStop = z.infer<typeof vanStopSchema>;
export type VideoRoom = z.infer<typeof videoRoomSchema>;
export type PushTokenRegistration = z.infer<typeof pushTokenRegistrationSchema>;
export type WaitlistEntry = z.infer<typeof waitlistEntrySchema>;
export type AuditLog = z.infer<typeof auditLogSchema>;
