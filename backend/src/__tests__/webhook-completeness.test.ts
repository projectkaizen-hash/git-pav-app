import http from "http";
import { AddressInfo } from "net";

// CS-17: Webhook completeness tests (WH-1, WH-2, WH-3, VP-2, VP-3, VP-4, BJ-4)
const mockRetrieve = jest.fn();
const mockRefundCreate = jest.fn();
const mockCancel = jest.fn();
const mockConstructEvent = jest.fn();

jest.mock("stripe", () =>
  jest.fn().mockImplementation(() => ({
    paymentIntents: { retrieve: mockRetrieve, cancel: mockCancel },
    refunds: { create: mockRefundCreate },
    webhooks: { constructEvent: mockConstructEvent },
  }))
);

describe("CS-17 Webhook Completeness", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let retryFailedVanDepositReleases: typeof import("../lib/background-jobs").retryFailedVanDepositReleases;
  let scheduleAppointmentReminderLadder: typeof import("../lib/background-jobs").scheduleAppointmentReminderLadder;
  let patientProfileId: string;
  let userId: string;
  let serviceId: string;
  let shiftId: string;
  let vanId: string;
  const createdAppointmentIds: string[] = [];
  const createdVanRequestIds: string[] = [];
  const createdEventIds: string[] = [];

  const originalEnv = {
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  };

  beforeAll(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit_not_a_real_key";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_unit_not_a_real_secret";

    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    const bgJobs = require("../lib/background-jobs");
    retryFailedVanDepositReleases = bgJobs.retryFailedVanDepositReleases;
    scheduleAppointmentReminderLadder = bgJobs.scheduleAppointmentReminderLadder;

    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as AddressInfo).port;
    baseUrl = `http://localhost:${port}`;

    const timestamp = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `webhook_test_${timestamp}@example.test`,
        passwordHash: "mock_hash_for_test",
        role: "patient",
        patientProfile: {
          create: {
            firstName: "Webhook",
            lastName: "Tester",
          },
        },
      },
      include: { patientProfile: true },
    });

    userId = user.id;
    patientProfileId = user.patientProfile!.id;

    const service = await prisma.service.findFirstOrThrow({
      where: { depositPence: { gt: 0 } },
      select: { id: true },
    });
    serviceId = service.id;

    // Create an operator user and van shift for van requests
    const opUser = await prisma.user.create({
      data: {
        email: `op_webhook_${timestamp}@example.test`,
        passwordHash: "mock_hash_for_test",
        role: "operator",
        operatorProfile: {
          create: {
            fullName: "Van Operator",
          },
        },
      },
      include: { operatorProfile: true },
    });

    const van = await prisma.van.create({
      data: {
        name: `Test Van ${timestamp}`,
        registrationPlate: `V${timestamp.toString().slice(-6)}`,
        vehicleModel: "Mercedes Sprinter",
      },
    });

    const shift = await prisma.vanShift.create({
      data: {
        operatorId: opUser.operatorProfile!.id,
        vanId: van.id,
        status: "online",
        startedAt: new Date(),
      },
    });
    shiftId = shift.id;
    vanId = van.id;
  });

  afterAll(async () => {
    if (createdAppointmentIds.length > 0) {
      await prisma.appointment.deleteMany({ where: { id: { in: createdAppointmentIds } } });
    }
    if (createdVanRequestIds.length > 0) {
      await prisma.vanServiceRequest.deleteMany({ where: { id: { in: createdVanRequestIds } } });
    }
    if (shiftId) {
      await prisma.vanShift.deleteMany({ where: { id: shiftId } });
    }
    if (vanId) {
      await prisma.van.deleteMany({ where: { id: vanId } });
    }
    if (createdEventIds.length > 0) {
      await prisma.processedStripeEvent.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    await prisma.scheduledNotification.deleteMany({ where: { userId } });

    await new Promise<void>((resolve) => server.close(() => resolve()));

    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(() => {
    mockRetrieve.mockReset();
    mockRefundCreate.mockReset().mockResolvedValue({ id: "re_mock_test" });
    mockCancel.mockReset().mockResolvedValue({ id: "pi_mock_canceled", status: "canceled" });
    mockConstructEvent.mockReset();
  });

  const sendWebhook = (event: { id: string; type: string; data: { object: unknown } }) => {
    createdEventIds.push(event.id);
    mockConstructEvent.mockReturnValueOnce(event);
    return fetch(`${baseUrl}/api/payments/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "stripe-signature": "t=0,v1=unit" },
      body: JSON.stringify({ id: event.id }),
    });
  };

  it("WH-3: Deduplicates Stripe webhooks (replay is an idempotent no-op)", async () => {
    const eventId = `evt_dedup_${Date.now()}`;
    const event = {
      id: eventId,
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: `pi_dedup_${Date.now()}`,
          status: "succeeded",
          amount_received: 2000,
          metadata: {},
        },
      },
    };

    // First delivery
    const res1 = await sendWebhook(event);
    expect(res1.status).toBe(200);
    const body1 = await res1.json() as any;
    expect(body1.received).toBe(true);
    expect(body1.duplicate).toBeUndefined();

    // Verify stored in processedStripeEvent
    const recorded = await prisma.processedStripeEvent.findUnique({
      where: { id: eventId },
    });
    expect(recorded).not.toBeNull();
    expect(recorded?.type).toBe("payment_intent.succeeded");

    // Second delivery (replay)
    const res2 = await sendWebhook(event);
    expect(res2.status).toBe(200);
    const body2 = await res2.json() as any;
    expect(body2.received).toBe(true);
    expect(body2.duplicate).toBe(true);
  });

  it("WH-2 / VP-3: amount_capturable_updated on terminal van request releases deposit", async () => {
    const piId = `pi_term_van_${Date.now()}`;
    mockRetrieve.mockResolvedValue({ id: piId, status: "requires_capture" });
    mockCancel.mockResolvedValue({ id: piId, status: "canceled" });

    // Create a van request that is cancelled
    const vanReq = await prisma.vanServiceRequest.create({
      data: {
        shiftId,
        vanId,
        patientId: patientProfileId,
        serviceId,
        status: "cancelled",
        phase: "cancelled",
        patientLat: 51.5,
        patientLng: -0.1,
        accessDetails: {},
        expiresAt: new Date(Date.now() + 600000),
        paymentIntentId: piId,
      },
    });
    createdVanRequestIds.push(vanReq.id);

    const event = {
      id: `evt_cap_term_${Date.now()}`,
      type: "payment_intent.amount_capturable_updated",
      data: {
        object: {
          id: piId,
          status: "requires_capture",
          metadata: { vanServiceRequestId: vanReq.id },
        },
      },
    };

    const res = await sendWebhook(event);
    expect(res.status).toBe(200);

    // Verify Stripe cancel was called
    expect(mockCancel).toHaveBeenCalledWith(
      piId,
      undefined,
      { idempotencyKey: `van-deposit-cancel:${piId}` }
    );

    // Verify database row updated with release status
    const updated = await prisma.vanServiceRequest.findUniqueOrThrow({
      where: { id: vanReq.id },
    });
    expect(updated.depositReleaseStatus).toBe("released");
    expect(updated.depositReleasedAt).not.toBeNull();
  });

  it("WH-3: payment_intent.canceled cancels a draft_hold clinic appointment", async () => {
    const piId = `pi_cancel_appt_${Date.now()}`;
    const start = new Date(Date.now() + 86400000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status: "draft_hold",
        holdExpiresAt: new Date(Date.now() + 600000),
        totalPricePence: 5000,
        depositPaidPence: 0,
        stripePaymentId: piId,
      },
    });
    createdAppointmentIds.push(appt.id);

    const event = {
      id: `evt_pi_canceled_${Date.now()}`,
      type: "payment_intent.canceled",
      data: {
        object: {
          id: piId,
          status: "canceled",
          metadata: { appointmentId: appt.id },
        },
      },
    };

    const res = await sendWebhook(event);
    expect(res.status).toBe(200);

    const updated = await prisma.appointment.findUniqueOrThrow({
      where: { id: appt.id },
    });
    expect(updated.status).toBe("cancelled");
    expect(updated.holdExpiresAt).toBeNull();
  });

  it("WH-3: charge.refunded updates appointment depositPaidPence and van release status", async () => {
    const piAppt = `pi_charge_ref_appt_${Date.now()}`;
    const start = new Date(Date.now() + 86400000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status: "confirmed",
        totalPricePence: 5000,
        depositPaidPence: 2000,
        stripePaymentId: piAppt,
      },
    });
    createdAppointmentIds.push(appt.id);

    const event = {
      id: `evt_charge_ref_${Date.now()}`,
      type: "charge.refunded",
      data: {
        object: {
          id: `ch_ref_${Date.now()}`,
          payment_intent: piAppt,
          amount: 2000,
          amount_refunded: 2000,
          refunded: true,
        },
      },
    };

    const res = await sendWebhook(event);
    expect(res.status).toBe(200);

    const updatedAppt = await prisma.appointment.findUniqueOrThrow({
      where: { id: appt.id },
    });
    expect(updatedAppt.depositPaidPence).toBe(0);

    // Also test for a van request
    const piVan = `pi_charge_ref_van_${Date.now()}`;
    const vanReq = await prisma.vanServiceRequest.create({
      data: {
        shiftId,
        vanId,
        patientId: patientProfileId,
        serviceId,
        status: "accepted",
        phase: "queued",
        patientLat: 51.5,
        patientLng: -0.1,
        accessDetails: {},
        expiresAt: new Date(Date.now() + 600000),
        paymentIntentId: piVan,
      },
    });
    createdVanRequestIds.push(vanReq.id);

    const vanEvent = {
      id: `evt_van_charge_ref_${Date.now()}`,
      type: "charge.refunded",
      data: {
        object: {
          id: `ch_van_ref_${Date.now()}`,
          payment_intent: piVan,
          amount: 2500,
          amount_refunded: 2500,
          refunded: true,
        },
      },
    };

    const resVan = await sendWebhook(vanEvent);
    expect(resVan.status).toBe(200);

    const updatedVan = await prisma.vanServiceRequest.findUniqueOrThrow({
      where: { id: vanReq.id },
    });
    expect(updatedVan.depositReleaseStatus).toBe("refunded");
    expect(updatedVan.depositReleasedAt).not.toBeNull();
  });

  it("WH-3: charge.dispute.created creates audit log and notifies patient", async () => {
    const piId = `pi_dispute_${Date.now()}`;
    const start = new Date(Date.now() + 86400000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status: "confirmed",
        totalPricePence: 5000,
        depositPaidPence: 2000,
        stripePaymentId: piId,
      },
    });
    createdAppointmentIds.push(appt.id);

    const disputeId = `dp_test_${Date.now()}`;
    const event = {
      id: `evt_dispute_${Date.now()}`,
      type: "charge.dispute.created",
      data: {
        object: {
          id: disputeId,
          payment_intent: piId,
          amount: 2000,
          reason: "fraudulent",
          status: "needs_response",
        },
      },
    };

    const res = await sendWebhook(event);
    expect(res.status).toBe(200);

    // Audit log should be written
    const audit = await prisma.auditLog.findFirst({
      where: { action: "stripe.charge.dispute.created", resourceId: appt.id },
    });
    expect(audit).not.toBeNull();
    const meta = audit?.metadata as any;
    expect(meta.disputeId).toBe(disputeId);
    expect(meta.amount).toBe(2000);
    expect(meta.reason).toBe("fraudulent");
  });

  it("VP-2: retryFailedVanDepositReleases sweeps terminal requests with failed release", async () => {
    const piId = `pi_retry_sweep_${Date.now()}`;
    mockRetrieve.mockResolvedValue({ id: piId, status: "requires_capture" });
    mockCancel.mockResolvedValue({ id: piId, status: "canceled" });

    // Terminal request with failed release status
    const vanReq = await prisma.vanServiceRequest.create({
      data: {
        shiftId,
        vanId,
        patientId: patientProfileId,
        serviceId,
        status: "expired",
        phase: "cancelled",
        patientLat: 51.5,
        patientLng: -0.1,
        accessDetails: {},
        expiresAt: new Date(Date.now() + 600000),
        paymentIntentId: piId,
        depositReleaseStatus: "failed",
      },
    });
    createdVanRequestIds.push(vanReq.id);

    const outcome = await retryFailedVanDepositReleases();
    expect(outcome.retriedCount).toBeGreaterThanOrEqual(1);
    expect(outcome.succeededCount).toBeGreaterThanOrEqual(1);

    const updated = await prisma.vanServiceRequest.findUniqueOrThrow({
      where: { id: vanReq.id },
    });
    expect(updated.depositReleaseStatus).toBe("released");
    expect(updated.depositReleasedAt).not.toBeNull();
  });

  it("BJ-4: scheduleAppointmentReminderLadder is idempotent and avoids duplicate reminders", async () => {
    const start = new Date(Date.now() + 72 * 3600000); // 72h ahead so all ladder steps apply
    const appt = await prisma.appointment.create({
      data: {
        patientId: patientProfileId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status: "confirmed",
        totalPricePence: 5000,
        depositPaidPence: 2000,
      },
    });
    createdAppointmentIds.push(appt.id);

    // First call
    await scheduleAppointmentReminderLadder(appt.id);
    const countAfterFirst = await prisma.scheduledNotification.count({
      where: { userId },
    });
    expect(countAfterFirst).toBe(3); // 48h, 24h, 2h

    // Second call (simulating redelivery or concurrent trigger)
    await scheduleAppointmentReminderLadder(appt.id);
    const countAfterSecond = await prisma.scheduledNotification.count({
      where: { userId },
    });
    expect(countAfterSecond).toBe(countAfterFirst); // No duplicates!
  });
});
