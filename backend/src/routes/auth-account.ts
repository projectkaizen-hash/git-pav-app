// backend/src/routes/auth-account.ts
// Mobile-app account endpoints that extend the core auth router.
//
// Why a separate router: /api/auth is mounted with the strict authLimiter
// (20 req/15min) in server.ts. Change-password and account deletion are
// legitimate one-off actions, not auth attempts — mounting this router
// separately at /api/auth/account with the standard limiter avoids that
// bottleneck while keeping the audit middleware coverage.
//
// Contracts (consumed by pavdental/src/features/account/account-api.ts):
// - GET    /api/auth/account              → { user, patientProfile, clinicianProfile, operatorProfile }
// - DELETE /api/auth/account              → { success, message }   (soft-delete, GDPR Art.17)
// - POST   /api/auth/account/change-password → { success, message }
// - POST   /api/auth/account/verify-email/resend → { success, message }

import { Router, Request, Response } from "express";
import argon2 from "argon2";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import {
  emailVerificationService,
  rateLimiter,
} from "../lib/otp-service";
import { communicationService } from "../lib/communication-service";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { pseudonymiseIp } from "../lib/audit-security";

const router = Router();

// Local copies of auth.ts private helpers (kept in sync deliberately —
// importing would require exporting internals from a 600-line file).
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

type UserWithProfiles = {
  id: string;
  email: string;
  phone?: string | null;
  role: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  patientProfile?: { id: string; firstName: string; lastName: string } | null;
  clinicianProfile?: { id: string; fullName: string } | null;
};

function toAuthUser(user: UserWithProfiles) {
  const clinicianName = user.clinicianProfile?.fullName?.trim().split(/\s+/) ?? [];
  const clinicianLastName = clinicianName.slice(1).join(" ") || undefined;
  const firstName = user.patientProfile?.firstName ?? clinicianName[0] ?? "";
  const lastName = user.patientProfile?.lastName ?? clinicianLastName ?? "";

  const profileId =
    user.role === "patient"
      ? user.patientProfile?.id
      : user.role === "clinician"
        ? user.clinicianProfile?.id
        : undefined;

  return {
    id: user.id,
    sub: user.id,
    role: user.role as "patient" | "clinician" | "operator" | "admin",
    email: user.email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: user.phone || undefined,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified ?? false,
    isMfaEnabled: user.mfaEnabled,
    mfaEnabled: user.mfaEnabled,
    profileId,
  };
}

// ─── GET /api/auth/account ────────────────────────────────────────────────
// Account summary for the mobile profile/account screens, any role.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    include: { patientProfile: true, clinicianProfile: true, operatorProfile: true },
  });
  if (!user || !user.isActive) {
    return res.status(404).json({ error: "Account not found" });
  }

  return res.json({
    user: toAuthUser(user),
    patientProfile: user.patientProfile
      ? {
          id: user.patientProfile.id,
          firstName: user.patientProfile.firstName,
          lastName: user.patientProfile.lastName,
          dob: user.patientProfile.dob,
          gender: user.patientProfile.gender,
          addressLine1: user.patientProfile.addressLine1,
          city: user.patientProfile.city,
          postcode: user.patientProfile.postcode,
          emergencyContactName: user.patientProfile.emergencyContactName,
          emergencyContactPhone: user.patientProfile.emergencyContactPhone,
        }
      : null,
    clinicianProfile: user.clinicianProfile
      ? {
          id: user.clinicianProfile.id,
          fullName: user.clinicianProfile.fullName,
          gdcNumber: user.clinicianProfile.gdcNumber,
        }
      : null,
    operatorProfile: user.operatorProfile
      ? { id: user.operatorProfile.id, fullName: user.operatorProfile.fullName }
      : null,
  });
});

// ─── DELETE /api/auth/account ─────────────────────────────────────────────
// GDPR Article 17 soft-delete: re-verifies the password, deactivates the
// account, revokes every session, and audit-logs the request with the
// user-supplied reason. Data retention then follows the DSPT policy.
router.delete("/", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const { confirmPassword, reason } = (req.body ?? {}) as {
    confirmPassword?: string;
    reason?: string;
  };

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: "Account not found" });

  if (!confirmPassword || !(await argon2.verify(user.passwordHash, confirmPassword))) {
    return res.status(403).json({ error: "Password confirmation failed" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    }),
    prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  await createAuditLogWithIntegrity({
    action: "account.deletion_requested",
    actorId: user.id,
    resourceId: user.id,
    sessionId: req.user.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { reason: reason ?? null },
  });

  return res.json({
    success: true,
    message: "Account deactivated. Contact support to complete erasure.",
  });
});

// ─── POST /api/auth/account/change-password ───────────────────────────────
// Verifies the current password, rotates the argon2 hash, revokes every
// other session (the caller's session stays signed in), and audit-logs.
router.post("/change-password", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const { currentPassword, newPassword } = (req.body ?? {}) as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  const isStrongPassword =
    typeof newPassword === "string" &&
    newPassword.length >= 8 &&
    newPassword.length <= 128 &&
    /[A-Z]/.test(newPassword) &&
    /[a-z]/.test(newPassword) &&
    /[0-9]/.test(newPassword);
  if (!isStrongPassword) {
    return res.status(400).json({
      error: "New password must be 8-128 characters with at least one uppercase letter, one lowercase letter, and one number",
    });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: "Account not found" });

  if (!(await argon2.verify(user.passwordHash, currentPassword))) {
    return res.status(403).json({ error: "Current password is incorrect" });
  }
  if (await argon2.verify(user.passwordHash, newPassword)) {
    return res.status(400).json({ error: "New password must be different from the current password" });
  }

  const passwordHash = await argon2.hash(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.authSession.updateMany({
      where: { userId: user.id, revokedAt: null, id: { not: req.user!.sessionId } },
      data: { revokedAt: new Date() },
    }),
  ]);

  await createAuditLogWithIntegrity({
    action: "account.password_changed",
    actorId: user.id,
    resourceId: user.id,
    sessionId: req.user.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: {},
  });

  return res.json({ success: true, message: "Password updated successfully" });
});

// ─── POST /api/auth/account/verify-email/resend ───────────────────────────
// Authenticated resend using the caller's own email: no enumeration risk and
// no body required. Shares the rate-limit bucket with the public request
// flow to prevent inbox spam via alternating endpoints.
router.post("/verify-email/resend", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: "Account not found" });
  if (user.emailVerified) {
    return res.status(400).json({ error: "Email already verified" });
  }

  const resendLimitKey = `verify-email:${user.email}`;
  if (await rateLimiter.isRateLimited(resendLimitKey, 5, 3600)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const { token, hashedToken, expiresAt } = emailVerificationService.generateVerificationToken();
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, token: hashedToken, expiresAt },
  });
  await communicationService.sendVerificationEmail(user.email, token);

  return res.json({ success: true, message: "Verification email sent" });
});

export default router;
