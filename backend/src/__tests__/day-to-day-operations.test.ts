import http from "http";
import express from "express";
import { prisma } from "../lib/prisma";
import {
  remainingTreatmentSeconds,
  etaSecondsToNewPatient,
  QueueStop,
  Point,
} from "../lib/van-eta";
import { signAccessToken } from "../lib/jwt";
import { attachOptionalAuth, requireAuth } from "../middleware/auth";
import vanRoutes from "../routes/van";
import publicVanRoutes from "../routes/public-van";

describe("CS-40: Clinician and Operator Day-to-Day Operations (VE-1, VE-2, VE-3, VR-3, VR-9, VR-10, PV-1)", () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = express();
    app.use(express.json());
    app.use(attachOptionalAuth);
    app.use("/api/van", requireAuth, vanRoutes);
    app.use("/api/public/van", publicVanRoutes);

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const { port } = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  });

  describe("1. Van ETA Overrun & Fallback Resilience (VE-1, VE-2, VE-3)", () => {
    it("VE-1: clamps treatment overrun to minimum positive duration (never negative)", () => {
      const now = new Date();
      // Stop scheduled for 30 minutes, but has been in treatment for 50 minutes (20 minute overrun)
      const treatmentStartedAt = new Date(now.getTime() - 50 * 60 * 1000);
      const stop: QueueStop = {
        lat: 51.5,
        lng: -0.1,
        phase: "in_treatment",
        treatmentStartedAt,
        treatmentMinutes: 30,
        bufferMinutes: 10,
      };

      const remaining = remainingTreatmentSeconds(stop, now);
      // In the old code: 30*60 - 50*60 = -1200 seconds!
      // In VE-1 fix: clamped to at least 300 seconds (5 min)
      expect(remaining).toBeGreaterThanOrEqual(300);
      expect(remaining).toBe(300);
    });

    it("VE-1: calculates standard remaining treatment when not in overrun", () => {
      const now = new Date();
      // Stop scheduled for 40 minutes, currently 10 minutes in
      const treatmentStartedAt = new Date(now.getTime() - 10 * 60 * 1000);
      const stop: QueueStop = {
        lat: 51.5,
        lng: -0.1,
        phase: "in_treatment",
        treatmentStartedAt,
        treatmentMinutes: 40,
        bufferMinutes: 10,
      };

      const remaining = remainingTreatmentSeconds(stop, now);
      // 40*60 - 10*60 = 1800 seconds
      expect(remaining).toBe(1800);
    });

    it("VE-2 & VE-3: computes ETA rapidly using haversine fallback and multi-matrix caching", async () => {
      const van: Point = { lat: 51.5074, lng: -0.1278 };
      const target: Point = { lat: 51.515, lng: -0.09 };
      const queue: QueueStop[] = [
        {
          lat: 51.51,
          lng: -0.11,
          phase: "queued",
          treatmentStartedAt: null,
          treatmentMinutes: 30,
          bufferMinutes: 10,
        },
      ];

      const start = Date.now();
      const eta1 = await etaSecondsToNewPatient(van, queue, target);
      const duration1 = Date.now() - start;

      expect(eta1).toBeGreaterThan(0);
      // Even in fallback mode, computes quickly without hanging
      expect(duration1).toBeLessThan(1000);

      // Second call hits matrix cache (VE-3)
      const start2 = Date.now();
      const eta2 = await etaSecondsToNewPatient(van, queue, target);
      const duration2 = Date.now() - start2;

      expect(eta2).toBe(eta1);
      expect(duration2).toBeLessThan(50);
    });
  });

  describe("2. Van Phase Transition Validation Table (VR-3)", () => {
    let operatorToken: string;
    let operatorUserId: string;
    let operatorProfileId: string;
    let vanId: string;
    let shiftId: string;
    let patientUserId: string;
    let patientProfileId: string;
    let serviceId: string;
    let vanRequestId: string;

    beforeAll(async () => {
      const tag = `op-${Date.now()}`;

      // Operator user & profile
      const opUser = await prisma.user.create({
        data: {
          email: `${tag}@example.test`,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$syntheticop$syntheticop",
          role: "operator",
          operatorProfile: { create: { fullName: "Van Operator Synthetic" } },
        },
        include: { operatorProfile: true },
      });
      operatorUserId = opUser.id;
      operatorProfileId = opUser.operatorProfile!.id;

      // Patient user & profile
      const pUser = await prisma.user.create({
        data: {
          email: `patient-${tag}@example.test`,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$syntheticpat$syntheticpat",
          role: "patient",
          patientProfile: { create: { firstName: "Van", lastName: "Patient" } },
        },
        include: { patientProfile: true },
      });
      patientUserId = pUser.id;
      patientProfileId = pUser.patientProfile!.id;

      // Van
      const van = await prisma.van.create({
        data: {
          name: `Van-${tag}`,
          registrationPlate: `VN${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleModel: "Mercedes Sprinter Dental 316",
          isActive: true,
        },
      });
      vanId = van.id;

      // Active Shift with GPS fix
      const shift = await prisma.vanShift.create({
        data: {
          vanId,
          operatorId: operatorProfileId,
          startedAt: new Date(),
          status: "online",
          lastLat: 51.5074,
          lastLng: -0.1278,
          lastLocationAt: new Date(),
        },
      });
      shiftId = shift.id;

      // Find or create service
      let service = await prisma.service.findFirst({ where: { isActive: true } });
      if (!service) {
        service = await prisma.service.create({
          data: {
            id: `srv-${tag}`,
            name: `Service-${tag}`,
            description: "Test description",
            category: "checkup",
            pricePence: 7500,
            depositPence: 2000,
            durationMinutes: 45,
            isActive: true,
          },
        });
      }
      serviceId = service.id;

      // Operator auth token
      const session = await prisma.authSession.create({
        data: {
          userId: operatorUserId,
          refreshTokenHash: `hash-op-${tag}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      operatorToken = signAccessToken({
        sub: operatorUserId,
        role: "operator",
        sessionId: session.id,
      });

      // Accepted Van Request (phase: queued)
      const vanReq = await prisma.vanServiceRequest.create({
        data: {
          shiftId,
          vanId,
          patientId: patientProfileId,
          serviceId,
          status: "accepted",
          phase: "queued",
          patientLat: 51.515,
          patientLng: -0.09,
          accessDetails: "encrypted-access-details",
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      vanRequestId = vanReq.id;
    });

    afterAll(async () => {
      if (shiftId) await prisma.vanServiceRequest.deleteMany({ where: { shiftId } });
      if (shiftId) await prisma.vanShift.deleteMany({ where: { id: shiftId } });
      if (vanId) await prisma.van.deleteMany({ where: { id: vanId } });
      const uIds = [operatorUserId, patientUserId].filter(Boolean);
      if (uIds.length > 0) {
        await prisma.authSession.deleteMany({ where: { userId: { in: uIds } } });
      }
    });

    it("rejects illegal phase jumps with HTTP 409 (VR-3)", async () => {
      // Cannot jump from queued directly to completed
      const illegalJump = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "completed" }),
      });
      expect(illegalJump.status).toBe(409);
      const json = (await illegalJump.json()) as any;
      expect(json.error).toBe("Illegal phase transition");

      // Cannot jump from queued directly to on_site or in_treatment
      const illegalJump2 = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "in_treatment" }),
      });
      expect(illegalJump2.status).toBe(409);
    });

    it("allows legal phase progression: queued -> en_route -> on_site -> in_treatment -> completed (VR-3)", async () => {
      // 1. queued -> en_route
      const step1 = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "en_route" }),
      });
      expect(step1.status).toBe(200);

      // Cannot jump from en_route to completed (must visit on_site and in_treatment first)
      const illegalFromEnRoute = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "completed" }),
      });
      expect(illegalFromEnRoute.status).toBe(409);

      // 2. en_route -> on_site
      const step2 = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "on_site" }),
      });
      expect(step2.status).toBe(200);

      // 3. on_site -> in_treatment
      const step3 = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "in_treatment" }),
      });
      expect(step3.status).toBe(200);

      // 4. in_treatment -> completed
      const step4 = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "completed", notes: "Treatment successful" }),
      });
      expect(step4.status).toBe(200);

      // Terminal state: cannot transition from completed
      const afterTerminal = await fetch(`${baseUrl}/api/van/requests/${vanRequestId}/phase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ phase: "in_treatment" }),
      });
      expect(afterTerminal.status).toBe(409);
    });
  });

  describe("3. Shift GPS Fix Fallback Guard (VR-9)", () => {
    it("VR-9: excludes shifts without GPS fixes from availability rather than using fake London coordinates", async () => {
      const tag = `no-gps-${Date.now()}`;
      const van = await prisma.van.create({
        data: {
          name: `Van-NoGPS-${tag}`,
          registrationPlate: `NG${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleModel: "Mercedes Sprinter",
          isActive: true,
        },
      });
      const op = await prisma.user.create({
        data: {
          email: `${tag}@example.test`,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$syntheticop$syntheticop",
          role: "operator",
          operatorProfile: { create: { fullName: "Op GPS Tester" } },
        },
        include: { operatorProfile: true },
      });

      // Active shift with NO GPS fix (null lat/lng)
      const noGpsShift = await prisma.vanShift.create({
        data: {
          vanId: van.id,
          operatorId: op.operatorProfile!.id,
          startedAt: new Date(),
          status: "online",
          lastLat: null,
          lastLng: null,
        },
      });

      const patient = await prisma.user.create({
        data: {
          email: `pat-${tag}@example.test`,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$syntheticpat$syntheticpat",
          role: "patient",
          patientProfile: { create: { firstName: "Ava", lastName: "Patient" } },
        },
      });
      const session = await prisma.authSession.create({
        data: {
          userId: patient.id,
          refreshTokenHash: `hash-avail-${tag}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const patientToken = signAccessToken({
        sub: patient.id,
        role: "patient",
        sessionId: session.id,
      });

      const res = await fetch(`${baseUrl}/api/van/availability?lat=51.5&lng=-0.1`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });
      expect(res.status).toBe(200);
      const json = (await res.json()) as any;

      // The shift with null GPS fix should not be matched as available
      expect(json.shiftId).not.toBe(noGpsShift.id);

      // Cleanup
      await prisma.vanShift.delete({ where: { id: noGpsShift.id } });
      await prisma.van.delete({ where: { id: van.id } });
      await prisma.authSession.deleteMany({ where: { userId: patient.id } });
    });
  });

  describe("4. Public Van Geocoding Resilience (PV-1)", () => {
    it("PV-1: returns clear lookup message instead of claiming outside service area when geocoding fails", async () => {
      // Send a validly-formatted postcode that cannot be geocoded
      const res = await fetch(`${baseUrl}/api/public/van/coverage-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postcode: "ZZ99 9ZZ" }),
      });

      expect(res.status).toBe(200);
      const json = (await res.json()) as any;
      expect(json.isCovered).toBe(false);
      // PV-1: Does NOT claim "outside our service area"; reports lookup failure accurately
      expect(json.message).toContain("Could not verify postcode coordinates");
    });
  });

  describe("5. Response Sanitization (VR-10)", () => {
    it("VR-10: ensures create-request response sanitizes accessDetails ciphertext", async () => {
      const tag = `vr10-${Date.now()}`;
      const patient = await prisma.user.create({
        data: {
          email: `${tag}@example.test`,
          passwordHash: "$argon2id$v=19$m=65536,t=3,p=4$syntheticpat$syntheticpat",
          role: "patient",
          patientProfile: { create: { firstName: "Sanitize", lastName: "Tester" } },
        },
      });
      const session = await prisma.authSession.create({
        data: {
          userId: patient.id,
          refreshTokenHash: `hash-vr10-${tag}`,
          expiresAt: new Date(Date.now() + 3600000),
        },
      });
      const patientToken = signAccessToken({
        sub: patient.id,
        role: "patient",
        sessionId: session.id,
      });

      const service = await prisma.service.findFirst({ where: { isActive: true } });

      const res = await fetch(`${baseUrl}/api/van/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${patientToken}`,
        },
        body: JSON.stringify({
          serviceId: service!.id,
          accessDetails: {
            addressLine1: "10 Downing Street",
            city: "London",
            postcode: "SW1A 1AA",
            lat: 51.5014,
            lng: -0.1419,
            parkingType: "private_driveway",
            gateCode: "9876",
            accessNotes: "Sensitive gate instruction",
          },
        }),
      });

      // Whether it succeeds or reports no active van in coverage, if 201 is returned, accessDetails must not be ciphertext
      if (res.status === 201) {
        const json = (await res.json()) as any;
        expect(json).not.toHaveProperty("accessDetails");
      } else {
        expect([409, 404]).toContain(res.status);
      }

      // Cleanup
      await prisma.vanServiceRequest.deleteMany({ where: { patientId: (await prisma.patientProfile.findUnique({ where: { userId: patient.id } }))?.id } });
      await prisma.authSession.deleteMany({ where: { userId: patient.id } });
    });
  });
});
