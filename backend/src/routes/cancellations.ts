import { Router, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { appointmentIdParamsSchema } from "../schemas/booking";

const router = Router();
const isMockStripe = env.isMockStripe;
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as never,
});

// Deposit refund tiers for clinic and video appointments (unchanged policy).
export function appointmentRefundPolicy(hoursUntilVisit: number): { refundPercentage: number; policyNotice: string } {
  if (hoursUntilVisit >= 48) {
    return { refundPercentage: 100, policyNotice: "Full deposit refund issued (>48 hours notice given)." };
  }
  if (hoursUntilVisit >= 24) {
    return { refundPercentage: 50, policyNotice: "50% deposit refund issued (24-48 hours notice given)." };
  }
  return { refundPercentage: 0, policyNotice: "Deposit retained to cover reserved clinical chair time (<24 hours notice)." };
}

// ─── POST /api/booking/appointments/:id/cancel-with-refund ────────────────────
// The only way a patient cancels an appointment (CS-18). Van visits are
// cancelled through their van request, which applies the van policy.
router.post("/:id/cancel-with-refund", requireAuth, validateParams(appointmentIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.id);

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!profile) return res.status(404).json({ error: "Patient profile not found" });

  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, patientId: profile.id },
    include: { vanServiceRequest: { select: { id: true } } },
  });
  if (!appointment) return res.status(404).json({ error: "Appointment not found" });

  const hoursUntilVisit = (appointment.startTimeUtc.getTime() - Date.now()) / (1000 * 3600);
  const summary = (refundAmountPence: number, refundPercentage: number, stripeRefundId: string | null, policyNotice: string) => ({
    appointmentId: appointment.id,
    appointmentStatus: "cancelled",
    hoursUntilVisit: Math.round(hoursUntilVisit * 10) / 10,
    depositPaidPence: appointment.depositPaidPence,
    refundPercentage,
    refundAmountPence,
    stripeRefundId,
    policyNotice,
  });

  if (appointment.status === "cancelled") {
    return res.json(summary(0, 0, null, "Appointment was already cancelled"));
  }
  if (appointment.vanServiceRequest) {
    return res.status(409).json({
      error: "This is a van visit. Cancel it from the van request so the van cancellation policy applies.",
      vanRequestId: appointment.vanServiceRequest.id,
    });
  }
  if (appointment.status !== "confirmed" && appointment.status !== "draft_hold") {
    return res.status(409).json({ error: `An appointment that is ${appointment.status} cannot be cancelled` });
  }

  // A held slot has no deposit to refund.
  const { refundPercentage, policyNotice } =
    appointment.status === "draft_hold"
      ? { refundPercentage: 0, policyNotice: "No deposit was taken for this booking." }
      : appointmentRefundPolicy(hoursUntilVisit);
  const refundAmountPence = Math.round((appointment.depositPaidPence * refundPercentage) / 100);

  // Refund before cancelling: if Stripe fails the appointment stays as it was
  // and the patient can retry. The Stripe idempotency key means a retry or a
  // concurrent request returns the same refund rather than a second one.
  let stripeRefundId: string | null = null;
  if (refundAmountPence > 0) {
    if (!isMockStripe && appointment.stripePaymentId && !appointment.stripePaymentId.startsWith("pi_mock_")) {
      const refund = await stripe.refunds.create(
        { payment_intent: appointment.stripePaymentId, amount: refundAmountPence, reason: "requested_by_customer" },
        { idempotencyKey: `refund:${appointment.id}` }
      );
      stripeRefundId = refund.id;
    } else if (isMockStripe) {
      stripeRefundId = `re_mock_${Date.now()}`;
    }
    // Otherwise there is no real Stripe payment to refund, so no refund id is reported.
  }

  const claimed = await prisma.appointment.updateMany({
    where: { id: appointment.id, status: appointment.status },
    data: { status: "cancelled" },
  });
  if (claimed.count === 0) {
    // A concurrent request changed the appointment first.
    const current = await prisma.appointment.findUnique({ where: { id: appointment.id }, select: { status: true } });
    if (current?.status === "cancelled") {
      return res.json(summary(refundAmountPence, refundPercentage, stripeRefundId, policyNotice));
    }
    return res.status(409).json({ error: "The appointment changed while cancelling. Please refresh and try again." });
  }

  return res.json(summary(refundAmountPence, refundPercentage, stripeRefundId, policyNotice));
});

export default router;
