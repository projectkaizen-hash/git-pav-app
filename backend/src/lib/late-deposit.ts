import Stripe from "stripe";
import { env } from "../config/env";
import { prisma } from "./prisma";
import { createAuditLogWithIntegrity } from "./audit-integrity";
import { pseudonymiseIp } from "./audit-security";
import { sendPatientNotification } from "./patient-push";

// A deposit that succeeds after its slot hold has run out, or after the
// booking was cancelled, is refunded in full and the patient is told
// (decisions log #7). The slot is not revived: someone else may have it.

export const LATE_DEPOSIT_AUDIT_ACTION = "appointment.late_deposit_refunded";

/** True when a deposit arriving now can no longer confirm the appointment because its slot hold expired. */
export function isLateForHold(appointment: { status: string; holdExpiresAt: Date | null }, now = new Date()): boolean {
  if (appointment.status === "draft_hold") {
    return appointment.holdExpiresAt !== null && appointment.holdExpiresAt <= now;
  }
  if (appointment.status === "cancelled") {
    // Only an unconfirmed draft hold (holdExpiresAt !== null) is late.
    // A patient cancellation of a confirmed booking (where confirmation cleared holdExpiresAt to null)
    // is never late for hold and cannot be turned into a full refund (CS-49).
    return appointment.holdExpiresAt !== null;
  }
  return false;
}

export type LateDepositOutcome = "refunded" | "already_refunded" | "mock";

export async function refundLateDeposit(
  args: { appointmentId: string | null; patientId: string | null; paymentIntentId: string; amountPence: number },
  opts: { stripe?: Pick<Stripe, "refunds"> } = {}
): Promise<LateDepositOutcome> {
  const { appointmentId, patientId, paymentIntentId, amountPence } = args;

  // The webhook and the confirm call can both get here; only the first
  // records and notifies. Stripe's idempotency key covers the refund itself.
  const alreadyRecorded = await prisma.auditLog.findFirst({
    where: { action: LATE_DEPOSIT_AUDIT_ACTION, resourceId: paymentIntentId },
    select: { id: true },
  });

  let outcome: LateDepositOutcome = "mock";
  if (!env.isMockStripe || opts.stripe) {
    const stripe = opts.stripe ?? new Stripe(env.stripeSecretKey, { apiVersion: "2025-02-24.acacia" as never });
    await stripe.refunds.create(
      { payment_intent: paymentIntentId, reason: "requested_by_customer", metadata: { reason: "late_deposit" } },
      { idempotencyKey: `late-deposit-refund:${paymentIntentId}` }
    );
    outcome = "refunded";
  }

  if (appointmentId) {
    // An expired hold the sweeper hasn't reached yet must not be confirmed later.
    await prisma.appointment.updateMany({
      where: { id: appointmentId, status: "draft_hold", stripePaymentId: paymentIntentId },
      data: { status: "cancelled" },
    });
  }

  if (alreadyRecorded) return outcome === "mock" ? "mock" : "already_refunded";

  await createAuditLogWithIntegrity({
    action: LATE_DEPOSIT_AUDIT_ACTION,
    actorId: null,
    resourceId: paymentIntentId,
    sessionId: null,
    ipHash: pseudonymiseIp(""),
    metadata: { appointmentId, amountPence, outcome },
  });

  if (patientId) {
    const pounds = (amountPence / 100).toFixed(2);
    await sendPatientNotification(
      patientId,
      "Deposit refunded",
      `Your booking hold ran out before your payment went through, so we've refunded your £${pounds} deposit. Please choose a new time.`,
      { type: "late_deposit_refund", appointmentId }
    );
  }

  return outcome;
}
