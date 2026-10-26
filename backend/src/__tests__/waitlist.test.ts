import http from "http";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";

describe("BE-11: Waitlist and DSPT route unmounting (D-20)", () => {
  let server: http.Server;
  let baseUrl: string;

  const tag = crypto.randomUUID().slice(0, 8);
  let patientToken = "";
  let adminToken = "";
  let patientId = "";

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    const patient = await prisma.user.create({
      data: { email: `waitlist-pat-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    patientId = patient.id;
    patientToken = signAccessToken({ sub: patient.id, role: "patient", sessionId: crypto.randomUUID() });

    const admin = await prisma.user.create({
      data: { email: `dspt-admin-${tag}@example.test`, passwordHash: "x", role: "admin" },
    });
    adminToken = signAccessToken({ sub: admin.id, role: "admin", sessionId: crypto.randomUUID() });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("returns 404 Not Found on GET and POST /api/waitlist", async () => {
    const getRes = await fetch(`${baseUrl}/api/waitlist`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(getRes.status).toBe(404);

    const postRes = await fetch(`${baseUrl}/api/waitlist`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patientToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferredDate: "2026-11-01", serviceId: "srv_checkup" }),
    });
    expect(postRes.status).toBe(404);
  });

  it("returns 404 Not Found on arbitrary waitlist subpaths", async () => {
    const res1 = await fetch(`${baseUrl}/api/waitlist/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res1.status).toBe(404);

    const res2 = await fetch(`${baseUrl}/api/waitlist/some-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res2.status).toBe(404);
  });

  it("returns 404 Not Found on /api/dspt and /api/dspt/dspt-report", async () => {
    const res1 = await fetch(`${baseUrl}/api/dspt`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res1.status).toBe(404);

    const res2 = await fetch(`${baseUrl}/api/dspt/dspt-report`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res2.status).toBe(404);
  });

  it("preserves the waitlist_entries table in the database (D-20)", async () => {
    const count = await prisma.waitlistEntry.count({ where: { userId: patientId } });
    expect(count).toBe(0);
  });
});
