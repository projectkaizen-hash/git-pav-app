// Unit tests for the live ETA re-push broadcast.
// Prisma and the ETA chain are mocked so drift gating, throttle windows,
// and force semantics are exercised hermetically.

process.env.PORT = process.env.PORT || "3000";

jest.mock("../lib/prisma", () => ({
  prisma: {
    vanShift: {
      findUnique: jest.fn(),
    },
    vanServiceRequest: {
      findMany: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock("../lib/patient-push", () => ({
  sendPatientNotification: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../lib/van-eta", () => ({
  // Deterministic chain: 600s per remaining leg.
  etaSecondsToNewPatient: jest.fn().mockResolvedValue(600),
}));

import { prisma } from "../lib/prisma";
import { sendPatientNotification } from "../lib/patient-push";
import { etaSecondsToNewPatient } from "../lib/van-eta";
import { broadcastEtaUpdates, isMaterialDrift } from "../lib/van-eta-broadcast";

const SHIFT_ID = "shift-1";

function mockShift(lastLat: number | null, lastLng: number | null) {
  (prisma.vanShift.findUnique as jest.Mock).mockResolvedValue({
    id: SHIFT_ID,
    lastLat,
    lastLng,
  });
}

function makeStop(overrides: Record<string, unknown> = {}) {
  return {
    id: "req-1",
    patientId: "patient-1",
    queuePosition: 1,
    patientLat: 51.51,
    patientLng: -0.13,
    phase: "queued",
    treatmentStartedAt: null,
    status: "accepted",
    lastEtaSeconds: null as number | null,
    lastEtaPushedAt: null as Date | null,
    service: { durationMinutes: 30 },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  (prisma.vanServiceRequest.update as jest.Mock).mockResolvedValue({});
  (sendPatientNotification as jest.Mock).mockResolvedValue(undefined);
  (etaSecondsToNewPatient as jest.Mock).mockResolvedValue(600);
});

describe("isMaterialDrift", () => {
  test("first fix (no previous position) is always material", () => {
    expect(isMaterialDrift(null, null, 51.5, -0.12)).toBe(true);
  });

  test("small movement (just a few metres) is not material", () => {
    // ~10 m apart
    expect(isMaterialDrift(51.5, -0.12, 51.5001, -0.12)).toBe(false);
  });

  test("movement above 200 m is material", () => {
    // ~220 m north
    expect(isMaterialDrift(51.5, -0.12, 51.502, -0.12)).toBe(true);
  });

  test("threshold scales with queue length", () => {
    // ~220 m move: material for a 1-stop queue, not for a 3-stop queue
    // (threshold 200 + 2×100 = 400 m)
    expect(isMaterialDrift(51.5, -0.12, 51.502, -0.12, 1)).toBe(true);
    expect(isMaterialDrift(51.5, -0.12, 51.502, -0.12, 3)).toBe(false);
  });
});

describe("broadcastEtaUpdates", () => {
  test("no van fix → no outcomes, no pushes", async () => {
    mockShift(null, null);
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([makeStop()]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);

    expect(Object.keys(outcomes)).toHaveLength(0);
    expect(sendPatientNotification).not.toHaveBeenCalled();
  });

  test("no active stops → no outcomes", async () => {
    mockShift(51.5, -0.12);
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);
    expect(Object.keys(outcomes)).toHaveLength(0);
  });

  test("first push for a patient always goes out (no previous ETA)", async () => {
    mockShift(51.5, -0.12);
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([makeStop()]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);

    expect(outcomes["req-1"]).toBe("pushed");
    expect(sendPatientNotification).toHaveBeenCalledWith(
      "patient-1",
      "ETA Update",
      expect.stringContaining("around 10 minutes"),
      expect.objectContaining({ requestId: "req-1", type: "eta_update" })
    );
    expect(prisma.vanServiceRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "req-1" },
        data: expect.objectContaining({ lastEtaSeconds: 600 }),
      })
    );
  });

  test("change below drift threshold is suppressed", async () => {
    mockShift(51.5, -0.12);
    // Last pushed 590s; new ETA 600s — 10s delta, far below 5 min gate.
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([
      makeStop({ lastEtaSeconds: 590, lastEtaPushedAt: new Date(Date.now() - 3600_000) }),
    ]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);

    expect(outcomes["req-1"]).toBe("below_drift");
    expect(sendPatientNotification).not.toHaveBeenCalled();
  });

  test("material change inside the throttle window is suppressed", async () => {
    mockShift(51.5, -0.12);
    (etaSecondsToNewPatient as jest.Mock).mockResolvedValue(1800); // 30 min vs 10 min = 20 min drift
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([
      makeStop({ lastEtaSeconds: 600, lastEtaPushedAt: new Date(Date.now() - 60_000) }), // pushed 1 min ago
    ]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);

    expect(outcomes["req-1"]).toBe("throttled");
    expect(sendPatientNotification).not.toHaveBeenCalled();
  });

  test("material change after the throttle window pushes", async () => {
    mockShift(51.5, -0.12);
    (etaSecondsToNewPatient as jest.Mock).mockResolvedValue(1800);
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([
      makeStop({ lastEtaSeconds: 600, lastEtaPushedAt: new Date(Date.now() - 15 * 60_000) }), // 15 min ago
    ]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID);

    expect(outcomes["req-1"]).toBe("pushed");
    expect(sendPatientNotification).toHaveBeenCalledWith(
      "patient-1",
      "ETA Update",
      expect.stringContaining("around 30 minutes"),
      expect.any(Object)
    );
  });

  test("force bypasses both gates (post-accept seed)", async () => {
    mockShift(51.5, -0.12);
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([
      makeStop({ lastEtaSeconds: 600, lastEtaPushedAt: new Date() }), // pushed just now, no drift
    ]);

    const outcomes = await broadcastEtaUpdates(SHIFT_ID, { force: true });

    expect(outcomes["req-1"]).toBe("pushed");
    expect(sendPatientNotification).toHaveBeenCalled();
  });

  test("only stops ahead of a patient feed their ETA chain", async () => {
    mockShift(51.5, -0.12);
    const stop1 = makeStop({ id: "req-1", patientId: "p1", queuePosition: 1 });
    const stop2 = makeStop({ id: "req-2", patientId: "p2", queuePosition: 2 });
    (prisma.vanServiceRequest.findMany as jest.Mock).mockResolvedValue([stop1, stop2]);

    await broadcastEtaUpdates(SHIFT_ID);

    // Stop 1 is first: empty chain. Stop 2 has stop 1 ahead of it.
    expect(etaSecondsToNewPatient).toHaveBeenNthCalledWith(
      1,
      expect.anything(),
      [],
      expect.anything()
    );
    expect(etaSecondsToNewPatient).toHaveBeenNthCalledWith(
      2,
      expect.anything(),
      [expect.objectContaining({ lat: 51.51, lng: -0.13 })],
      expect.anything()
    );
  });
});
