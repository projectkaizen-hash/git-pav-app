import http from "http";
import crypto from "crypto";

// CS-22 (decisions log #15): deposits are paid as the patient's Stripe
// Customer so saved cards can be used, and the saved-card list follows what
// Stripe holds. Stripe runs in non-mock mode with a stubbed client; no
// network calls. Synthetic data only.
const mockCustomersCreate = jest.fn();
const mockListPaymentMethods = jest.fn();
const mockCustomersUpdate = jest.fn();
const mockEphemeralKeysCreate = jest.fn();
const mockPaymentIntentsCreate = jest.fn();
const mockPaymentMethodsRetrieve = jest.fn();
jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    customers: { create: mockCustomersCreate, listPaymentMethods: mockListPaymentMethods, update: mockCustomersUpdate },
    ephemeralKeys: { create: mockEphemeralKeysCreate },
    paymentIntents: { create: mockPaymentIntentsCreate },
    paymentMethods: { retrieve: mockPaymentMethodsRetrieve },
    setupIntents: { create: jest.fn().mockResolvedValue({ client_secret: "seti_unit_secret" }) },
    webhooks: { constructEvent: jest.fn() },
  }))
);

describe("saved cards for deposits", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const profileIds: string[] = [];
  const appointmentIds: string[] = [];
  let serviceId = "";
  const originalEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };

  async function makePatient(label: string) {
    const { signAccessToken } = require("../lib/jwt");
    const user = await prisma.user.create({ data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role: "patient" } });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({ data: { userId: user.id, firstName: "Synthetic", lastName: "Patient" } });
    profileIds.push(profile.id);
    return { userId: user.id, profileId: profile.id, token: signAccessToken({ sub: user.id, role: "patient", sessionId: crypto.randomUUID() }) as string };
  }

  async function hold(patientId: string) {
    const start = new Date(Date.now() + (5 + appointmentIds.length) * 86400000);
    const appt = await prisma.appointment.create({
      data: {
        patientId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status: "draft_hold",
        holdExpiresAt: new Date(Date.now() + 10 * 60000),
        totalPricePence: 10000,
      },
    });
    appointmentIds.push(appt.id);
    return appt.id;
  }

  const send = (method: string, path: string, token: string, body?: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));

  beforeAll(async () => {
    // Must be set before the app (and env.ts) is loaded.
    process.env.STRIPE_SECRET_KEY = "sk_test_unit_not_a_real_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_not_a_real_secret";
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3014, resolve));
    baseUrl = "http://localhost:3014";
    serviceId = (await prisma.service.findFirstOrThrow({ where: { depositPence: { gt: 0 } } })).id;
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.savedPaymentMethod.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.patientProfile.deleteMany({ where: { id: { in: profileIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
    // process.env is shared by later test files in this jest worker.
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(() => {
    mockCustomersCreate.mockReset().mockImplementation(async () => ({ id: `cus_unit_${crypto.randomUUID().slice(0, 8)}` }));
    mockEphemeralKeysCreate.mockReset().mockResolvedValue({ secret: "ek_unit_secret" });
    mockPaymentIntentsCreate.mockReset().mockImplementation(async () => ({
      id: `pi_unit_${crypto.randomUUID().slice(0, 8)}`,
      client_secret: "pi_unit_secret",
    }));
    mockListPaymentMethods.mockReset();
    mockCustomersUpdate.mockReset().mockResolvedValue({});
    mockPaymentMethodsRetrieve.mockReset();
  });

  it("pays the deposit as the patient's Customer, created once", async () => {
    const patient = await makePatient("deposit-customer");

    const first = await send("POST", "/api/payments/create-intent", patient.token, { appointmentId: await hold(patient.profileId) });
    expect(first.status).toBe(200);
    expect(first.body.customerEphemeralKeySecret).toBe("ek_unit_secret");
    const customerId = first.body.customerId;
    expect(customerId).toMatch(/^cus_unit_/);
    expect(mockPaymentIntentsCreate.mock.calls[0][0]).toMatchObject({ customer: customerId });
    expect(mockEphemeralKeysCreate).toHaveBeenCalledWith({ customer: customerId }, { apiVersion: "2020-08-27" });

    const second = await send("POST", "/api/payments/create-intent", patient.token, { appointmentId: await hold(patient.profileId) });
    expect(second.body.customerId).toBe(customerId);
    expect(mockCustomersCreate).toHaveBeenCalledTimes(1);
  });

  it("lists the cards Stripe holds, including ones saved while paying", async () => {
    const patient = await makePatient("deposit-cards");
    await prisma.patientProfile.update({ where: { id: patient.profileId }, data: { stripeCustomerId: `cus_unit_${tag}` } });
    await prisma.savedPaymentMethod.create({
      data: { userId: patient.userId, stripePaymentMethodId: `pm_unit_removed_${tag}`, brand: "visa", last4: "0000", expMonth: 1, expYear: 2030 },
    });
    mockListPaymentMethods.mockResolvedValue({
      data: [{ id: `pm_unit_saved_${tag}`, card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2031 } }],
    });

    const list = await send("GET", "/api/payments/methods", patient.token);
    expect(list.status).toBe(200);
    expect(list.body.map((m: any) => m.last4)).toEqual(["4242"]);
    expect(mockListPaymentMethods).toHaveBeenCalledWith(`cus_unit_${tag}`, { type: "card", limit: 100 });

    // Making it the default also sets it on the Customer in Stripe.
    expect((await send("PATCH", `/api/payments/methods/${list.body[0].id}/default`, patient.token)).status).toBe(200);
    expect(mockCustomersUpdate).toHaveBeenCalledWith(`cus_unit_${tag}`, {
      invoice_settings: { default_payment_method: `pm_unit_saved_${tag}` },
    });
  });

  it("won't list a card that belongs to someone else's Customer", async () => {
    const patient = await makePatient("deposit-attach");
    await prisma.patientProfile.update({ where: { id: patient.profileId }, data: { stripeCustomerId: `cus_unit_mine_${tag}` } });
    mockPaymentMethodsRetrieve.mockResolvedValue({
      id: `pm_unit_theirs_${tag}`,
      customer: `cus_unit_theirs_${tag}`,
      card: { brand: "visa", last4: "1111", exp_month: 1, exp_year: 2031 },
    });
    expect((await send("POST", "/api/payments/methods/attach", patient.token, { paymentMethodId: `pm_unit_theirs_${tag}` })).status).toBe(403);

    // Nor one that isn't saved to any Customer.
    mockPaymentMethodsRetrieve.mockResolvedValue({ id: `pm_unit_loose_${tag}`, customer: null, card: { brand: "visa", last4: "2222", exp_month: 1, exp_year: 2031 } });
    expect((await send("POST", "/api/payments/methods/attach", patient.token, { paymentMethodId: `pm_unit_loose_${tag}` })).status).toBe(403);
    expect(await prisma.savedPaymentMethod.count({ where: { userId: patient.userId } })).toBe(0);
  });
});
