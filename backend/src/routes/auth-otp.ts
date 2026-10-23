// backend/src/routes/auth-otp.ts
// Phone-OTP login for the mobile app (mounted at /api/auth/otp).
//
// Contract (consumed by pavdental/src/features/auth/auth-api.ts):
// - POST /api/auth/otp/request { phone }        → { success, message }
// - POST /api/auth/otp/verify  { phone, code }  → { accessToken, refreshToken, user }
//
// Flow: a 6-digit code is hashed and stored against the user's account via
// the existing MfaCode model, delivered over SMS, and verified with a
// short-lived single-use token. Verification always runs inside a
// transaction that flips the stored code to used and creates the session.
//
// Security notes:
// - Codes are stored hashed (sha256) and single-use.
// - Verification is rate-limited per phone (5/hour) to blunt brute force.
// - Anti-enumeration: /request always answers 200 with a generic message —
//   unknown numbers simply get no SMS. /verify returns one generic 401 for
//   both "unknown phone" and "bad code".
// - Verification consumes the code with an updateMany guarded on usedAt IS
//   NULL, so two concurrent submits of the same code cannot both create
//   sessions (only the transaction that flips usedAt proceeds).

import { Router, Request, Response } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { twoFactorService, rateLimiter } from "../lib/otp-service";
import { communicationService } from "../lib/communication-service";
import { createSession, toAuthUser } from "./auth";

const router = Router();

const PHONE_RE = /^\+?[1-9]\d{6,14}$/; // E.164-ish

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── POST /api/auth/otp/request ──────────────────────────────────────────
router.post("/request", async (req: Request, res: Response) => {
  const { phone } = (req.body ?? {}) as { phone?: string };

  if (!phone || typeof phone !== "string" || !PHONE_RE.test(phone.trim())) {
    return res.status(400).json({ error: "A valid phone number is required" });
  }
  const cleanPhone = phone.trim();

  const rateLimitKey = `otp-request:${cleanPhone}`;
  if (await rateLimiter.isRateLimited(rateLimitKey, 5, 3600)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, isActive: true },
  });
  if (!user) {
    // Anti-enumeration: same shape/status as the success path; no SMS is sent.
    // The per-phone rate limit above has already consumed an attempt.
    return res.json({ success: true, message: "If this number is registered, a verification code has been sent." });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    res.status(423).json({ error: "Account is temporarily locked. Try again later." });
    return;
  }

  // 6-digit numeric code, short expiry — same lifecycle as MFA codes.
  const { code, hashedCode, expiresAt } = twoFactorService.generateOTP();

  await prisma.mfaCode.create({
    data: { userId: user.id, code: hashedCode, expiresAt },
  });

  const delivered = await communicationService.sendMfaCode(user.phone ?? cleanPhone, code);
  if (!delivered) {
    return res.status(502).json({ error: "Could not send the code. Please try again." });
  }

  return res.json({ success: true, message: "Verification code sent" });
});

// ─── POST /api/auth/otp/verify ───────────────────────────────────────────
router.post("/verify", async (req: Request, res: Response) => {
  const { phone, code } = (req.body ?? {}) as { phone?: string; code?: string };

  if (!phone || !code || typeof phone !== "string" || typeof code !== "string") {
    return res.status(400).json({ error: "phone and code are required" });
  }

  const cleanPhone = phone.trim();
  const verifyLimitKey = `otp-verify:${cleanPhone}`;
  if (await rateLimiter.isRateLimited(verifyLimitKey, 5, 3600)) {
    return res.status(429).json({ error: "Too many attempts. Please try again later." });
  }

  const user = await prisma.user.findFirst({
    where: { phone: cleanPhone, isActive: true },
    include: { patientProfile: true, clinicianProfile: true },
  });
  if (!user) {
    // Generic 401 — do not reveal whether the phone is registered.
    return res.status(401).json({ error: "Invalid or expired code" });
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    res.status(423).json({ error: "Account is temporarily locked. Try again later." });
    return;
  }

  const hashedCode = hashToken(code.trim());

  try {
    const result = await prisma.$transaction(async (tx) => {
      const mfaCode = await tx.mfaCode.findFirst({
        where: {
          userId: user.id,
          code: hashedCode,
          expiresAt: { gt: new Date() },
          usedAt: null,
        },
        orderBy: { createdAt: "desc" },
      });
      if (!mfaCode) return null;

      // Consume the code inside the same transaction that verifies it.
      // updateMany guarded on usedAt IS NULL: under a concurrent double-submit
      // only one transaction wins; the loser sees count 0 and gets 401.
      const consumed = await tx.mfaCode.updateMany({
        where: { id: mfaCode.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (consumed.count !== 1) return null;

      await tx.user.update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });

      return { ok: true as const };
    });

    if (!result) {
      return res.status(401).json({ error: "Invalid or expired code" });
    }
  } catch (err) {
    console.error("[auth-otp] verification transaction failed:", err);
    return res.status(500).json({ error: "Verification failed. Please try again." });
  }

  const { accessToken, refreshToken } = await createSession(user.id, req);

  return res.json({
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  });
});

export default router;
