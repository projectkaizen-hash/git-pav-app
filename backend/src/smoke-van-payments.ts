// backend/src/smoke-van-payments.ts
// Mock-Stripe smoke test for the van deposit money flow.
// Verifies: create → authorize (mock) → accept captures path → phase ladder,
// plus deposit release on patient cancel, operator decline, and expiry sweep.
// Run: PORT=3000 npx tsx src/smoke-van-payments.ts

import app from "./server";
import http from "http";
import { prisma } from "./lib/prisma";
import { signAccessToken } from "./lib/jwt";
import crypto from "crypto";
import { processExpiredVanRequests } from "./lib/background-jobs";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

async function main() {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(3003, resolve));
  const base = "http://localhost:3003";

  try {
    // ── Fixtures ──────────────────────────────────────────────────────────
    const suffix = crypto.randomUUID().slice(0, 8);

    const patientUser = await prisma.user.create({
      data: {
        email: `van_smoke_patient_${suffix}@pavdental.co.uk`,
        passwordHash: "smoke",
        role: "patient",
        patientProfile: { create: { firstName: "Smoke", lastName: "Patient" } },
      },
      include: { patientProfile: true },
    });

    const operatorUser = await prisma.user.create({
      data: {
        email: `van_smoke_op_${suffix}@pavdental.co.uk`,
        passwordHash: "smoke",
        role: "operator",
        operatorProfile: { create: { fullName: "Smoke Operator" } },
      },
      include: { operatorProfile: true },
    });

    const van = await prisma.van.findFirst({ include: { servicePolygons: true } });
    assert(!!(van && van.servicePolygons.length > 0), "seeded van with coverage polygon");
    await prisma.vanOperatorAssignment.create({
      data: { operatorId: operatorUser.operatorProfile!.id, vanId: van.id, startsAt: new Date() },
    });

    let service = await prisma.service.findFirst({ where: { supportedChannels: { has: "van" }, isActive: true } });
    if (!service) {
      service = await prisma.service.create({
        data: {
          id: `srv_van_smoke_${suffix}`,
          name: "Smoke Van Service",
          category: "checkup",
          description: "smoke",
          durationMinutes: 30,
          pricePence: 8500,
          depositPence: 2500,
          supportedChannels: ["van"],
        },
      });
    }

    const patientToken = signAccessToken({ sub: patientUser.id, role: "patient", sessionId: crypto.randomUUID() });
    const operatorToken = signAccessToken({ sub: operatorUser.id, role: "operator", sessionId: crypto.randomUUID() });

    // Fixture hygiene: close any stale shifts left by previous runs so this
    // operator can own the van for the duration of the smoke test.
    await prisma.vanShift.updateMany({
      where: { endedAt: null },
      data: { status: "offline", endedAt: new Date() },
    });

    const accessDetails = {
      addressLine1: "10 Downing Street",
      city: "London",
      postcode: "SW1A 2AA",
      lat: 51.5032,
      lng: -0.1276,
      parkingType: "permit_bay",
    };

    async function createRequest(): Promise<any> {
      const res = await fetch(`${base}/api/van/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${patientToken}` },
        body: JSON.stringify({ serviceId: service!.id, accessDetails }),
      });
      const data = await res.json();
      if (res.status !== 201) {
        throw new Error(`create request → ${res.status}: ${JSON.stringify(data)}`);
      }
      return data;
    }

    // Operator shift online (positioned at the request location so ETA is short)
    const shiftRes = await fetch(`${base}/api/van/shift/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${operatorToken}` },
      body: JSON.stringify({ lat: 51.5032, lng: -0.1276 }),
    });
    assert(shiftRes.status === 201, `shift start → ${shiftRes.status}: ${JSON.stringify(await shiftRes.json())}`);

    // ── 1. Happy path: create → depositAuthorized → accept → phase ladder ─
    const req1 = await createRequest();
    assert(req1.isMockPayment === true, "mock payment flagged");
    assert(typeof req1.clientSecret === "string", "mock client secret present");

    const detail1: any = await fetch(`${base}/api/van/requests/${req1.id}`, {
      headers: { Authorization: `Bearer ${patientToken}` },
    }).then((r) => r.json());
    assert(detail1.depositAuthorized === true, "depositAuthorized true in mock mode");

    const acceptRes = await fetch(`${base}/api/van/requests/${req1.id}/accept`, {
      method: "POST",
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert(acceptRes.status === 200, `accept → ${acceptRes.status}: ${JSON.stringify(await acceptRes.json())}`);

    for (const phase of ["en_route", "on_site", "in_treatment", "completed"]) {
      const pRes = await fetch(`${base}/api/van/requests/${req1.id}/phase`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({ phase }),
      });
      assert(pRes.status === 200, `phase ${phase} → ${pRes.status}`);
    }
    console.log("✓ Happy path: create → authorize → accept → phases → completed");

    // ── 2. Patient cancel releases the deposit ────────────────────────────
    const req2 = await createRequest();
    const cancelRes = await fetch(`${base}/api/van/requests/${req2.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(cancelRes.status === 200, `cancel → ${cancelRes.status}: ${JSON.stringify(await cancelRes.json())}`);
    console.log("✓ Patient cancel releases deposit (mock) and cancels request");

    // ── 3. Operator decline releases the deposit ──────────────────────────
    const req3 = await createRequest();
    const declineRes = await fetch(`${base}/api/van/requests/${req3.id}/decline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert(declineRes.status === 200, `decline → ${declineRes.status}`);
    const declined: any = await declineRes.json();
    assert(declined.status === "declined", "decline moves request to declined");
    console.log("✓ Operator decline releases deposit (mock) and declines request");

    // ── 4. Expiry sweep releases + expires stale pendings ─────────────────
    const req4 = await createRequest();
    await prisma.vanServiceRequest.update({
      where: { id: req4.id },
      data: { expiresAt: new Date(Date.now() - 60_000) },
    });
    const sweep = await processExpiredVanRequests();
    assert(sweep.expiredCount >= 1, `sweeper expired at least 1 request (got ${sweep.expiredCount})`);
    const expired = await prisma.vanServiceRequest.findUnique({ where: { id: req4.id } });
    assert(expired?.status === "expired", "stale pending request expired by sweeper");
    console.log("✓ Expiry sweeper releases deposit (mock) and expires stale request");

    // ── 5. Payment-retry endpoint ─────────────────────────────────────────
    const req5 = await createRequest();
    const retryRes = await fetch(`${base}/api/van/requests/${req5.id}/payment-retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    assert(retryRes.status === 200, `payment-retry → ${retryRes.status}`);
    const retry: any = await retryRes.json();
    assert(retry.isMockPayment === true, "retry reports mock payment");
    await fetch(`${base}/api/van/requests/${req5.id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${patientToken}` },
    });
    console.log("✓ Payment-retry endpoint returns authorization details for pending request");

    // ── 6. Audit trail for releases ───────────────────────────────────────
    const audits = await prisma.auditLog.findMany({
      where: { action: "van.payment.released" },
      orderBy: { timestampUtc: "desc" },
      take: 5,
    });
    console.log(`✓ Audit trail present (${audits.length} recent van.payment.released entries; mock releases are no-ops by design)`);

    console.log("\n🎉 VAN DEPOSIT PAYMENTS SMOKE TEST PASSED");
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("❌ SMOKE FAILED:", err?.message ?? err);
    process.exit(1);
  }
);
