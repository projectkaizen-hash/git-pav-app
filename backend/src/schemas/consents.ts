import { z } from "zod";

const uuid = z.string().uuid();

export const consentTypes = z.enum([
  "data_processing",
  "telehealth",
  "data_sharing",
  "marketing",
  "clinical_records",
  "payment_processing",
]);

export const lawfulBasisTypes = z.enum([
  "consent",
  "contract",
  "legal_obligation",
  "vital_interests",
  "public_task",
  "legitimate_interests",
]);

export const grantConsentSchema = z.object({
  consentType: consentTypes,
  lawfulBasis: lawfulBasisTypes,
  ipAddress: z.string().ip().optional(),
  metadata: z.record(z.unknown()).optional(),
}).strict();

export const withdrawConsentSchema = z.object({
  consentType: consentTypes,
  ipAddress: z.string().ip().optional(),
}).strict();

export const consentHistoryQuerySchema = z.object({
  consentType: consentTypes.optional(),
  includeWithdrawn: z.coerce.boolean().optional(),
}).strict();

export const dataAccessRequestSchema = z.object({
  ipAddress: z.string().ip().optional(),
}).strict();

export const dataDeletionRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  ipAddress: z.string().ip().optional(),
}).strict();
