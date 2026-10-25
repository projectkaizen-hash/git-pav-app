import fs from "fs";
import path from "path";
import type { Request, Response } from "express";
import { errorHandler } from "../middleware/error-handler";
import { CommunicationService } from "../lib/communication-service";

// Synthetic markers standing in for patient data and credentials. If any of
// them reaches a log line, the test fails.
const NAME = "Zebedee-Quillfeather";
const MEDICAL = "pericoronitis-marker-77";
const EMAIL = "log.hygiene.marker@example.test";
const PHONE = "+447700900123";
const OTP = "481516";
const RESET_TOKEN = "reset-token-marker-2342abcdef";

function captureConsole() {
  const lines: string[] = [];
  const record = (...args: unknown[]) => {
    lines.push(args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" "));
  };
  const spies = (["log", "info", "warn", "error"] as const).map((level) =>
    jest.spyOn(console, level).mockImplementation(record)
  );
  return {
    output: () => lines.join("\n"),
    restore: () => spies.forEach((spy) => spy.mockRestore()),
  };
}

function expectClean(output: string) {
  for (const marker of [NAME, MEDICAL, EMAIL, PHONE, OTP, RESET_TOKEN]) {
    expect(output).not.toContain(marker);
  }
}

function fakeRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

describe("error handler logging", () => {
  const req = {
    headers: {},
    path: "/api/patients/me",
    method: "PATCH",
    body: { firstName: NAME, medicalHistory: MEDICAL, email: EMAIL, otp: OTP },
    query: { phone: PHONE },
  } as unknown as Request;

  it("logs the route and field names, never body or query values", () => {
    const cap = captureConsole();
    try {
      errorHandler(new Error("boom"), req, fakeRes(), jest.fn());
      const out = cap.output();
      expectClean(out);
      expect(out).toContain("/api/patients/me");
      expect(out).toContain("medicalHistory");
    } finally {
      cap.restore();
    }
  });

  it("drops Prisma error messages, which can quote query values", () => {
    const prismaErr = new Error(`Invalid invocation: data: { firstName: "${NAME}", notes: "${MEDICAL}" }`);
    prismaErr.name = "PrismaClientValidationError";
    const cap = captureConsole();
    try {
      errorHandler(prismaErr, req, fakeRes(), jest.fn());
      const out = cap.output();
      expectClean(out);
      expect(out).toContain("PrismaClientValidationError");
    } finally {
      cap.restore();
    }
  });
});

describe("communication service without a provider (development/test)", () => {
  const original = { ...process.env };
  beforeAll(() => {
    delete process.env.POSTMARK_SERVER_TOKEN;
    delete process.env.TWILIO_ACCOUNT_SID;
  });
  afterAll(() => {
    process.env = original;
  });

  it("logs metadata only for emails carrying tokens", async () => {
    const service = new CommunicationService();
    const cap = captureConsole();
    try {
      await service.sendVerificationEmail(EMAIL, RESET_TOKEN);
      await service.sendEmail({ to: EMAIL, subject: "Password reset", html: RESET_TOKEN, text: RESET_TOKEN });
      expectClean(cap.output());
    } finally {
      cap.restore();
    }
  });

  it("logs metadata only for SMS codes", async () => {
    const service = new CommunicationService();
    const cap = captureConsole();
    try {
      await service.sendSms({ to: PHONE, body: `Your Pav Dental code is ${OTP}` });
      const out = cap.output();
      expectClean(out);
      expect(out).toContain("***0123");
    } finally {
      cap.restore();
    }
  });
});

describe("communication service without a provider (deployed)", () => {
  it("reports failure instead of pretending to send", async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock("../config/env", () => ({ env: { isProduction: true, isStaging: false } }));
      const { CommunicationService: DeployedService } = require("../lib/communication-service");
      const service = new DeployedService();
      const cap = captureConsole();
      try {
        const email = await service.sendEmail({ to: EMAIL, subject: "Reset", html: RESET_TOKEN, text: RESET_TOKEN });
        const sms = await service.sendSms({ to: PHONE, body: OTP });
        expect(email.success).toBe(false);
        expect(sms.success).toBe(false);
        expectClean(cap.output());
      } finally {
        cap.restore();
      }
    });
  });
});

describe("console calls in server code", () => {
  // A raw Prisma or Stripe error can quote names, emails or notes, so errors
  // go through safeError before they reach a log (CS-11).
  const rawErrorArg = /console\.(log|warn|error)\(.*,\s*(err|error|e|\w+Err|\w+Error)(\.message)?\)\s*;?\s*$/;

  function* sourceFiles(dir: string): Generator<string> {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== "__tests__") yield* sourceFiles(full);
      } else if (entry.name.endsWith(".ts") && entry.name !== "e2e-suite.ts") {
        yield full;
      }
    }
  }

  it("never log a raw error object or message", () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(path.join(__dirname, ".."))) {
      fs.readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (rawErrorArg.test(line)) offenders.push(`${path.relative(process.cwd(), file)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
