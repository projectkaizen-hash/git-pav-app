import http from "http";
import crypto from "crypto";
import { appointmentRefundPolicy } from "../routes/cancellations";

// CS-18: one cancel path. The old PATCH /cancel (no refund) is retired, and
// cancel-with-refund only cancels appointments that can still be cancelled.
// Runs against mock Stripe. Synthetic data only.
describe("appointment cancellation", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  const tag = crypto.randomUUID().slice(0, 8);
  const ids = { users: [] as string[], patientProfile: "", appointments: [] as string[] };
  let token = "";
  let clinicianId = "";
  let serviceId = "";

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    const { signAccessToken } = require("../lib/jwt");
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3008, resolve));
    baseUrl = "http://localhost:3008";

    const patientUser = await prisma.user.create({
      data: { email: `cancel-patient-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    const clinicianUser = await prisma.user.create({
      data: { email: `cancel-clinician-${tag}@example.test`, passwordHash: "x", role: "clinician" },
    });
    ids.users.push(patientUser.id, clinicianUser.id);
    ids.patientProfile = (
      await prisma.patientProfile.create({ data: { userId: patientUser.id, firstName: "Synthetic", lastName: "Patient" } })
    ).id;
    clinicianId = (
      await prisma.clinicianProfile.create({
        data: {
          userId: clinicianUser.id,
          fullName: "Synthetic Clinician",
          gdcNumber: String(900000 + crypto.randomInt(0, 99999)),
          roleTitle: "Dentist",
        },
      })
    ).id;
    serviceId = (await prisma.service.findFirstOrThrow()).id;
    token = signAccessToken({ sub: patientUser.id, role: "patient", sessionId: crypto.randomUUID() });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { id: { in: ids.appointments } } });
    await prisma.clinicianProfile.deleteMany({ where: { userId: { in: ids.users } } });
    await prisma.patientProfile.deleteMany({ where: { id: ids.patientProfile } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  async function makeAppointment(status: "confirmed" | "draft_hold" | "completed", hoursAhead = 72) {
    const start = new Date(Date.now() + hoursAhead * 3600000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: ids.patientProfile,
        clinicianId,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status,
        totalPricePence: 10000,
        depositPaidPence: status === "draft_hold" ? 0 : 2000,
        stripePaymentId: status === "draft_hold" ? null : `pi_mock_${tag}`,
      },
    });
    ids.appointments.push(appt.id);
    return appt.id;
  }

  const cancel = (id: string) =>
    fetch(`${baseUrl}/api/booking/appointments/${id}/cancel-with-refund`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));

  const statusOf = async (id: string) => (await prisma.appointment.findUniqueOrThrow({ where: { id } })).status;

  it("retires the cancel route that never refunded", async () => {
    const id = await makeAppointment("confirmed");
    const res = await fetch(`${baseUrl}/api/booking/appointments/${id}/cancel`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(410);
    expect(await statusOf(id)).toBe("confirmed");
  });

  it("cancels a confirmed appointment and refunds by the notice given", async () => {
    const id = await makeAppointment("confirmed", 72);
    const res = await cancel(id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ refundPercentage: 100, refundAmountPence: 2000 });
    expect(res.body.stripeRefundId).toMatch(/^re_mock_/);
    expect(await statusOf(id)).toBe("cancelled");

    // A repeat does not refund again.
    const again = await cancel(id);
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ refundAmountPence: 0, stripeRefundId: null });
  });

  it("cancels a held slot without a refund", async () => {
    const id = await makeAppointment("draft_hold");
    const res = await cancel(id);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ refundAmountPence: 0, stripeRefundId: null });
    expect(await statusOf(id)).toBe("cancelled");
  });

  it("refuses to cancel or refund a completed appointment", async () => {
    const id = await makeAppointment("completed", -48);
    const res = await cancel(id);
    expect(res.status).toBe(409);
    expect(await statusOf(id)).toBe("completed");
  });

  it("keeps the existing refund tiers", () => {
    expect(appointmentRefundPolicy(72).refundPercentage).toBe(100);
    expect(appointmentRefundPolicy(30).refundPercentage).toBe(50);
    expect(appointmentRefundPolicy(5).refundPercentage).toBe(0);
  });
});
