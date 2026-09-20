import { Router, Request, Response } from "express";
import argon2 from "argon2";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { loginSchema, refreshSchema, registerSchema, authResponseSchema } from "../schemas/auth";
import { emailVerificationService, passwordResetService, twoFactorService, rateLimiter } from "../lib/otp-service";
import { communicationService } from "../lib/communication-service";
import { requireMFA, verifyMFAForRequest } from "../middleware/mfa";

const router = Router();

// ─── POST /api/auth/check-email ────────────────────────────────────────────────
router.post("/check-email", async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Email is required" });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true },
  });

  return res.json({ exists: !!user, email: normalizedEmail, role: user?.role ?? null });
});

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post("/register", validateBody(registerSchema), async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone } = req.body;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already registered" });
  }

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  const user = await prisma.user.create({
    data: {
      email,
      phone: phone || null,
      passwordHash,
      role: "patient",
      patientProfile: {
        create: {
          firstName,
          lastName,
        },
      },
    },
    include: { patientProfile: true, clinicianProfile: true },
  });

  // Create first session
  const { accessToken, refreshToken, session } = await createSession(user.id, req);

  // Generate verification token and dispatch welcome verification email
  try {
    const { token, hashedToken, expiresAt } = emailVerificationService.generateVerificationToken();
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });
    communicationService.sendVerificationEmail(user.email, token).catch((err) => {
      console.error("[Auth] Failed to dispatch registration verification email:", err);
    });
  } catch (err) {
    console.error("[Auth] Error creating registration verification token:", err);
  }

  const authResponse = {
    accessToken,
    refreshToken,
    user: toAuthUser(user, { firstName, lastName }),
  };

  // Validate response conforms to runtime schema
  const validatedResponse = authResponseSchema.parse(authResponse);

  return res.status(201).json(validatedResponse);
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────────
router.post("/login", validateBody(loginSchema), async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email },
    include: { patientProfile: true, clinicianProfile: true },
  });

  if (!user || !user.isActive) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Check for account lockout
  if (user.lockedUntil && new Date() < user.lockedUntil) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return res.status(429).json({ 
      error: "Account temporarily locked",
      retryAfterMinutes: remainingMinutes 
    });
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    // Increment failed login attempts
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const lockoutThreshold = 5;
    
    const updateData: any = {
      failedLoginAttempts: failedAttempts,
    };

    // Implement exponential backoff lockout
    if (failedAttempts >= lockoutThreshold) {
      const lockDuration = Math.min(2 ** (failedAttempts - lockoutThreshold) * 60, 60 * 60); // Max 1 hour
      updateData.lockedUntil = new Date(Date.now() + lockDuration * 1000);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: updateData,
    });

    return res.status(401).json({ error: "Invalid credentials" });
  }

  // Reset failed login attempts on successful login
  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  const { accessToken, refreshToken } = await createSession(user.id, req);

  const authResponse = {
    accessToken,
    refreshToken,
    user: toAuthUser(user),
  };

  // Validate response conforms to runtime schema
  const validatedResponse = authResponseSchema.parse(authResponse);

  return res.json(validatedResponse);
});

