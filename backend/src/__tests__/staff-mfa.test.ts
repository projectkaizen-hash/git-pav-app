import http from "http";
import crypto from "crypto";
import argon2 from "argon2";

// CS-08: staff always sign in with a password and a one-time code; phone
// sign-in is for patients only; a code verifies only what it was issued for
// and is burned after five wrong guesses. Synthetic data only.
describe("staff MFA and one-time codes", () => {
  let server: http.Server;
  let baseUrl: string;
  let prisma: typeof import("../lib/prisma").prisma;
  let communicationService: typeof import("../lib/communication-service").communicationService;
  let otpService: typeof import("../lib/otp-service").otpService;
  const tag = crypto.randomUUID().slice(0, 8);
  const password = `Synthetic-${tag}-pass`;
  const userIds: string[] = [];
  let sent: { to: string; code: string }[] = [];

  async function makeUser(role: "patient" | "clinician" | "admin", label: string, phone?: string) {
    const user = await prisma.user.create({
      data: {
        email: `mfa-${label}-${tag}@example.test`,
        phone,
        passwordHash: await argon2.hash(password),
        role,
      },
    });
    userIds.push(user.id);
    return user;
  }

  const login = (email: string, mfaCode?: string) =>
    fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, ...(mfaCode ? { mfaCode } : {}) }),
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));

  const post = (path: string, body: unknown) =>
    fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(async (r) => ({ status: r.status, body: (await r.json()) as any }));

  const lastCodeTo = (to: string) => [...sent].reverse().find((s) => s.to === to)?.code;
  const wrong = (code: string) => String((Number(code) + 1) % 1000000).padStart(6, "0");
  const randomPhone = () => `+4479${String(crypto.randomInt(0, 99999999)).padStart(8, "0")}`;

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    prisma = require("../lib/prisma").prisma;
    communicationService = require("../lib/communication-service").communicationService;
    otpService = require("../lib/otp-service").otpService;
    jest.spyOn(communicationService, "sendMfaCode").mockImplementation(async (to: string, code: string) => {
      sent.push({ to, code });
      return true;
    });
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(3022, resolve));
    baseUrl = "http://localhost:3022";
  });

  beforeEach(() => {
    sent = [];
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await prisma.mfaVerification.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.mfaCode.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.authSession.deleteMany({ where: { userId: { in: userIds } } });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it.each(["clinician", "admin"] as const)("makes a %s enter a code before a session exists", async (role) => {
    const staff = await makeUser(role, `${role}-login`);

    const challenge = await login(staff.email);
    expect(challenge.status).toBe(200);
    expect(challenge.body).toMatchObject({ mfaRequired: true });
    expect(challenge.body).not.toHaveProperty("accessToken");
    expect(challenge.body).not.toHaveProperty("userId");
    expect(await prisma.authSession.count({ where: { userId: staff.id } })).toBe(0);

    const code = lastCodeTo(staff.email)!;
    expect(code).toMatch(/^\d{6}$/);
    expect((await login(staff.email, wrong(code))).status).toBe(401);

    const signedIn = await login(staff.email, code);
    expect(signedIn.status).toBe(200);
    expect(signedIn.body.accessToken).toBeTruthy();
    expect((await login(staff.email, code)).status).toBe(401);
  });

  it("still signs a patient in with a password alone", async () => {
    const patient = await makeUser("patient", "patient-login");
    const res = await login(patient.email);
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(sent).toEqual([]);
  });

  it("burns a code after five wrong guesses", async () => {
    const staff = await makeUser("clinician", "burn");
    await login(staff.email);
    const code = lastCodeTo(staff.email)!;
    for (let i = 0; i < 5; i++) expect((await login(staff.email, wrong(code))).status).toBe(401);
    expect((await login(staff.email, code)).status).toBe(401);
  });

  it("accepts a code only for the purpose it was issued for", async () => {
    const patient = await makeUser("patient", "purpose");
    const { code } = await otpService.createAndSendOTP({ userId: patient.id, email: patient.email, purpose: "phone_login" });
    expect(await otpService.verifyOTP(patient.id, code, "mfa")).toBe(false);
    expect(await otpService.verifyOTP(patient.id, code, "mfa_step_up")).toBe(false);
    expect(await otpService.verifyOTP(patient.id, code, "phone_login")).toBe(true);
  });

  it("doesn't sign staff in by phone, and answers as if the number were unknown", async () => {
    const phone = randomPhone();
    await makeUser("clinician", "phone-staff", phone);

    const requested = await post("/api/auth/otp/request", { phone });
    const unknown = await post("/api/auth/otp/request", { phone: randomPhone() });
    expect(requested.status).toBe(200);
    expect(requested.body.message).toBe(unknown.body.message);
    expect(sent).toEqual([]);

    expect((await post("/api/auth/otp/verify", { phone, code: "123456" })).status).toBe(401);
  });

  it("signs a patient in by phone with the code sent to them", async () => {
    const phone = randomPhone();
    await makeUser("patient", "phone-patient", phone);
    expect((await post("/api/auth/otp/request", { phone })).status).toBe(200);
    const code = lastCodeTo(phone)!;
    const res = await post("/api/auth/otp/verify", { phone, code });
    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
  });

  it("keeps the code out of the email subject", async () => {
    const sendEmail = jest
      .spyOn(communicationService, "sendEmail")
      .mockResolvedValue({ success: true, messageId: "synthetic" });
    (communicationService.sendMfaCode as jest.Mock).mockRestore();
    try {
      await communicationService.sendMfaCode("subject-check@example.test", "482913");
      const { subject } = sendEmail.mock.calls[0][0];
      expect(subject).not.toContain("482913");
    } finally {
      sendEmail.mockRestore();
    }
  });
});
