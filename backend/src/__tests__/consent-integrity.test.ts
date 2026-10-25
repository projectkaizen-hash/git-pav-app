import http from "http";
import crypto from "crypto";
import express from "express";
import "express-async-errors";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import consentsRouter from "../routes/consents";
import patientsRouter from "../routes/patients";
import dependantsRouter from "../routes/patient-dependants";
import { errorHandler } from "../middleware/error-handler";
import { pseudonymiseIp } from "../lib/audit-security";

describe("CS-25: One source of truth for consent (PT-4, CO-1, DB-3, DP-1)", () => {
  let appServer: http.Server;
  let appUrl: string;
  let patientToken: string;
  let patientUserId: string;
  let patientProfileId: string;
  const tag = crypto.randomUUID().slice(0, 8);

  const created = {
    consentIds: [] as string[],
    dependantIds: [] as string[],
    auditActions: [] as string[],
  };

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use("/api/consents", consentsRouter);
    app.use("/api/patients/dependants", dependantsRouter);
    app.use("/api/patients", patientsRouter);
    app.use(errorHandler);

    appServer = http.createServer(app);
    await new Promise<void>((resolve) => appServer.listen(0, resolve));
    const port = (appServer.address() as any).port;
    appUrl = `http://localhost:${port}`;

    // Create synthetic patient user & profile
    const user = await prisma.user.create({
      data: {
        email: `consent-test-${tag}@example.test`,
        passwordHash: "synthetic_hash",
        role: "patient",
      },
    });
    patientUserId = user.id;

    const profile = await prisma.patientProfile.create({
      data: {
        userId: user.id,
        firstName: "Eleanor",
        lastName: "Rigby",
        dob: new Date("1988-04-12"), // Adult (> 18) for guardian checks
      },
    });
    patientProfileId = profile.id;

    patientToken = signAccessToken({
      sub: user.id,
      role: "patient",
      sessionId: crypto.randomUUID(),
    });
  });

  afterAll(async () => {
    // Teardown created consent records & dependants (leave user/profile for audit chain integrity)
    if (created.consentIds.length) {
      await prisma.consentRecord.deleteMany({ where: { id: { in: created.consentIds } } }).catch(() => {});
    }
    if (created.dependantIds.length) {
      await prisma.dependant.deleteMany({ where: { id: { in: created.dependantIds } } }).catch(() => {});
    }
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
  });

  describe("PT-4: Profile PUT cannot modify consents", () => {
    it("rejects attempts to update consents via PUT /api/patients/:id/profile with 400 Bad Request", async () => {
      const res = await fetch(`${appUrl}/api/patients/${patientProfileId}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          firstName: "Eleanor Updated",
          consents: { marketing: true, clinical_records: false },
        }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Invalid request body");
      expect(JSON.stringify(data)).toContain("consents");
    });

    it("allows valid profile updates without consents field", async () => {
      const res = await fetch(`${appUrl}/api/patients/${patientProfileId}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          firstName: "Eleanor Updated",
          city: "Liverpool",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.firstName).toBe("Eleanor Updated");
      expect(data.city).toBe("Liverpool");
    });
  });

  describe("CO-1 & DB-3: Transactional consent grant/withdraw and server-observed hashed IP", () => {
    it("grants consent with version 1, server-hashed IP, audit log, and ignores client-supplied IP", async () => {
      const spoofedClientIp = "203.0.113.195";

      const res = await fetch(`${appUrl}/api/consents/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          consentType: "clinical_records",
          lawfulBasis: "consent",
          ipAddress: spoofedClientIp, // Client attempting to forge IP evidence
          metadata: { channel: "mobile_app" },
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.consentType).toBe("clinical_records");
      expect(data.version).toBe(1);
      expect(data.isGranted).toBe(true);
      created.consentIds.push(data.id);

      // Verify the stored record does NOT contain the spoofed client IP
      const record = await prisma.consentRecord.findUniqueOrThrow({
        where: { id: data.id },
      });
      expect(record.ipAddress).not.toBe(spoofedClientIp);
      expect(record.ipAddress).toMatch(/^[a-f0-9]{64}$/);
      // Server-observed loopback address (::1 or 127.0.0.1) hashed
      expect([
        pseudonymiseIp("::1"),
        pseudonymiseIp("127.0.0.1"),
        pseudonymiseIp("::ffff:127.0.0.1"),
      ]).toContain(record.ipAddress);

      // Verify an audit log entry was created with integrity
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "consent.granted",
          resourceId: patientProfileId,
        },
        orderBy: { timestampUtc: "desc" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.integrityHash).toBeTruthy();
      expect((audit?.metadata as any)?.version).toBe(1);
    });

    it("incrementally versions consent and marks previous version withdrawn on re-grant", async () => {
      const res = await fetch(`${appUrl}/api/consents/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          consentType: "clinical_records",
          lawfulBasis: "consent",
          metadata: { re_consented: true },
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.version).toBe(2);
      expect(data.isGranted).toBe(true);
      created.consentIds.push(data.id);

      // Verify version 1 was withdrawn
      const v1 = await prisma.consentRecord.findUniqueOrThrow({
        where: {
          patientProfileId_consentType_version: {
            patientProfileId,
            consentType: "clinical_records",
            version: 1,
          },
        },
      });
      expect(v1.isGranted).toBe(false);
      expect(v1.withdrawnAt).not.toBeNull();
    });

    it("withdraws active consent transactionally and records audit entry", async () => {
      const res = await fetch(`${appUrl}/api/consents/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          consentType: "clinical_records",
        }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.consentType).toBe("clinical_records");
      expect(data.version).toBe(2);
      expect(data.isGranted).toBe(false);
      expect(data.withdrawnAt).toBeTruthy();

      // Verify database reflects withdrawn status
      const v2 = await prisma.consentRecord.findUniqueOrThrow({
        where: { id: data.id },
      });
      expect(v2.isGranted).toBe(false);

      // Verify audit log
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "consent.withdrawn",
          resourceId: patientProfileId,
        },
        orderBy: { timestampUtc: "desc" },
      });
      expect(audit).not.toBeNull();
      expect(audit?.integrityHash).toBeTruthy();
    });

    it("returns 404 when attempting to withdraw already-withdrawn consent", async () => {
      const res = await fetch(`${appUrl}/api/consents/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          consentType: "clinical_records",
        }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe("DP-1: Guardian consent record creation for dependants", () => {
    it("transactionally creates Dependant and guardian_consent ConsentRecord", async () => {
      const res = await fetch(`${appUrl}/api/patients/dependants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          firstName: "Timmy",
          lastName: "Rigby",
          dob: "2018-06-20",
          relationship: "Son",
          consentSigned: true,
        }),
      });

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.firstName).toBe("Timmy");
      expect(data.relationship).toBe("Son");
      expect(data.consentSigned).toBe(true);
      expect(data.consentRecordId).toBeDefined();
      created.dependantIds.push(data.id);
      created.consentIds.push(data.consentRecordId);

      // Verify guardian_consent ConsentRecord exists in database
      const consent = await prisma.consentRecord.findUniqueOrThrow({
        where: { id: data.consentRecordId },
      });
      expect(consent.consentType).toBe("guardian_consent");
      expect(consent.lawfulBasis).toBe("vital_interests");
      expect(consent.isGranted).toBe(true);
      expect((consent.metadata as any)?.childName).toBe("Timmy Rigby");
      expect(consent.ipAddress).toMatch(/^[a-f0-9]{64}$/);
      // Server-observed loopback address (::1 or 127.0.0.1) hashed
      expect([
        pseudonymiseIp("::1"),
        pseudonymiseIp("127.0.0.1"),
        pseudonymiseIp("::ffff:127.0.0.1"),
      ]).toContain(consent.ipAddress);

      // Verify audit entry
      const audit = await prisma.auditLog.findFirst({
        where: {
          action: "patient.dependant.created",
          resourceId: patientProfileId,
        },
        orderBy: { timestampUtc: "desc" },
      });
      expect(audit).not.toBeNull();
      expect((audit?.metadata as any)?.dependantId).toBe(data.id);
    });
  });

  describe("PT-4: Profile GET reflects single source of truth from ConsentRecord", () => {
    it("loads active consents from ConsentRecord in GET /api/patients/:id/profile", async () => {
      // Grant telehealth consent
      const grantRes = await fetch(`${appUrl}/api/consents/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          consentType: "telehealth",
          lawfulBasis: "consent",
        }),
      });
      const grantData = (await grantRes.json()) as any;
      created.consentIds.push(grantData.id);

      // Now GET profile
      const profileRes = await fetch(`${appUrl}/api/patients/${patientProfileId}/profile`, {
        headers: {
          Authorization: `Bearer ${patientToken}`,
        },
      });

      expect(profileRes.status).toBe(200);
      const profileData = (await profileRes.json()) as any;
      expect(profileData.consents.telehealth).toBe(true);
      expect(profileData.consents.guardian_consent).toBe(true);
      expect(profileData.consents.clinical_records).toBeUndefined(); // Withdrawn earlier
    });
  });
});