// ─── POST /api/auth/refresh ────────────────────────────────────────────────────
router.post("/refresh", validateBody(refreshSchema), async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return res.status(401).json({ error: "Invalid or expired refresh token" });
  }

  const tokenHash = hashToken(refreshToken);
  const session = await prisma.authSession.findFirst({
    where: {
      id: payload.sessionId,
      refreshTokenHash: tokenHash,
      revokedAt: null,
    },
    include: { user: { include: { patientProfile: true, clinicianProfile: true } } },
  });

  if (!session || new Date() > session.expiresAt) {
    return res.status(401).json({ error: "Session expired or revoked" });
  }

  // Rotate refresh token
  const newRefreshToken = signRefreshToken({
    sub: session.user.id,
    sessionId: session.id,
  });
  const newHash = hashToken(newRefreshToken);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await prisma.authSession.update({
    where: { id: session.id },
    data: { refreshTokenHash: newHash, expiresAt },
  });

  const accessToken = signAccessToken({
    sub: session.user.id,
    role: session.user.role,
    sessionId: session.id,
  });

  const authResponse = {
    accessToken,
    refreshToken: newRefreshToken,
    user: toAuthUser(session.user),
  };

  // Validate response conforms to runtime schema
  const validatedResponse = authResponseSchema.parse(authResponse);

  return res.json(validatedResponse);
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post("/logout", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  await prisma.authSession.updateMany({
    where: { id: req.user.sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  return res.json({ message: "Logged out" });
});

// ─── GET /api/auth/sessions ───────────────────────────────────────────────────
router.get("/sessions", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const sessions = await prisma.authSession.findMany({
    where: { userId: req.user.sub, revokedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      deviceInfo: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return res.json(sessions);
});

// ─── DELETE /api/auth/sessions/:id ───────────────────────────────────────────
router.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  await prisma.authSession.updateMany({
    where: { id: String(req.params.id), userId: req.user.sub },
    data: { revokedAt: new Date() },
  });

  return res.json({ message: "Session revoked" });
});

// ─── POST /api/auth/verify-email/request ─────────────────────────────────────
router.post("/verify-email/request", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Rate limit check
  const rateLimitKey = `verify-email:${email}`;
  if (await rateLimiter.isRateLimited(rateLimitKey, 5, 3600)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: "Email already verified" });
  }

  // Generate verification token
  const { token, hashedToken, expiresAt } = emailVerificationService.generateVerificationToken();

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
    },
  });

  // Send verification email via configured provider
  await communicationService.sendVerificationEmail(user.email, token);

  return res.json({ message: "Verification email sent" });
});

// ─── POST /api/auth/verify-email/confirm ─────────────────────────────────────
router.post("/verify-email/confirm", async (req: Request, res: Response) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Token is required" });
  }

  const hashedToken = hashToken(token);

  // Find valid token
  const verificationToken = await prisma.emailVerificationToken.findFirst({
    where: {
      token: hashedToken,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    include: { user: true },
  });

  if (!verificationToken) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  // Mark token as used
  await prisma.emailVerificationToken.update({
    where: { id: verificationToken.id },
    data: { usedAt: new Date() },
  });

  // Verify user email
  await prisma.user.update({
    where: { id: verificationToken.userId },
    data: { emailVerified: true },
  });

  return res.json({ message: "Email verified successfully" });
});

// ─── POST /api/auth/password-reset/request ───────────────────────────────────
router.post("/password-reset/request", async (req: Request, res: Response) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  // Rate limit check
  const rateLimitKey = `password-reset:${email}`;
  if (await rateLimiter.isRateLimited(rateLimitKey, 3, 3600)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: "If an account exists, a reset link will be sent" });
  }

  // Generate reset token
  const { token, hashedToken, expiresAt } = passwordResetService.generateResetToken();

  // Store reset token
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      token: hashedToken,
      expiresAt,
    },
  });

  // Send password reset email via configured provider
  await communicationService.sendPasswordResetEmail(user.email, token);

  return res.json({ message: "If an account exists, a reset link will be sent" });
});

// ─── POST /api/auth/password-reset/confirm ───────────────────────────────────
router.post("/password-reset/confirm", async (req: Request, res: Response) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ error: "Token and new password are required" });
  }

  // Validate password strength
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,128}$/;
  if (!passwordRegex.test(newPassword)) {
    return res.status(400).json({ 
      error: "Password must be 8-128 characters with at least one uppercase, one lowercase, and one number" 
    });
  }

  const hashedToken = hashToken(token);

  // Find valid token
  const resetToken = await prisma.passwordResetToken.findFirst({
    where: {
      token: hashedToken,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
    include: { user: true },
  });

  if (!resetToken) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  // Hash new password
  const passwordHash = await argon2.hash(newPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });

  // Mark token as used
  await prisma.passwordResetToken.update({
    where: { id: resetToken.id },
    data: { usedAt: new Date() },
  });

  // Update user password
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { 
      passwordHash,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  // Revoke all sessions
  await prisma.authSession.updateMany({
    where: { userId: resetToken.userId },
    data: { revokedAt: new Date() },
  });

  return res.json({ message: "Password reset successfully" });
});

