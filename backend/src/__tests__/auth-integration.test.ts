import app from "../server";
import http from "http";
import { prisma } from "../lib/prisma";
import {
  emailVerificationService,
  passwordResetService,
  twoFactorService,
  otpService,
  rateLimiter,
} from "../lib/otp-service";
import {
  createAuditLogWithIntegrity,
  verifyAuditIntegrity,
  isCriticalAuditEvent,
} from "../lib/audit-integrity";
import {
  requirePatientRecordAccess,
  requireActiveAppointmentContext,
} from "../middleware/patient-access";

describe("Auth API Integration Tests", () => {
  let server: http.Server;
  let baseUrl: string;
  let testUser: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  let accessToken: string;
  let refreshToken: string;
  let userId: string;

  beforeAll(async () => {
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3003, resolve));
    baseUrl = "http://localhost:3003";

    // Generate unique test user data
    const timestamp = Date.now();
    testUser = {
      email: `test_auth_${timestamp}@pavdental.co.uk`,
      password: "TestPassword123!",
      firstName: "Test",
      lastName: "User",
      phone: `+4479${timestamp.toString().slice(-8)}`,
    };
  });

  afterAll(async () => {
    server.close();
  });

  describe("POST /api/auth/register", () => {
    it("should register a new patient account", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(201);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      expect(data.user).toHaveProperty("id");
      expect(data.user).toHaveProperty("email", testUser.email);
      expect(data.user).toHaveProperty("role", "patient");
      expect(data.user).toHaveProperty("firstName", testUser.firstName);
      expect(data.user).toHaveProperty("lastName", testUser.lastName);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
      userId = data.user.id;
    });

    it("should reject duplicate email registration", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testUser),
      });

      expect(response.status).toBe(409);
      const data: any = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject invalid email format", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testUser,
          email: "invalid-email",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should reject weak password", async () => {
      const response = await fetch(`${baseUrl}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...testUser,
          email: `test_weak_${Date.now()}@pavdental.co.uk`,
          password: "weak",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      expect(data.user.email).toBe(testUser.email);

      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it("should reject invalid credentials", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: "wrongpassword",
        }),
      });

      expect(response.status).toBe(401);
      const data: any = await response.json();
      expect(data).toHaveProperty("error");
    });

    it("should reject non-existent user", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "nonexistent@pavdental.co.uk",
          password: testUser.password,
        }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/refresh", () => {
    it("should refresh access token with valid refresh token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      
      expect(data).toHaveProperty("accessToken");
      expect(data).toHaveProperty("refreshToken");
      expect(data).toHaveProperty("user");
      
      // Refresh token should be rotated (new value)
      expect(data.refreshToken).not.toBe(refreshToken);
      
      accessToken = data.accessToken;
      refreshToken = data.refreshToken;
    });

    it("should reject invalid refresh token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: "invalid_token" }),
      });

      expect(response.status).toBe(401);
    });

    it("should reject expired or revoked refresh token", async () => {
      // First logout to revoke the token
      await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      // Then try to refresh with the now-revoked token
      const response = await fetch(`${baseUrl}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe("POST /api/auth/logout", () => {
    it("should logout with valid access token", async () => {
      // First login to get a fresh session
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });
      const loginData: any = await loginResponse.json();
      accessToken = loginData.accessToken;

      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(data).toHaveProperty("message");
    });

    it("should reject logout without authentication", async () => {
      const response = await fetch(`${baseUrl}/api/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/auth/sessions", () => {
    beforeAll(async () => {
      // Login to create a session
      const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });
      const loginData: any = await loginResponse.json();
      accessToken = loginData.accessToken;
    });

    it("should retrieve user sessions with valid token", async () => {
      const response = await fetch(`${baseUrl}/api/auth/sessions`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      expect(response.status).toBe(200);
      const data: any = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    it("should reject session retrieval without authentication", async () => {
      const response = await fetch(`${baseUrl}/api/auth/sessions`);

      expect(response.status).toBe(401);
    });
  });

  describe("Role-based access", () => {
    it("should return correct user role in auth response", async () => {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password,
        }),
      });

      const data: any = await response.json();
      expect(data.user.role).toBe("patient");
    });
  });

  describe("Security & Core Services (OTP, Audit Integrity, Patient Access)", () => {
    it("should generate and verify email verification, password reset, and 2FA tokens via otp-service", async () => {
      const emailTok = emailVerificationService.generateVerificationToken();
      expect(emailTok.token).toHaveLength(32);
      expect(emailVerificationService.verifyToken(emailTok.token, emailTok.hashedToken, emailTok.expiresAt)).toBe(true);
      expect(emailVerificationService.verifyToken("wrong", emailTok.hashedToken, emailTok.expiresAt)).toBe(false);

      const resetTok = passwordResetService.generateResetToken();
      expect(passwordResetService.verifyToken(resetTok.token, resetTok.hashedToken, resetTok.expiresAt)).toBe(true);

      const otp = twoFactorService.generateOTP();
      expect(otp.code).toMatch(/^\d{6}$/);
      expect(twoFactorService.verifyOTP(otp.code, otp.hashedCode, otp.expiresAt)).toBe(true);

      const dbOtp = await otpService.createAndSendOTP({
        userId,
        email: testUser.email,
        purpose: "mfa",
        deliveryMethod: "email",
      });
      expect(dbOtp.code).toMatch(/^\d{6}$/);
      expect(await otpService.verifyOTP(userId, "000000", "mfa")).toBe(false);
      expect(await otpService.verifyOTP(userId, dbOtp.code, "mfa")).toBe(true);
      // Single-use: second verification of same code must fail
      expect(await otpService.verifyOTP(userId, dbOtp.code, "mfa")).toBe(false);

      const rlKey = `test-rl-${Date.now()}`;
      expect(await rateLimiter.isRateLimited(rlKey, 2, 60)).toBe(false);
      expect(await rateLimiter.isRateLimited(rlKey, 2, 60)).toBe(false);
      expect(await rateLimiter.isRateLimited(rlKey, 2, 60)).toBe(true);
      await rateLimiter.reset(rlKey);
    });

    it("should enforce MFA challenge on login when user.mfaEnabled is true", async () => {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });

      try {
        // 1. Login without mfaCode returns mfaRequired: true
        const challengeRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
          }),
        });
        expect(challengeRes.status).toBe(200);
        const challengeData: any = await challengeRes.json();
        expect(challengeData.mfaRequired).toBe(true);
        expect(challengeData.userId).toBe(userId);

        // 2. Login with invalid mfaCode returns 401
        const badMfaRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            mfaCode: "000000",
          }),
        });
        expect(badMfaRes.status).toBe(401);

        // 3. Issue a known OTP and complete MFA login
        const issued = await otpService.createAndSendOTP({
          userId,
          email: testUser.email,
          purpose: "mfa",
          deliveryMethod: "email",
        });
        const goodMfaRes = await fetch(`${baseUrl}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: testUser.email,
            password: testUser.password,
            mfaCode: issued.code,
          }),
        });
        expect(goodMfaRes.status).toBe(200);
        const goodMfaData: any = await goodMfaRes.json();
        expect(goodMfaData).toHaveProperty("accessToken");
      } finally {
        await prisma.user.update({
          where: { id: userId },
          data: { mfaEnabled: false },
        });
      }
    });

    it("should maintain a valid cryptographic hash chain via audit-integrity", async () => {
      const entry = await createAuditLogWithIntegrity({
        action: "AUTH_INTEGRATION_TEST_EVENT",
        actorId: userId,
        resourceId: userId,
        sessionId: null,
        ipHash: "test_ip_hash",
        metadata: { test: true },
      });
      expect(entry.integrityHash).toBeTruthy();
      expect(isCriticalAuditEvent("UNAUTHORIZED_ACCESS_ATTEMPT")).toBe(true);
      expect(isCriticalAuditEvent("AUTH_INTEGRATION_TEST_EVENT")).toBe(false);

      const integrity = await verifyAuditIntegrity(1000);
      expect(integrity.valid).toBe(true);
      expect(integrity.verified).toBe(true);
    });

    it("should enforce BOLA/RBAC in requirePatientRecordAccess and requireActiveAppointmentContext", async () => {
      const profile = await prisma.patientProfile.findUnique({ where: { userId } });
      expect(profile).not.toBeNull();

      const makeMockRes = () => {
        const res: any = { statusCode: 200, body: null };
        res.status = (code: number) => {
          res.statusCode = code;
          return res;
        };
        res.json = (payload: any) => {
          res.body = payload;
          return res;
        };
        return res;
      };

      // Own patient access succeeds by both userId and profile.id
      const ownRes = makeMockRes();
      const ownResult = await requirePatientRecordAccess(
        { params: { id: profile!.id }, user: { sub: userId, role: "patient", sessionId: "s1" } } as any,
        ownRes
      );
      expect(ownResult?.id).toBe(profile!.id);

      // Different patient access is rejected with 403
      const otherRes = makeMockRes();
      const otherResult = await requirePatientRecordAccess(
        { params: { id: profile!.id }, user: { sub: "00000000-0000-0000-0000-000000000099", role: "patient", sessionId: "s2" } } as any,
        otherRes
      );
      expect(otherResult).toBeNull();
      expect(otherRes.statusCode).toBe(403);

      // Non-clinician cannot modify clinical records in requireActiveAppointmentContext
      const activeRes = makeMockRes();
      const activeResult = await requireActiveAppointmentContext(
        { params: { id: profile!.id }, user: { sub: userId, role: "patient", sessionId: "s1" } } as any,
        activeRes
      );
      expect(activeResult).toBeNull();
      expect(activeRes.statusCode).toBe(403);
    });
  });
});
