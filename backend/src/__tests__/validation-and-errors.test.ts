import http from "http";
import express from "express";
import "express-async-errors";
import multer from "multer";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { errorHandler, HttpError } from "../middleware/error-handler";
import { prisma } from "../lib/prisma";

// CS-21: Validation errors return structured issues (VA-1); error handler
// honours 4xx status codes and maps multer errors (EH-2); appointments/:id
// endpoint returns a single appointment respecting patient isolation.
describe("CS-21: Validation & Error Handling & Single Appointment", () => {
  let appServer: http.Server;
  let appUrl: string;
  let mainServer: http.Server;
  let mainUrl: string;
  let patientToken: string;
  let otherPatientToken: string;
  let appointmentId: string;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    // 1. Standalone app to test validate middleware and errorHandler mapping
    const app = express();
    app.use(express.json());

    const testSchema = z.object({
      email: z.string().email("Invalid email address"),
      age: z.number().min(18, "Must be at least 18"),
    });

    app.post("/test-validate", validateBody(testSchema), (_req, res) => {
      res.json({ ok: true });
    });

    const testMulter = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 }, // 10 bytes limit
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === "image/png") {
          cb(null, true);
        } else {
          cb(new HttpError(400, "Only PNG images are allowed"));
        }
      },
    });

    app.post("/test-upload", testMulter.single("file"), (_req, res) => {
      res.json({ ok: true });
    });

    app.get("/test-http-error", () => {
      throw new HttpError(403, "Custom forbidden message");
    });

    app.use(errorHandler);

    appServer = http.createServer(app);
    await new Promise<void>((resolve) => appServer.listen(0, resolve));
    const appPort = (appServer.address() as any).port;
    appUrl = `http://localhost:${appPort}`;

    // 2. Main backend server for GET /api/booking/appointments/:id
    const serverModule = require("../server");
    const mainApp = serverModule.default ?? serverModule;
    mainServer = http.createServer(mainApp);
    await new Promise<void>((resolve) => mainServer.listen(0, resolve));
    const mainPort = (mainServer.address() as any).port;
    mainUrl = `http://localhost:${mainPort}`;

    // Seed patient 1
    const email1 = `cs21-pt1-${Date.now()}@example.test`;
    const reg1 = await fetch(`${mainUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email1, password: "Password123!", firstName: "Alice", lastName: "Test" }),
    });
    expect(reg1.status).toBe(201);
    const reg1Data = (await reg1.json()) as any;
    patientToken = reg1Data.accessToken;
    createdUserIds.push(reg1Data.user.id);

    // Seed patient 2
    const email2 = `cs21-pt2-${Date.now()}@example.test`;
    const reg2 = await fetch(`${mainUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email2, password: "Password123!", firstName: "Bob", lastName: "Test" }),
    });
    expect(reg2.status).toBe(201);
    const reg2Data = (await reg2.json()) as any;
    otherPatientToken = reg2Data.accessToken;
    createdUserIds.push(reg2Data.user.id);

    // Create an appointment for patient 1
    const user1 = await prisma.user.findUniqueOrThrow({
      where: { email: email1 },
      include: { patientProfile: true },
    });
    const service = await prisma.service.findFirstOrThrow();
    const clinic = await prisma.clinic.findFirstOrThrow();
    const clinician = await prisma.clinicianProfile.findFirstOrThrow();

    const apt = await prisma.appointment.create({
      data: {
        patientId: user1.patientProfile!.id,
        serviceId: service.id,
        clinicId: clinic.id,
        clinicianId: clinician.id,
        channel: "clinic",
        startTimeUtc: new Date(Date.now() + 86400000),
        endTimeUtc: new Date(Date.now() + 86400000 + 30 * 60000),
        status: "confirmed",
        totalPricePence: service.pricePence ?? 5000,
      },
    });
    appointmentId = apt.id;
  });

  afterAll(async () => {
    if (appointmentId) {
      await prisma.appointment.delete({ where: { id: appointmentId } }).catch(() => {});
    }
    await new Promise<void>((resolve) => appServer.close(() => resolve()));
    await new Promise<void>((resolve) => mainServer.close(() => resolve()));
    await prisma.$disconnect();
  });

  describe("VA-1: Structured validation error issues", () => {
    it("returns 400 with path and message for invalid request body", async () => {
      const res = await fetch(`${appUrl}/test-validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "not-an-email", age: 16 }),
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Invalid request body");
      expect(Array.isArray(data.issues)).toBe(true);
      expect(data.issues).toHaveLength(2);

      const emailIssue = data.issues.find((i: any) => i.path === "email");
      expect(emailIssue).toBeDefined();
      expect(emailIssue.message).toBe("Invalid email address");

      const ageIssue = data.issues.find((i: any) => i.path === "age");
      expect(ageIssue).toBeDefined();
      expect(ageIssue.message).toBe("Must be at least 18");
    });
  });

  describe("EH-2: 4xx status preservation and Multer mapping", () => {
    it("preserves HttpError status and message", async () => {
      const res = await fetch(`${appUrl}/test-http-error`);
      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Custom forbidden message");
    });

    it("returns 413 File too large when multer file size limit is exceeded", async () => {
      const formData = new FormData();
      const largeBlob = new Blob(["this is more than 10 bytes of text"], { type: "image/png" });
      formData.append("file", largeBlob, "test.png");

      const res = await fetch(`${appUrl}/test-upload`, {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(413);
      const data = (await res.json()) as any;
      expect(data.error).toBe("File too large");
    });

    it("returns 400 when multer fileFilter rejects file", async () => {
      const formData = new FormData();
      const badFile = new Blob(["test"], { type: "text/plain" });
      formData.append("file", badFile, "test.txt");

      const res = await fetch(`${appUrl}/test-upload`, {
        method: "POST",
        body: formData,
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Only PNG images are allowed");
    });

    it("returns 400 for malformed JSON from body-parser", async () => {
      const res = await fetch(`${appUrl}/test-validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ invalid json",
      });

      expect(res.status).toBe(400);
      const data = (await res.json()) as any;
      expect(data.error).toBeDefined();
      expect(data.error).not.toBe("Internal server error");
    });
  });

  describe("GET /api/booking/appointments/:id", () => {
    it("returns 200 with appointment details for the owning patient", async () => {
      const res = await fetch(`${mainUrl}/api/booking/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.id).toBe(appointmentId);
      expect(data.service).toBeDefined();
      expect(data.clinician).toBeDefined();
      expect(data.clinic).toBeDefined();
    });

    it("returns 404 for a different patient trying to access another patient's appointment", async () => {
      const res = await fetch(`${mainUrl}/api/booking/appointments/${appointmentId}`, {
        headers: { Authorization: `Bearer ${otherPatientToken}` },
      });

      expect(res.status).toBe(404);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Appointment not found");
    });

    it("returns 404 for a nonexistent appointment id", async () => {
      const res = await fetch(`${mainUrl}/api/booking/appointments/00000000-0000-0000-0000-000000000000`, {
        headers: { Authorization: `Bearer ${patientToken}` },
      });

      expect(res.status).toBe(404);
      const data = (await res.json()) as any;
      expect(data.error).toBe("Appointment not found");
    });
  });
});
