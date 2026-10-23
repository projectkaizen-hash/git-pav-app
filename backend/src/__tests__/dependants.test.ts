import http from "http";
import crypto from "crypto";
import { ageInYears, parseIsoDate } from "../lib/age";

// CS-34 (decisions log #17): only an adult parent or guardian adds a child,
// only children under 16 are added, and under-16s cannot hold their own
// account. Synthetic data only.
describe("dependants", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let signAccessToken: typeof import("../lib/jwt").signAccessToken;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const profileIds: string[] = [];

  const yearsAgo = (years: number, days = 0) => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - years);
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().slice(0, 10);
  };

  async function makePatient(label: string, dob: string | null) {
    const user = await prisma.user.create({
      data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({
      data: { userId: user.id, firstName: "Synthetic", lastName: "Guardian", dob: dob ? new Date(dob) : null },
    });
    profileIds.push(profile.id);
    const token = signAccessToken({ sub: user.id, role: "patient", sessionId: crypto.randomUUID() });
    return { profileId: profile.id, token };
  }

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    signAccessToken = require("../lib/jwt").signAccessToken;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3011, resolve));
    baseUrl = "http://localhost:3011";
  });

  afterAll(async () => {
    await prisma.dependant.deleteMany({ where: { guardianId: { in: profileIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const addChild = (token: string, body: Record<string, unknown>) =>
    fetch(`${baseUrl}/api/patients/dependants`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Synthetic", lastName: "Child", dob: yearsAgo(8), relationship: "Daughter", consentSigned: true, ...body }),
    });

  it("adds a child under 16 for an adult guardian", async () => {
    const { token } = await makePatient("adult", yearsAgo(35));
    expect((await addChild(token, {})).status).toBe(201);
    // A child one day short of 16 is still under 16.
    expect((await addChild(token, { dob: yearsAgo(16, -1) })).status).toBe(201);
  });

  it("asks for the guardian's date of birth first", async () => {
    const { token } = await makePatient("no-dob", null);
    expect((await addChild(token, {})).status).toBe(422);
  });

  it("refuses a guardian under 18", async () => {
    const { token } = await makePatient("minor", yearsAgo(17));
    expect((await addChild(token, {})).status).toBe(403);
  });

  it("refuses a child aged 16 or over", async () => {
    const { token } = await makePatient("adult-16", yearsAgo(40));
    expect((await addChild(token, { dob: yearsAgo(16) })).status).toBe(422);
  });

  it("refuses relationships other than parent or guardian, and missing confirmation", async () => {
    const { token } = await makePatient("adult-other", yearsAgo(40));
    expect((await addChild(token, { relationship: "Other" })).status).toBe(400);
    expect((await addChild(token, { consentSigned: false })).status).toBe(400);
    expect((await addChild(token, { dob: "2020-02-30" })).status).toBe(400);
    expect((await addChild(token, { dob: yearsAgo(-1) })).status).toBe(400);
  });

  it("does not let an under-16 set up their own profile", async () => {
    const { profileId, token } = await makePatient("self", null);
    const put = (dob: string) =>
      fetch(`${baseUrl}/api/patients/${profileId}/profile`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ dob }),
      });
    expect((await put(yearsAgo(14))).status).toBe(422);
    expect((await put(yearsAgo(16))).status).toBe(200);
  });

  it("counts age in whole years", () => {
    expect(ageInYears(parseIsoDate("2010-06-15")!, new Date("2026-06-14T12:00:00Z"))).toBe(15);
    expect(ageInYears(parseIsoDate("2010-06-15")!, new Date("2026-06-15T00:00:00Z"))).toBe(16);
    expect(parseIsoDate("2024-02-29")).not.toBeNull();
    expect(parseIsoDate("2023-02-29")).toBeNull();
  });
});
