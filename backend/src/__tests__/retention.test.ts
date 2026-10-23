import http from "http";
import crypto from "crypto";

// CS-23: van location history is kept 30 days. The sweep only counts until
// RETENTION_ENFORCE is on; clinical records and audit logs are only ever
// reported. Synthetic data only.
describe("retention sweep", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let retention: typeof import("../lib/retention");
  let signAccessToken: typeof import("../lib/jwt").signAccessToken;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  let vanId = "";
  let oldShiftId = "";
  let liveShiftId = "";
  let adminToken = "";
  const DAY = 24 * 60 * 60 * 1000;

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    retention = require("../lib/retention");
    signAccessToken = require("../lib/jwt").signAccessToken;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3019, resolve));
    baseUrl = "http://localhost:3019";

    const admin = await prisma.user.create({ data: { email: `ret-admin-${tag}@example.test`, passwordHash: "x", role: "admin" } });
    userIds.push(admin.id);
    adminToken = signAccessToken({ sub: admin.id, role: "admin", sessionId: crypto.randomUUID() });

    const operatorUser = await prisma.user.create({ data: { email: `ret-operator-${tag}@example.test`, passwordHash: "x", role: "operator" } });
    userIds.push(operatorUser.id);
    const operator = await prisma.operatorProfile.create({ data: { userId: operatorUser.id, fullName: "Synthetic Operator" } });
    vanId = (await prisma.van.create({ data: { name: `Synthetic Van ${tag}`, registrationPlate: `ZZ${tag}`, vehicleModel: "Test" } })).id;

    const old = new Date(Date.now() - 40 * DAY);
    oldShiftId = (
      await prisma.vanShift.create({
        data: { vanId, operatorId: operator.id, status: "offline", startedAt: old, endedAt: old, lastLat: 51.5, lastLng: -0.1, lastLocationAt: old },
      })
    ).id;
    liveShiftId = (await prisma.vanShift.create({ data: { vanId, operatorId: operator.id, lastLat: 51.5, lastLng: -0.1, lastLocationAt: new Date() } })).id;
    await prisma.vanLocationPing.createMany({
      data: [
        { shiftId: oldShiftId, lat: 51.5, lng: -0.1, recordedAt: old },
        { shiftId: oldShiftId, lat: 51.5, lng: -0.1, recordedAt: new Date(Date.now() - 31 * DAY) },
        { shiftId: liveShiftId, lat: 51.5, lng: -0.1, recordedAt: new Date(Date.now() - 29 * DAY) },
        { shiftId: liveShiftId, lat: 51.5, lng: -0.1, recordedAt: new Date() },
      ],
    });
  });

  afterAll(async () => {
    await prisma.vanShift.deleteMany({ where: { vanId } });
    await prisma.van.deleteMany({ where: { id: vanId } });
    await prisma.operatorProfile.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const pings = (shiftId: string) => prisma.vanLocationPing.count({ where: { shiftId } });

  it("only counts while enforcement is off", async () => {
    const result = await retention.applyVanLocationRetention({ enforce: false });
    expect(result).toMatchObject({ enforced: false, pingsDeleted: 0, shiftsCleared: 0 });
    expect(result.wouldDelete).toBeGreaterThanOrEqual(2);
    expect(await pings(oldShiftId)).toBe(2);
  });

  it("deletes location history older than 30 days once enforced", async () => {
    const result = await retention.applyVanLocationRetention({ enforce: true });
    expect(result.enforced).toBe(true);
    expect(result.pingsDeleted).toBeGreaterThanOrEqual(2);
    expect(await pings(oldShiftId)).toBe(0);
    expect(await pings(liveShiftId)).toBe(2);

    const oldShift = await prisma.vanShift.findUniqueOrThrow({ where: { id: oldShiftId } });
    expect(oldShift).toMatchObject({ lastLat: null, lastLng: null, lastLocationAt: null });
    const liveShift = await prisma.vanShift.findUniqueOrThrow({ where: { id: liveShiftId } });
    expect(liveShift.lastLat).toBe(51.5);
  });

  it("reports counts to admins only", async () => {
    const operatorToken = signAccessToken({ sub: userIds[1], role: "operator", sessionId: crypto.randomUUID() });
    const denied = await fetch(`${baseUrl}/api/admin/retention`, { headers: { Authorization: `Bearer ${operatorToken}` } });
    expect(denied.status).toBe(403);

    const res = await fetch(`${baseUrl}/api/admin/retention`, { headers: { Authorization: `Bearer ${adminToken}` } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ enforced: false, vanLocationPings: 0 });
    expect(typeof body.clinicalRecordsPastRetention).toBe("number");
    expect(typeof body.auditLogsPastRetention).toBe("number");
  });
});
