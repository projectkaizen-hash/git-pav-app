import { Request, Response, Router } from "express";
import Stripe from "stripe";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { createPaymentIntentSchema } from "../schemas/payments";
import { scheduleAppointmentReminderLadder } from "../lib/background-jobs";
import { sendPatientNotification } from "../lib/patient-push";

const router = Router();
const isMockStripe = env.stripeSecretKey.startsWith("sk_test_mock");
const stripe = new Stripe(env.stripeSecretKey, {
  apiVersion: "2025-02-24.acacia" as never,
});

// The server derives the deposit from the appointment's service. A mobile client
// can never submit an amount, currency, or payment confirmation.
router.post("/create-intent", requireAuth, validateBody(createPaymentIntentSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId } = req.body;

  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true },
  });
  if (!profile) return res.status(404).json({ error: "Patient profile not found" });

  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      patientId: profile.id,
      status: "draft_hold",
      holdExpiresAt: { gt: new Date() },
    },
    include: { service: { select: { depositPence: true, name: true } } },
  });
  if (!appointment) return res.status(404).json({ error: "Active appointment hold not found" });

  if (isMockStripe) {
    const paymentIntentId = `pi_mock_${appointment.id.replaceAll("-", "")}`;
    await prisma.appointment.update({
      where: { id: appointment.id },
      data: { stripePaymentId: paymentIntentId },
    });
    return res.json({
      clientSecret: `${paymentIntentId}_secret_mock`,
      paymentIntentId,
      publishableKey: env.stripePublishableKey,
      isMock: true,
    });
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: appointment.service.depositPence,
    currency: "gbp",
    metadata: {
      appointmentId: appointment.id,
      patientUserId: req.user!.sub,
      serviceName: appointment.service.name,
    },
    automatic_payment_methods: { enabled: true },
  }, { idempotencyKey: `appointment-deposit:${appointment.id}` });

  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripePaymentId: paymentIntent.id },
  });

  return res.json({
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    publishableKey: env.stripePublishableKey,
    isMock: false,
  });
});

// ─── POST /api/payments/setup-intent ──────────────────────────────────────────
// Creates a Stripe SetupIntent for saving a card without charging.
// The mobile app uses the client_secret with Stripe's CardField to tokenise
// the card locally — raw PANs never reach our server.
router.post("/setup-intent", requireAuth, async (req: AuthRequest, res: Response) => {
  if (isMockStripe) {
    return res.json({
      clientSecret: `seti_mock_${req.user!.sub}_secret_mock`,
      isMock: true,
    });
  }

  // Find or create a Stripe Customer for this user
  let stripeCustomerId: string | null = null;
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { id: true, stripeCustomerId: true, firstName: true, lastName: true },
  });

  if (profile?.stripeCustomerId) {
    stripeCustomerId = profile.stripeCustomerId;
  } else if (profile) {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.sub },
      select: { email: true },
    });
    const customer = await stripe.customers.create({
      email: user?.email,
      name: `${profile.firstName} ${profile.lastName}`,
      metadata: { userId: req.user!.sub },
    });
    stripeCustomerId = customer.id;
    await prisma.patientProfile.update({
      where: { id: profile.id },
      data: { stripeCustomerId },
    });
  }

  const setupIntent = await stripe.setupIntents.create({
    customer: stripeCustomerId ?? undefined,
    payment_method_types: ["card"],
    metadata: { userId: req.user!.sub },
  });

  return res.json({ clientSecret: setupIntent.client_secret, isMock: false });
});

