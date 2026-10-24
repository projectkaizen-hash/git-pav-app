import http from "http";
import crypto from "crypto";
import { checkRedFlags, RED_FLAG_PATTERNS, TriageData } from "../lib/triage-escalation";
import { signAccessToken } from "../lib/jwt";
import { prisma } from "../lib/prisma";

describe("CS-36: Triage rules and clinical safety escalation (TE-1, VD-2)", () => {
  let server: http.Server;
  let baseUrl: string;
  let patientToken: string;
  const tag = crypto.randomUUID().slice(0, 8);

  beforeAll(async () => {
    const serverModule = require("../server");
    const app = serverModule.default ?? serverModule;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const port = (server.address() as any).port;
    baseUrl = `http://localhost:${port}`;

    const user = await prisma.user.create({
      data: { email: `triage-test-${tag}@example.test`, passwordHash: "x", role: "patient" },
    });
    patientToken = signAccessToken({ sub: user.id, role: "patient", sessionId: crypto.randomUUID() });
  });

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  // ─── Table tests per red-flag rule (TE-1 spec) ───────────────────────────────
  const rulesTable: Array<{
    ruleName: string;
    input: TriageData;
    expectedRedFlag: boolean;
    expectedType?: string;
    expectedEmergencyNumber?: string;
    expectedBlockBooking: boolean;
  }> = [
    {
      ruleName: "difficultyBreathing triggers airway emergency (999)",
      input: { chiefComplaint: "Trouble breathing", difficultyBreathing: true },
      expectedRedFlag: true,
      expectedType: "airway_or_breathing",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "difficultySwallowing triggers airway emergency (999)",
      input: { chiefComplaint: "Can't swallow saliva", difficultySwallowing: true },
      expectedRedFlag: true,
      expectedType: "airway_or_breathing",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Swelling with difficulty swallowing triggers airway emergency (999)",
      input: { chiefComplaint: "Swollen neck and throat", swelling: true, difficultySwallowing: true },
      expectedRedFlag: true,
      expectedType: "airway_or_breathing",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Free-text airway keywords trigger airway emergency (999)",
      input: { chiefComplaint: "I feel like I am choking on swelling" },
      expectedRedFlag: true,
      expectedType: "airway_or_breathing",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Swelling with severe pain (>= 7) triggers severe swelling (999)",
      input: { chiefComplaint: "Cheek swelling", swelling: true, painLevel: 8 },
      expectedRedFlag: true,
      expectedType: "severe_swelling",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Swelling with fever triggers severe swelling (999)",
      input: { chiefComplaint: "Cheek is warm and swollen", swelling: true, fever: true, painLevel: 5 },
      expectedRedFlag: true,
      expectedType: "severe_swelling",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Free-text neck swollen triggers severe swelling (999)",
      input: { chiefComplaint: "My neck is swollen near the jaw", painLevel: 5 },
      expectedRedFlag: true,
      expectedType: "severe_swelling",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Bleeding boolean triggers uncontrolled bleeding (999)",
      input: { chiefComplaint: "Extracted tooth bleeding", bleeding: true },
      expectedRedFlag: true,
      expectedType: "uncontrolled_bleeding",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Free-text bleeding won't stop triggers uncontrolled bleeding (999)",
      input: { chiefComplaint: "Bleeding won't stop after accident" },
      expectedRedFlag: true,
      expectedType: "uncontrolled_bleeding",
      expectedEmergencyNumber: "999",
      expectedBlockBooking: true,
    },
    {
      ruleName: "High fever with severe pain (>= 8) triggers infection warning (111)",
      input: { chiefComplaint: "Severe toothache and fever", fever: true, painLevel: 8 },
      expectedRedFlag: true,
      expectedType: "high_fever",
      expectedEmergencyNumber: "111",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Severe trauma with pain >= 8 triggers trauma warning (111)",
      input: { chiefComplaint: "Fell off bike", traumaHistory: "Impact to mouth", painLevel: 8 },
      expectedRedFlag: true,
      expectedType: "severe_trauma",
      expectedEmergencyNumber: "111",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Free-text knocked out tooth triggers trauma warning (111)",
      input: { chiefComplaint: "Knocked out tooth during sports match" },
      expectedRedFlag: true,
      expectedType: "severe_trauma",
      expectedEmergencyNumber: "111",
      expectedBlockBooking: true,
    },
    {
      ruleName: "Extreme pain (>= 9) warns urgent care but does not block booking",
      input: { chiefComplaint: "Excruciating pain", painLevel: 9 },
      expectedRedFlag: true,
      expectedType: "extreme_pain",
      expectedEmergencyNumber: "111",
      expectedBlockBooking: false,
    },
    {
      ruleName: "Mild routine symptom does not trigger red flags and allows booking",
      input: { chiefComplaint: "Mild sensitivity to cold drinks", painLevel: 3 },
      expectedRedFlag: false,
      expectedBlockBooking: false,
    },
  ];

  test.each(rulesTable)("$ruleName", ({ input, expectedRedFlag, expectedType, expectedEmergencyNumber, expectedBlockBooking }) => {
    const result = checkRedFlags(input);
    expect(result.isRedFlag).toBe(expectedRedFlag);
    if (expectedRedFlag) {
      expect(result.flagType).toBe(expectedType);
      expect(result.emergencyNumber).toBe(expectedEmergencyNumber);
    }
    expect(result.shouldBlockBooking).toBe(expectedBlockBooking);
  });

  // ─── HTTP API Integration Tests ──────────────────────────────────────────────
  it("POST /api/triage/check blocks booking (403) on emergency red-flag", async () => {
    const res = await fetch(`${baseUrl}/api/triage/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patientToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chiefComplaint: "My throat is swelling up and I can't breathe",
        difficultyBreathing: true,
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.isRedFlag).toBe(true);
    expect(body.shouldBlockBooking).toBe(true);
    expect(body.canProceed).toBe(false);
    expect(body.emergencyNumber).toBe("999");
    expect(body.emergencyInstructions).toContain("999");
  });

  it("POST /api/triage/check allows booking (200) for standard dental complaint", async () => {
    const res = await fetch(`${baseUrl}/api/triage/check`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${patientToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chiefComplaint: "Routine checkup and polish",
        painLevel: 1,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    expect(body.isRedFlag).toBe(false);
    expect(body.shouldBlockBooking).toBe(false);
    expect(body.canProceed).toBe(true);
  });
});
