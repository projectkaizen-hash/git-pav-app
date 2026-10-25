import http from "http";
import crypto from "crypto";
import {
  issueMissedReferralVouchers,
  REFERRAL_MIN_VISIT_PENCE,
  REFERRAL_VOUCHER_PENCE,
} from "../lib/referrals";

// D-03 (owner's rules, 25 Oct 2026): a friend signs up with a patient's code;
// when the friend's first completed visit costs over £150, the patient gets a
// £25 voucher that staff take off their next bill. Synthetic data only.
describe("refer a friend", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let signAccessToken: typeof import("../lib/jwt").signAccessToken;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const appointmentIds: string[] = [];
  let adminToken = "";
  let serviceId = "";

  async function makeUser(role: "patient" | "admin", label: string) {
    const user = await prisma.user.create({
      data: {
        email: `${label}-${tag}@example.test`,
        passwordHash: "x",
        role,
        ...(role === "patient" ? { patientProfile: { create: { firstName: "Synthetic", lastName: label } } } : {}),
      },
    });
    userIds.push(user.id);
    return { userId: user.id, token: signAccessToken({ sub: user.id, role, sessionId: crypto.randomUUID() }) };
  }

  async function register(label: string, referralCode?: string) {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: `${label}-${tag}@example.test`,
        password: "Synthetic-Passw0rd!",
        firstName: "Synthetic",
        lastName: "Friend",
        ...(referralCode ? { referralCode } : {}),
      }),
    });
    const body = (await res.json()) as { user: { id: string } };
    if (res.status === 201) userIds.push(body.user.id);
    return { status: res.status, body };
  }

  async function completedVisit(userId: string, totalPricePence: number, status: "completed" | "confirmed" = "completed") {
    const profile = await prisma.patientProfile.findUniqueOrThrow({ where: { userId }, select: { id: true } });
    const start = new Date(Date.now() - 86400000 - appointmentIds.length * 3600000);
    const appt = await prisma.appointment.create({
      data: {
        patientId: profile.id,
        serviceId,
        channel: "clinic",
        startTimeUtc: start,
        endTimeUtc: new Date(start.getTime() + 1800000),
        status,
        totalPricePence,
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

  const complete = (appointmentId: string) =>
    send("PATCH", `/api/admin/appointments/${appointmentId}/status`, adminToken, { status: "completed" });

  beforeAll(async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    signAccessToken = require("../lib/jwt").signAccessToken;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3027, resolve));
    baseUrl = "http://localhost:3027";
    adminToken = (await makeUser("admin", "ref-admin")).token;
    serviceId = (await prisma.service.findFirstOrThrow({ select: { id: true } })).id;
  });

  afterAll(async () => {
    await prisma.referral.deleteMany({ where: { referrerUserId: { in: userIds } } });
    await prisma.referralCode.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.rewardPointsAward.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.appointment.deleteMany({ where: { id: { in: appointmentIds } } });
    await prisma.oralHealthMetric.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("gives a patient one stable code to share", async () => {
    const patient = await makeUser("patient", "ref-code");
    const first = await send("GET", "/api/referrals", patient.token);
    expect(first.status).toBe(200);
    expect(first.body.code).toMatch(/^[A-Z2-9]{8}$/);
    expect(first.body).toMatchObject({ friendsJoined: 0, vouchers: [], voucherPence: REFERRAL_VOUCHER_PENCE });
    expect((await send("GET", "/api/referrals", patient.token)).body.code).toBe(first.body.code);
  });

  it("refuses an unknown code at sign-up instead of dropping it", async () => {
    const res = await register("ref-badcode", "NOSUCHCODE");
    expect(res.status).toBe(400);
    expect(await prisma.user.findUnique({ where: { email: `ref-badcode-${tag}@example.test` } })).toBeNull();
  });

  it("issues £25 once, after the friend's first completed visit over £150", async () => {
    const referrer = await makeUser("patient", "ref-owner");
    const { code } = (await send("GET", "/api/referrals", referrer.token)).body;

    // Codes are accepted in lower case with spaces.
    const friend = await register("ref-friend", ` ${code.toLowerCase()} `);
    expect(friend.status).toBe(201);
    expect((await send("GET", "/api/referrals", referrer.token)).body.friendsJoined).toBe(1);

    // Exactly £150 and a visit not yet completed don't qualify.
    expect((await complete(await completedVisit(friend.body.user.id, REFERRAL_MIN_VISIT_PENCE, "confirmed"))).status).toBe(200);
    const booked = await completedVisit(friend.body.user.id, 30000, "confirmed");
    expect((await send("GET", "/api/referrals", referrer.token)).body.vouchers).toEqual([]);

    // Completing the £300 visit issues the voucher.
    expect((await complete(booked)).status).toBe(200);
    const summary = (await send("GET", "/api/referrals", referrer.token)).body;
    expect(summary.vouchers).toHaveLength(1);
    expect(summary.vouchers[0]).toMatchObject({ amountPence: 2500, usedAt: null });
    // The referrer learns nothing about the friend or their treatment.
    expect(JSON.stringify(summary)).not.toMatch(/Friend|ref-friend|30000/);

    // Another qualifying visit, or the sweep, doesn't pay twice.
    await complete(await completedVisit(friend.body.user.id, 40000, "confirmed"));
    await issueMissedReferralVouchers(1000);
    expect((await send("GET", "/api/referrals", referrer.token)).body.vouchers).toHaveLength(1);

    // Staff look it up, take it off the bill once, and can't use it again.
    const voucherCode = summary.vouchers[0].voucherCode as string;
    const lookup = await send("GET", `/api/admin/referral-vouchers/${voucherCode.replace("REF-", "ref ")}`, adminToken);
    expect(lookup.status).toBe(200);
    expect(lookup.body).toMatchObject({ voucherCode, amountPence: 2500, usedAt: null, patientName: "Synthetic ref-owner" });
    expect((await send("POST", `/api/admin/referral-vouchers/${voucherCode}/use`, adminToken)).status).toBe(200);
    expect((await send("POST", `/api/admin/referral-vouchers/${voucherCode}/use`, adminToken)).status).toBe(409);
    expect((await send("GET", "/api/referrals", referrer.token)).body.vouchers[0].usedAt).not.toBeNull();

    // Patients can't use the staff endpoints.
    expect((await send("POST", `/api/admin/referral-vouchers/${voucherCode}/use`, referrer.token)).status).toBe(403);
  });

  it("catches up a qualifying visit that was completed without the voucher", async () => {
    const referrer = await makeUser("patient", "ref-sweep-owner");
    const { code } = (await send("GET", "/api/referrals", referrer.token)).body;
    const friend = await register("ref-sweep-friend", code);
    // Written straight to the database, as if the completion hook had failed.
    await completedVisit(friend.body.user.id, 20000);
    expect((await send("GET", "/api/referrals", referrer.token)).body.vouchers).toEqual([]);
    await issueMissedReferralVouchers(1000);
    expect((await send("GET", "/api/referrals", referrer.token)).body.vouchers).toHaveLength(1);
  });
});
