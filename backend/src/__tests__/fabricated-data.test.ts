import http from "http";
import crypto from "crypto";
import {
  FABRICATED_PRACTITIONER_ADVICE,
  FABRICATED_THREAD_SENDERS,
  FABRICATED_THREAD_SUBJECTS,
  FABRICATED_WEEKLY_BRUSHING,
  purgeFabricatedData,
} from "../lib/purge-fabricated-data";

// CS-05: the API no longer invents inbox threads, points or clinical measures
// for new patients, and the purge removes what it invented before without
// touching anything a person wrote. Synthetic data only.
describe("fabricated data", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let signAccessToken: typeof import("../lib/jwt").signAccessToken;
  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];

  async function makePatient(label: string) {
    const user = await prisma.user.create({
      data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    userIds.push(user.id);
    const token = signAccessToken({ sub: user.id, role: "patient", sessionId: crypto.randomUUID() });
    return { userId: user.id, token };
  }

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    signAccessToken = require("../lib/jwt").signAccessToken;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3007, resolve));
    baseUrl = "http://localhost:3007";
  });

  afterAll(async () => {
    await prisma.messageThread.deleteMany({ where: { patientUserId: { in: userIds } } });
    await prisma.oralHealthMetric.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.financingApplication.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const get = (path: string, token: string) =>
    fetch(`${baseUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } }).then(async (r) => ({
      status: r.status,
      body: (await r.json()) as any,
    }));

  it("gives a new patient an empty inbox", async () => {
    const { token } = await makePatient("inbox");
    const res = await get("/api/messages", token);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("starts a new patient at zero points with no clinical measures", async () => {
    const { token } = await makePatient("metrics");
    const rewards = await get("/api/rewards", token);
    expect(rewards.body.pointsBalance).toBe(0);
    expect(rewards.body.streakDays).toBe(0);

    const insights = await get("/api/rewards/insights", token);
    expect(insights.body).toMatchObject({
      plaqueIndexPercent: null,
      bleedingPercent: null,
      recallDaysRemaining: null,
      practitionerAdvice: null,
    });
    expect(insights.body.weeklyBrushing.every((d: any) => !d.am && !d.pm && d.durationSec === 0)).toBe(true);
  });

  it("awards no points for self-reported brushing", async () => {
    const { token } = await makePatient("brushing");
    const res = await fetch(`${baseUrl}/api/rewards/brushing-log`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ day: "Mon", session: "am", durationSec: 120 }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).pointsBalance).toBe(0);
  });

  it("no longer records instant financing approvals", async () => {
    const { userId, token } = await makePatient("finance");
    const res = await fetch(`${baseUrl}/api/financing/apply`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ treatmentCostPence: 100000, durationMonths: 12 }),
    });
    expect(res.status).toBe(410);
    expect(await prisma.financingApplication.count({ where: { userId } })).toBe(0);
    const info = await get("/api/financing", token);
    expect(info.body.financeInfoUrl).toMatch(/^https:\/\//);
  });

  it("purges invented rows and keeps what people wrote", async () => {
    const fake = await makePatient("purge-fake");
    const real = await makePatient("purge-real");

    // What the old API created for every new patient.
    for (const [i, subject] of FABRICATED_THREAD_SUBJECTS.entries()) {
      await prisma.messageThread.create({
        data: {
          patientUserId: fake.userId,
          senderName: FABRICATED_THREAD_SENDERS[i],
          subject,
          preview: "seeded",
          messages: { create: [{ senderRole: "clinician", senderName: FABRICATED_THREAD_SENDERS[i], body: "seeded" }] },
        },
      });
    }
    // A seeded thread the patient answered: their reply must survive.
    const replied = await prisma.messageThread.create({
      data: {
        patientUserId: fake.userId,
        senderName: FABRICATED_THREAD_SENDERS[0],
        subject: FABRICATED_THREAD_SUBJECTS[0],
        preview: "seeded",
        messages: {
          create: [
            { senderRole: "clinician", senderName: FABRICATED_THREAD_SENDERS[0], body: "seeded" },
            { senderRole: "patient", senderName: "You", body: "synthetic reply" },
          ],
        },
      },
    });
    await prisma.oralHealthMetric.create({
      data: {
        userId: fake.userId,
        pointsBalance: 1450,
        streakDays: 14,
        plaqueIndexPercent: 12,
        bleedingPercent: 4,
        recallDaysRemaining: 42,
        practitionerAdvice: FABRICATED_PRACTITIONER_ADVICE,
        weeklyBrushing: FABRICATED_WEEKLY_BRUSHING,
      },
    });
    await prisma.financingApplication.create({
      data: {
        userId: fake.userId,
        treatmentCostPence: 100000,
        durationMonths: 12,
        monthlyPence: 8333,
        approvedLimitPence: 400000,
        status: "pre_approved",
        agreementRef: `PAV-FIN-TEST-${tag}`,
      },
    });

    // Real content: a patient's own thread and a clinician-recorded measure.
    const own = await prisma.messageThread.create({
      data: {
        patientUserId: real.userId,
        senderName: "Pav Dental Clinical Team",
        subject: "Synthetic question",
        preview: "synthetic",
        messages: { create: [{ senderRole: "patient", senderName: "You", body: "synthetic" }] },
      },
    });
    await prisma.oralHealthMetric.create({
      data: { userId: real.userId, pointsBalance: 0, streakDays: 0, plaqueIndexPercent: 30, practitionerAdvice: "Recorded advice" },
    });

    const dryRun = await purgeFabricatedData(prisma, { apply: false });
    expect(dryRun.messageThreadsDeleted).toBeGreaterThanOrEqual(3);
    expect(await prisma.messageThread.count({ where: { patientUserId: fake.userId } })).toBe(4);

    const report = await purgeFabricatedData(prisma, { apply: true });
    expect(report.messageThreadsKeptWithReplies).toBeGreaterThanOrEqual(1);

    const remaining = await prisma.messageThread.findMany({ where: { patientUserId: { in: [fake.userId, real.userId] } } });
    expect(remaining.map((t) => t.id).sort()).toEqual([replied.id, own.id].sort());

    const fakeMetric = await prisma.oralHealthMetric.findUniqueOrThrow({ where: { userId: fake.userId } });
    expect(fakeMetric).toMatchObject({
      pointsBalance: 0,
      streakDays: 0,
      plaqueIndexPercent: null,
      bleedingPercent: null,
      recallDaysRemaining: null,
      practitionerAdvice: null,
      weeklyBrushing: null,
    });
    const realMetric = await prisma.oralHealthMetric.findUniqueOrThrow({ where: { userId: real.userId } });
    expect(realMetric).toMatchObject({ plaqueIndexPercent: 30, practitionerAdvice: "Recorded advice" });
    expect(await prisma.financingApplication.count({ where: { userId: fake.userId } })).toBe(0);
  });
});
