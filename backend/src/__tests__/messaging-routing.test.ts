import http from "http";
import crypto from "crypto";
import { prisma } from "../lib/prisma";
import { signAccessToken } from "../lib/jwt";
import { communicationService } from "../lib/communication-service";
import { redis } from "../lib/redis";

describe("CS-29: Messaging that reaches people (MS-3)", () => {
  let server: http.Server;
  let baseUrl: string;
  let sendEmailSpy: jest.SpyInstance;

  const tag = crypto.randomUUID().slice(0, 8);
  const userIds: string[] = [];
  const threadIds: string[] = [];

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    sendEmailSpy = jest.spyOn(communicationService, "sendEmail").mockImplementation(async () => ({
      success: true,
      messageId: "mock_test_msg",
    }));
  });

  afterAll(async () => {
    sendEmailSpy.mockRestore();
    if (threadIds.length > 0) {
      await prisma.message.deleteMany({ where: { threadId: { in: threadIds } } }).catch(() => {});
      await prisma.messageThread.deleteMany({ where: { id: { in: threadIds } } }).catch(() => {});
    }
    if (userIds.length > 0) {
      await prisma.patientProfile.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.clinicianProfile.deleteMany({ where: { userId: { in: userIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: userIds } } }).catch(() => {});
    }
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      redis.disconnect();
    } catch {}
  });

  async function makePatient(label: string, firstName = "Alice", lastName = "Smith") {
    const user = await prisma.user.create({
      data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    userIds.push(user.id);
    const profile = await prisma.patientProfile.create({
      data: { userId: user.id, firstName, lastName },
    });
    const token = signAccessToken({ sub: user.id, role: "patient", sessionId: crypto.randomUUID() });
    return { user, profile, token };
  }

  async function makeClinician(label: string, fullName = "Sarah Jenkins") {
    const user = await prisma.user.create({
      data: { email: `${label}-${tag}@example.test`, passwordHash: "x", role: "clinician" },
    });
    userIds.push(user.id);
    const profile = await prisma.clinicianProfile.create({
      data: {
        userId: user.id,
        fullName,
        gdcNumber: String(910000 + crypto.randomInt(0, 89999)),
        roleTitle: "Dentist",
      },
    });
    const token = signAccessToken({ sub: user.id, role: "clinician", sessionId: crypto.randomUUID() });
    return { user, profile, token };
  }

  it("provides SLA metadata and clinical emergency advice on /api/messages/meta", async () => {
    const patient = await makePatient("meta-pat");
    const res = await fetch(`${baseUrl}/api/messages/meta`, {
      headers: { Authorization: `Bearer ${patient.token}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.operatingHours).toBeDefined();
    expect(data.emergencyAdvice).toContain("call 999");
    expect(data.emergencyAdvice).toContain("111");
  });

  it("routes patient message to a specific clinician and notifies them", async () => {
    sendEmailSpy.mockClear();
    const patient = await makePatient("pat-1", "James", "Miller");
    const clinician = await makeClinician("doc-1", "Sarah Jenkins");

    const res = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patient.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Sensitivity after filling",
        body: "Hello Dr. Jenkins, experiencing mild sensitivity on tooth 31.",
        recipientType: "clinician",
        recipientClinicianId: clinician.profile.id,
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    threadIds.push(data.id);
    expect(data.assignedClinicianId).toBe(clinician.profile.id);
    expect(data.recipientType).toBe("clinician");
    expect(data.from).toContain("Dr. Sarah Jenkins");

    // Staff notification was sent to clinician's email
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: clinician.user.email,
        subject: expect.stringContaining("James Miller"),
      })
    );
  });

  it("routes patient message to practice inbox when no clinician is assigned and notifies practice team", async () => {
    sendEmailSpy.mockClear();
    const patient = await makePatient("pat-2", "Emily", "Clark");

    const res = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patient.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Clinic parking question",
        body: "Is parking available at the Central practice?",
        recipientType: "practice",
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    threadIds.push(data.id);
    expect(data.assignedClinicianId).toBeNull();
    expect(data.recipientType).toBe("practice");

    // Practice inbox notified
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("[Practice Inbox]"),
      })
    );
  });

  it("allows clinician to reply with their real staff name (never 'You') and notifies the patient", async () => {
    sendEmailSpy.mockClear();
    const patient = await makePatient("pat-3", "Oliver", "Twist");
    const clinician = await makeClinician("doc-2", "Tariq Pav");

    // Create thread routed to this clinician
    const createRes = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patient.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Post-op care instructions",
        body: "How long before I can drink hot beverages?",
        recipientClinicianId: clinician.profile.id,
      }),
    });
    expect(createRes.status).toBe(201);
    const thread = (await createRes.json()) as any;
    threadIds.push(thread.id);

    // Clinician replies
    sendEmailSpy.mockClear();
    const replyRes = await fetch(`${baseUrl}/api/messages/${thread.id}/reply`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${clinician.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: "Please wait 2 hours until the local anaesthetic completely wears off.",
      }),
    });

    expect(replyRes.status).toBe(201);
    const replyData = (await replyRes.json()) as any;

    // MS-3 check: Staff reply shows real staff name, NOT "You"!
    expect(replyData.message.senderRole).toBe("clinician");
    expect(replyData.message.senderName).toBe("Dr. Tariq Pav");
    expect(replyData.message.senderName).not.toBe("You");

    // Thread preview reflects staff name
    expect(replyData.thread.preview).toContain("Dr. Tariq Pav: Please wait 2 hours");

    // Patient was notified via email of the staff reply
    expect(sendEmailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        to: patient.user.email,
        subject: expect.stringContaining("Dr. Tariq Pav"),
      })
    );
  });

  it("clinician sees routed thread in their inbox and unread status is maintained", async () => {
    const patient = await makePatient("pat-4", "Hannah", "Abbott");
    const clinician = await makeClinician("doc-3", "Sarah Jenkins");

    const createRes = await fetch(`${baseUrl}/api/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patient.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: "Whitening sensitivity inquiry",
        body: "I am having mild gum irritation.",
        recipientClinicianId: clinician.profile.id,
      }),
    });
    const thread = (await createRes.json()) as any;
    threadIds.push(thread.id);

    // Clinician queries GET /api/messages
    const listRes = await fetch(`${baseUrl}/api/messages`, {
      headers: { Authorization: `Bearer ${clinician.token}` },
    });
    expect(listRes.status).toBe(200);
    const threads = (await listRes.json()) as any[];

    const found = threads.find((t) => t.id === thread.id);
    expect(found).toBeDefined();
    // From clinician perspective, 'from' shows the patient's name
    expect(found.from).toBe("Hannah Abbott");
    expect(found.isRead).toBe(false); // New message is unread for staff
  });
});
