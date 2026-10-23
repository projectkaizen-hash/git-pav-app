import http from "http";
import crypto from "crypto";

// CS-15 (VR-1, VR-6, VR-8, DB-2): van races are stopped by the database, not
// by timing. Stripe is replaced with an in-memory fake whose capture is slow,
// so concurrent accepts really overlap. Synthetic data only.

type FakeIntent = { id: string; status: string };
const intents = new Map<string, FakeIntent>();
const captureCalls: string[] = [];

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    paymentIntents: {
      retrieve: jest.fn(async (id: string) => ({ ...intents.get(id)! })),
      capture: jest.fn(async (id: string) => {
        captureCalls.push(id);
        await new Promise((r) => setTimeout(r, 50));
        const intent = intents.get(id)!;
        if (intent.status === "requires_capture") intent.status = "succeeded";
        return { ...intent };
      }),
      cancel: jest.fn(async (id: string) => {
        const intent = intents.get(id)!;
        intent.status = "canceled";
        return { ...intent };
      }),
    },
    refunds: { create: jest.fn(async () => ({ id: "re_fake", amount: 0 })) },
  }))
);

jest.mock("../config/env", () => {
  const actual = jest.requireActual("../config/env");
  return { ...actual, env: { ...actual.env, isMockStripe: false } };
});

