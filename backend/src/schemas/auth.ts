import { z } from "zod";

const email = z.string().trim().toLowerCase().email().max(254);

// Password policy: minimum 8 chars, at least one uppercase, one lowercase, one number
const password = z.string()
  .min(8)
  .max(128)
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const name = z.string().trim().min(1).max(100);

// Phone normalization: UK format (+44 followed by 10 digits)
const phone = z.string()
  .trim()
  .min(7)
  .max(32)
  .transform((val) => {
    // Remove all non-digit characters except leading +
    const cleaned = val.replace(/[^\d+]/g, '');
    // If starts with country code format, normalize
    if (val.startsWith('+') && cleaned.length === 11 && cleaned.startsWith('44')) {
      return `+${cleaned}`;
    }
    // If UK mobile without country code (10 digits starting with 7)
    if (cleaned.length === 10 && cleaned.startsWith('7')) {
      return `+44${cleaned}`;
    }
    return val;
  });

export const registerSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
  phone: phone.optional(),
}).strict();

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(128),
}).strict();

export const refreshSchema = z.object({
  refreshToken: z.string().trim().min(1, "Refresh token is required").max(1024),
}).strict();

// Runtime schema for AuthUser - matches shared types/api-types.ts and mobile AuthUser
export const authUserSchema = z.object({
  id: z.string().uuid().optional(),
  sub: z.string().uuid(),
  role: z.enum(['patient', 'clinician', 'operator', 'admin']),
  email: z.string().email(),
  phone: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean().optional(),
  isMfaEnabled: z.boolean(),
  mfaEnabled: z.boolean().optional(),
  profileId: z.string().uuid().optional(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

// Runtime schema for auth response
export const authResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;
