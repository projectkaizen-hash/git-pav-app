import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateParams } from "../middleware/validate";
import { appointmentIdParamsSchema } from "../schemas/booking";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";

const router = Router();

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

    if (appointment.status === "cancelled") {
      // Return existing cancellation result if already cancelled
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

      return {
        appointmentId: appointment.id,
        appointmentStatus: "cancelled",
        hoursUntilVisit: Math.round(hoursUntilVisit * 10) / 10,
        depositPaidPence: appointment.depositPaidPence,
        refundPercentage,
        refundAmountPence,
        stripeRefundId: null, // Already processed
        policyNotice: "Appointment was already cancelled",
        httpStatus: 200,
      };
    }

    // Calculate cancellation window notice
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

    // Update appointment status in DB
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
      stripeRefundId: refundAmountPence > 0 ? `re_mock_${Date.now()}` : null,
      policyNotice,
      httpStatus: 200,
    };
  }).then((result: any) => {
    if (result.error) {
      return res.status(result.httpStatus).json({ error: result.error });
    }
    const { httpStatus, ...responseData } = result;
    return res.status(httpStatus).json(responseData);
  });
});

export default router;