describe("van races", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let signAccessToken: typeof import("../lib/jwt").signAccessToken;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const vanIds: string[] = [];
  const operatorIds: string[] = [];
  let serviceId = "";

  const call = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }));

  async function makeUser(role: "patient" | "operator", label: string) {
    const user = await prisma.user.create({ data: { email: `race-${label}-${tag}@example.test`, passwordHash: "x", role } });
    userIds.push(user.id);
    return { user, token: signAccessToken({ sub: user.id, role, sessionId: crypto.randomUUID() }) };
  }

  /** An operator assigned to a fresh van, with no shift yet. */
  async function makeOperator(label: string) {
    const { user, token } = await makeUser("operator", label);
    const operator = await prisma.operatorProfile.create({ data: { userId: user.id, fullName: "Synthetic Operator" } });
    operatorIds.push(operator.id);
    const van = await prisma.van.create({ data: { name: `Synthetic Van ${label} ${tag}`, registrationPlate: `RC${label}${tag}`.slice(0, 20), vehicleModel: "Test" } });
    vanIds.push(van.id);
    await prisma.vanOperatorAssignment.create({ data: { operatorId: operator.id, vanId: van.id, startsAt: new Date(Date.now() - 60_000) } });
    return { token, operator, van };
  }

  async function makePendingRequest(shift: { id: string; vanId: string }, label: string, intentStatus = "requires_capture") {
    const { user } = await makeUser("patient", `pt-${label}`);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, firstName: "Synthetic", lastName: label } });
    const paymentIntentId = `pi_fake_${label}_${tag}`;
    intents.set(paymentIntentId, { id: paymentIntentId, status: intentStatus });
    return prisma.vanServiceRequest.create({
      data: {
        shiftId: shift.id,
        vanId: shift.vanId,
        patientId: profile.id,
        serviceId,
        patientLat: 51.5,
        patientLng: -0.12,
        accessDetails: {},
        expiresAt: new Date(Date.now() + 3_600_000),
        etaSecondsSnapshot: 600,
        paymentIntentId,
      },
    });
  }

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    signAccessToken = require("../lib/jwt").signAccessToken;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3025, resolve));
    baseUrl = "http://localhost:3025";
    serviceId = (await prisma.service.findFirstOrThrow()).id;
  });

  afterAll(async () => {
    const profiles = await prisma.patientProfile.findMany({ where: { userId: { in: userIds } }, select: { id: true } });
    const patientIds = profiles.map((p) => p.id);
    await prisma.vanServiceRequest.deleteMany({ where: { vanId: { in: vanIds } } });
    await prisma.appointment.deleteMany({ where: { patientId: { in: patientIds } } });
    await prisma.vanShift.deleteMany({ where: { vanId: { in: vanIds } } });
    await prisma.vanOperatorAssignment.deleteMany({ where: { vanId: { in: vanIds } } });
    await prisma.van.deleteMany({ where: { id: { in: vanIds } } });
    await prisma.operatorProfile.deleteMany({ where: { id: { in: operatorIds } } });
    await prisma.patientProfile.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("starts one shift however many times start is tapped", async () => {
    const { token, operator } = await makeOperator("start");
    const results = await Promise.all(Array.from({ length: 5 }, () => call("POST", "/api/van/shift/start", token, {})));
    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(4);
    expect(await prisma.vanShift.count({ where: { operatorId: operator.id, endedAt: null } })).toBe(1);
  });

  it("refuses a second open shift on the same van or for the same operator in the database", async () => {
    const { operator, van } = await makeOperator("dbshift");
    const other = await makeOperator("dbshift2");
    await prisma.vanShift.create({ data: { vanId: van.id, operatorId: operator.id } });
    await expect(prisma.vanShift.create({ data: { vanId: van.id, operatorId: other.operator.id } })).rejects.toMatchObject({ code: "P2002" });
    await expect(prisma.vanShift.create({ data: { vanId: other.van.id, operatorId: operator.id } })).rejects.toMatchObject({ code: "P2002" });
  });

  it("accepts a request once, with one appointment and one capture, when accept is tapped repeatedly", async () => {
    const { token } = await makeOperator("accept");
    const shift = (await call("POST", "/api/van/shift/start", token, {})).body;
    const request = await makePendingRequest(shift, "accept");
    captureCalls.length = 0;

    const results = await Promise.all(Array.from({ length: 4 }, () => call("POST", `/api/van/requests/${request.id}/accept`, token)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect(new Set(results.map((r) => r.body.appointmentId)).size).toBe(1);

    expect(await prisma.appointment.count({ where: { patientId: request.patientId } })).toBe(1);
    expect(captureCalls).toEqual([request.paymentIntentId]);
    const after = await prisma.vanServiceRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(after.status).toBe("accepted");
    expect(after.queuePosition).toBe(1);
  });

  it("succeeds when retried after the deposit was captured but the response was lost", async () => {
    const { token } = await makeOperator("retry");
    const shift = (await call("POST", "/api/van/shift/start", token, {})).body;
    const request = await makePendingRequest(shift, "retry", "succeeded");
    captureCalls.length = 0;

    const result = await call("POST", `/api/van/requests/${request.id}/accept`, token);
    expect(result.status).toBe(200);
    expect(result.body.status).toBe("accepted");
    expect(captureCalls).toEqual([]);
    expect(await prisma.appointment.count({ where: { patientId: request.patientId } })).toBe(1);
  });

  it("gives concurrently accepted stops distinct queue positions", async () => {
    const { token } = await makeOperator("queue");
    const shift = (await call("POST", "/api/van/shift/start", token, {})).body;
    const requests = await Promise.all(["q1", "q2", "q3"].map((label) => makePendingRequest(shift, label)));

    const results = await Promise.all(requests.map((r) => call("POST", `/api/van/requests/${r.id}/accept`, token)));
    expect(results.map((r) => r.status)).toEqual([200, 200, 200]);
    const positions = (await prisma.vanServiceRequest.findMany({ where: { shiftId: shift.id }, select: { queuePosition: true } }))
      .map((r) => r.queuePosition)
      .sort();
    expect(positions).toEqual([1, 2, 3]);
  });

  it("refuses a second open van request for the same patient in the database", async () => {
    const { token } = await makeOperator("dup");
    const shift = (await call("POST", "/api/van/shift/start", token, {})).body;
    const first = await makePendingRequest(shift, "dup");
    await expect(
      prisma.vanServiceRequest.create({
        data: {
          shiftId: shift.id,
          vanId: shift.vanId,
          patientId: first.patientId,
          serviceId,
          patientLat: 51.5,
          patientLng: -0.12,
          accessDetails: {},
          expiresAt: new Date(Date.now() + 3_600_000),
        },
      })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
