import { Router, Response } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { appointmentIdParamsSchema } from "../schemas/booking";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";

const router = Router();
const isMockStripe = env.isMockStripe;
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as never,
});

// ─── POST /api/booking/appointments/:id/cancel-with-refund ────────────────────
router.post("/:id/cancel-with-refund", requireAuth, validateParams(appointmentIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.id);
  const patientId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("cancel-appointment", { appointmentId, patientId });

  return withIdempotency(idempotencyKey, async () => {
    const profile = await prisma.patientProfile.findUnique({
      where: { userId: patientId },
      select: { id: true },
    });

    if (!profile) {
      return { error: "Patient profile not found", status: 404 };
    }

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patientId: profile.id },
    });

    if (!appointment) {
      return { error: "Appointment not found", status: 404 };
    }

    const hoursUntilVisit = (appointment.startTimeUtc.getTime() - Date.now()) / (1000 * 3600);
    let refundPercentage = 0;
    let policyNotice = "";

    if (hoursUntilVisit >= 48) {
      refundPercentage = 100;
      policyNotice = "Full deposit refund issued (>48 hours notice given).";
    } else if (hoursUntilVisit >= 24) {
      refundPercentage = 50;
      policyNotice = "50% deposit refund issued (24-48 hours notice given).";
    } else {
      refundPercentage = 0;
      policyNotice = "Deposit retained to cover reserved clinical chair time (<24 hours notice).";
    }

    const refundAmountPence = Math.round((appointment.depositPaidPence * refundPercentage) / 100);

    if (appointment.status === "cancelled") {
      return {
        appointmentId: appointment.id,
        appointmentStatus: "cancelled",
        hoursUntilVisit: Math.round(hoursUntilVisit * 10) / 10,
        depositPaidPence: appointment.depositPaidPence,
        refundPercentage,
        refundAmountPence,
        stripeRefundId: null,
        policyNotice: "Appointment was already cancelled",
        httpStatus: 200,
      };
    }

    let stripeRefundId: string | null = null;
    if (refundAmountPence > 0) {
      if (
        !isMockStripe &&
        appointment.stripePaymentId &&
        !appointment.stripePaymentId.startsWith("pi_mock_")
      ) {
        const refund = await stripe.refunds.create(
          {
            payment_intent: appointment.stripePaymentId,
            amount: refundAmountPence,
            reason: "requested_by_customer",
          },
          { idempotencyKey: `refund:${appointment.id}` }
        );
        stripeRefundId = refund.id;
      } else if (isMockStripe) {
        stripeRefundId = `re_mock_${Date.now()}`;
      }
      // Otherwise there is no real Stripe payment to refund, so no refund id is
      // reported (previously a fake re_mock_ id leaked into production responses).
    }

    const cancelledAppt = await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "cancelled" },
    });

    return {
      appointmentId: cancelledAppt.id,
      appointmentStatus: "cancelled",
      hoursUntilVisit: Math.round(hoursUntilVisit * 10) / 10,
      depositPaidPence: appointment.depositPaidPence,
      refundPercentage,
      refundAmountPence,
      stripeRefundId,
      policyNotice,
      httpStatus: 200,
    };
  }).then((result: any) => {
    if (result.error) {
      return res.status(result.status || result.httpStatus || 400).json({ error: result.error });
    }
    const { httpStatus, ...responseData } = result;
    return res.status(httpStatus || 200).json(responseData);
  });
});

export default router;
