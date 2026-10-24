import http from "http";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";

describe("CS-32: Waitlist removal (WL-1, Decision #13)", () => {
  let server: http.Server;
  let baseUrl: string;

  const tag = crypto.randomUUID().slice(0, 8);
  let patientToken = "";
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
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("requires authentication for waitlist endpoints", async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`);
    expect(res.status).toBe(401);
  });

  it("returns 410 Gone with informative message on GET /api/waitlist", async () => {
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res.status).toBe(410);
    const body = (await res.json()) as any;
    expect(body.error).toContain("waitlist is no longer available");
  });

  it("returns 410 Gone on POST /api/waitlist and does not persist any entry", async () => {
    const preCount = await prisma.waitlistEntry.count({ where: { userId: patientId } });
    const res = await fetch(`${baseUrl}/api/waitlist`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patientToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ preferredDate: "2026-11-01", serviceId: "srv_checkup" }),
    });
    expect(res.status).toBe(410);
    const postCount = await prisma.waitlistEntry.count({ where: { userId: patientId } });
    expect(postCount).toBe(preCount);
  });

  it("returns 410 Gone on arbitrary subpaths (e.g. /api/waitlist/join, /api/waitlist/123)", async () => {
    const res1 = await fetch(`${baseUrl}/api/waitlist/join`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res1.status).toBe(410);

    const res2 = await fetch(`${baseUrl}/api/waitlist/some-id`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    expect(res2.status).toBe(410);
  });
});