// ─── POST /api/auth/mfa/request ───────────────────────────────────────────────
router.post("/mfa/request", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  // Rate limit check
  const rateLimitKey = `mfa:${req.user.sub}`;
  if (await rateLimiter.isRateLimited(rateLimitKey, 3, 300)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  // Generate OTP
  const { code, hashedCode, expiresAt } = twoFactorService.generateOTP();

  // Store OTP
  await prisma.mfaCode.create({
    data: {
      userId: user.id,
      code: hashedCode,
      expiresAt,
    },
  });

  // Send OTP via SMS or email
  await communicationService.sendMfaCode(user.phone || user.email, code);

  return res.json({ message: "MFA code sent" });
});

// ─── POST /api/auth/mfa/verify ───────────────────────────────────────────────
router.post("/mfa/verify", requireAuth, async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ error: "Unauthorised" });

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: "Code is required" });
  }

  const hashedCode = hashToken(code);

  // Find valid code
  const mfaCode = await prisma.mfaCode.findFirst({
    where: {
      userId: req.user.sub,
      code: hashedCode,
      expiresAt: { gt: new Date() },
      usedAt: null,
    },
  });

  if (!mfaCode) {
    return res.status(400).json({ error: "Invalid or expired code" });
  }

  // Mark code as used
  await prisma.mfaCode.update({
    where: { id: mfaCode.id },
    data: { usedAt: new Date() },
  });

  // Enable MFA for user
  await prisma.user.update({
    where: { id: req.user.sub },
    data: { mfaEnabled: true },
  });

  return res.json({ message: "MFA enabled successfully" });
});

// ─── POST /api/auth/mfa/verify-session ───────────────────────────────────────────
router.post("/mfa/verify-session", requireAuth, async (req: AuthRequest, res: Response) => {
  return verifyMFAForRequest(req, res);
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createSession(userId: string, req: Request) {
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true },
  });

  const session = await prisma.authSession.create({
    data: {
      userId,
      refreshTokenHash: "",
      expiresAt,
      deviceInfo: req.headers["user-agent"] || null,
      ipAddressHash: hashIp(req.ip || ""),
    },
  });

  const refreshToken = signRefreshToken({
    sub: userId,
    sessionId: session.id,
  });
  const refreshTokenHash = hashToken(refreshToken);

  await prisma.authSession.update({
    where: { id: session.id },
    data: { refreshTokenHash },
  });

  const accessToken = signAccessToken({
    sub: userId,
    role: user.role,
    sessionId: session.id,
  });

  return { accessToken, refreshToken, session };
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip).digest("hex");
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

function toAuthUser(
  user: UserWithProfiles,
  fallbackName?: { firstName: string; lastName: string }
) {
  const clinicianName = user.clinicianProfile?.fullName?.trim().split(/\s+/) ?? [];
  const clinicianLastName = clinicianName.slice(1).join(" ") || undefined;
  const firstName = user.patientProfile?.firstName ?? clinicianName[0] ?? fallbackName?.firstName ?? "";
  const lastName = user.patientProfile?.lastName ?? clinicianLastName ?? fallbackName?.lastName ?? "";

  // Determine profile ID based on role
  const profileId = user.role === 'patient' 
    ? user.patientProfile?.id 
    : user.role === 'clinician' 
    ? user.clinicianProfile?.id 
    : undefined;

  return {
    id: user.id,
    sub: user.id,
    role: user.role as 'patient' | 'clinician' | 'operator' | 'admin',
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

export default router;