// ─── POST /api/payments/methods/attach ────────────────────────────────────────
// After confirmSetupIntent succeeds on the device, the app sends us the
// resulting paymentMethodId so we can store it for display in the methods list.
router.post("/methods/attach", requireAuth, async (req: AuthRequest, res: Response) => {
  const { paymentMethodId } = req.body as { paymentMethodId?: string };
  if (!paymentMethodId || typeof paymentMethodId !== "string") {
    return res.status(400).json({ error: "paymentMethodId is required" });
  }

  if (isMockStripe) {
    return res.json({ success: true, isMock: true });
  }

  // Retrieve details from Stripe so we can display brand/last4 etc.
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  const profile = await prisma.patientProfile.findUnique({
    where: { userId: req.user!.sub },
    select: { stripeCustomerId: true },
  });
  const pmCustomerId = typeof pm.customer === "string" ? pm.customer : pm.customer?.id;
  if (!isMockStripe && pmCustomerId && profile?.stripeCustomerId && pmCustomerId !== profile.stripeCustomerId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const card = pm.card;
  if (!card) {
    return res.status(400).json({ error: "PaymentMethod is not a card" });
  }

  // Store in DB (upsert by paymentMethodId to handle retries)
  await prisma.savedPaymentMethod.upsert({
    where: { stripePaymentMethodId: paymentMethodId },
    update: {},
    create: {
      stripePaymentMethodId: paymentMethodId,
      userId: req.user!.sub,
      brand: card.brand,
      last4: card.last4,
      expMonth: card.exp_month,
      expYear: card.exp_year,
      isDefault: false,
    },
  });

  return res.json({ success: true });
});

// ─── GET /api/payments/methods ────────────────────────────────────────────────
// Returns the user's saved payment methods for display in the profile screen.
router.get("/methods", requireAuth, async (req: AuthRequest, res: Response) => {
  const methods = await prisma.savedPaymentMethod.findMany({
    where: { userId: req.user!.sub },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return res.json(
    methods.map((m) => ({
      id: m.id,
      brand: m.brand,
      last4: m.last4,
      expMonth: m.expMonth,
      expYear: m.expYear,
      isDefault: m.isDefault,
    }))
  );
});

// ─── PATCH /api/payments/methods/:id/default ──────────────────────────────────
router.patch("/methods/:id/default", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id, userId: req.user!.sub },
  });
  if (!method) return res.status(404).json({ error: "Payment method not found" });

  // Clear all defaults then set the new one
  await prisma.$transaction([
    prisma.savedPaymentMethod.updateMany({
      where: { userId: req.user!.sub },
      data: { isDefault: false },
    }),
    prisma.savedPaymentMethod.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  return res.json({ success: true });
});

// ─── DELETE /api/payments/methods/:id ─────────────────────────────────────────
router.delete("/methods/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);

  const method = await prisma.savedPaymentMethod.findFirst({
    where: { id, userId: req.user!.sub },
  });
  if (!method) return res.status(404).json({ error: "Payment method not found" });

  if (!isMockStripe) {
    // Detach from Stripe so the card is no longer chargeable
    await stripe.paymentMethods.detach(method.stripePaymentMethodId);
  }

  await prisma.savedPaymentMethod.delete({ where: { id } });

  // If this was the default, promote the most recent remaining card
  if (method.isDefault) {
    const next = await prisma.savedPaymentMethod.findFirst({
      where: { userId: req.user!.sub },
      orderBy: { createdAt: "asc" },
    });
    if (next) {
      await prisma.savedPaymentMethod.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return res.json({ success: true });
});

// This handler is mounted before express.json() in server.ts. Stripe signature
// verification depends on the exact raw request bytes.
export async function stripeWebhookHandler(req: Request, res: Response) {
  if (!env.stripeWebhookSecret) {
    return res.status(503).json({ error: "Stripe webhook is not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, env.stripeWebhookSecret);
  } catch {
    return res.status(400).json({ error: "Invalid Stripe signature" });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const appointmentId = intent.metadata.appointmentId;

    if (appointmentId) {
      // Idempotent: only the matching active hold can transition to confirmed.
      const result = await prisma.appointment.updateMany({
        where: {
          id: appointmentId,
          status: "draft_hold",
          stripePaymentId: intent.id,
        },
        data: {
          status: "confirmed",
          holdExpiresAt: null,
          depositPaidPence: intent.amount_received,
        },
      });

      if (result.count === 1) {
        await scheduleAppointmentReminderLadder(appointmentId).catch((err) => {
          console.error("[Stripe Webhook] Failed to schedule reminders:", err);
        });
      }

      await createAuditLogWithIntegrity({
        action: "stripe.payment_intent.succeeded",
        actorId: null,
        resourceId: appointmentId,
        sessionId: null,
        ipHash: pseudonymiseIp(req.ip || ""),
        metadata: { eventId: event.id, applied: result.count === 1 },
      });
    } else {
      // Van flow: the intent carries vanServiceRequestId metadata. If an
      // accept/capture raced ahead of this event, sync the captured deposit
      // onto the linked appointment so records stay consistent.
      const vanRequestId = intent.metadata.vanServiceRequestId;
      if (vanRequestId && vanRequestId !== "pending") {
        const vanRequest = await prisma.vanServiceRequest.findUnique({
          where: { id: vanRequestId },
          select: { appointmentId: true, paymentIntentId: true },
        });

        if (vanRequest?.appointmentId && vanRequest.paymentIntentId === intent.id) {
          await prisma.appointment
            .updateMany({
              where: {
                id: vanRequest.appointmentId,
                stripePaymentId: intent.id,
                depositPaidPence: { lt: intent.amount_received },
              },
              data: { depositPaidPence: intent.amount_received },
            })
            .catch((err) =>
              console.error("[Stripe Webhook] Van deposit sync failed:", err)
            );
        }

        await createAuditLogWithIntegrity({
          action: "stripe.payment_intent.succeeded.van",
          actorId: null,
          resourceId: vanRequestId,
          sessionId: null,
          ipHash: pseudonymiseIp(req.ip || ""),
          metadata: {
            eventId: event.id,
            paymentIntentId: intent.id,
            amountReceived: intent.amount_received,
          },
        }).catch(() => {});
      }
    }
  }

  if (event.type === "payment_intent.amount_capturable_updated") {
    // The patient authorised the manual-capture van deposit (PaymentSheet
    // succeeded). Stamp the request so accept-time capture is allowed.
    const intent = event.data.object as Stripe.PaymentIntent;
    const vanRequestId = intent.metadata.vanServiceRequestId;

    if (vanRequestId && vanRequestId !== "pending") {
      // Idempotent: only a pending request transitions, and re-stamping the
      // same timestamp is harmless.
      const result = await prisma.vanServiceRequest.updateMany({
        where: { id: vanRequestId, status: "pending" },
        data: { depositAuthorizedAt: new Date() },
      });

      await createAuditLogWithIntegrity({
        action: "stripe.payment_intent.amount_capturable_updated.van",
        actorId: null,
        resourceId: vanRequestId,
        sessionId: null,
        ipHash: pseudonymiseIp(req.ip || ""),
        metadata: {
          eventId: event.id,
          paymentIntentId: intent.id,
          applied: result.count === 1,
        },
      }).catch(() => {});
    }
  }

  if (event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const vanRequestId = intent.metadata.vanServiceRequestId;

    if (vanRequestId && vanRequestId !== "pending") {
      const vanRequest = await prisma.vanServiceRequest.findUnique({
        where: { id: vanRequestId },
        select: { status: true, patientId: true },
      });

      // Only act if the request is still pending — i.e. the hold was lifted
      // externally (Stripe Dashboard) rather than by our own cancel/decline/
      // expiry paths, which always move the request to a terminal state first.
      if (vanRequest && vanRequest.status === "pending") {
        await prisma.vanServiceRequest.update({
          where: { id: vanRequestId },
          data: { status: "cancelled", phase: "cancelled" },
        });

        await sendPatientNotification(
          vanRequest.patientId,
          "Van Request Cancelled",
          "Your van request's deposit hold was released and the request has been cancelled. You have not been charged.",
          { requestId: vanRequestId, status: "cancelled" }
        ).catch(() => {});
      }

      await createAuditLogWithIntegrity({
        action: "stripe.payment_intent.canceled.van",
        actorId: null,
        resourceId: vanRequestId,
        sessionId: null,
        ipHash: pseudonymiseIp(req.ip || ""),
        metadata: {
          eventId: event.id,
          paymentIntentId: intent.id,
          requestWasPending: vanRequest?.status === "pending",
        },
      }).catch(() => {});
    }
  }

  if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const vanRequestId = intent.metadata.vanServiceRequestId;

    if (vanRequestId && vanRequestId !== "pending") {
      const vanRequest = await prisma.vanServiceRequest.findUnique({
        where: { id: vanRequestId },
        select: { status: true, patientId: true },
      });

      // The request stays pending — the patient can retry authorisation via
      // POST /api/van/requests/:id/payment-retry, which re-presents PaymentSheet.
      if (vanRequest && vanRequest.status === "pending") {
        await sendPatientNotification(
          vanRequest.patientId,
          "Deposit Authorization Failed",
          "We couldn't authorize your van deposit. Open your request to try again — you haven't been charged.",
          { requestId: vanRequestId, status: "payment_failed" }
        ).catch(() => {});
      }

      await createAuditLogWithIntegrity({
        action: "stripe.payment_intent.payment_failed.van",
        actorId: null,
        resourceId: vanRequestId,
        sessionId: null,
        ipHash: pseudonymiseIp(req.ip || ""),
        metadata: {
          eventId: event.id,
          paymentIntentId: intent.id,
          failureMessage: intent.last_payment_error?.message ?? null,
        },
      }).catch(() => {});
    }
  }

  return res.status(200).json({ received: true });
}

export default router;
