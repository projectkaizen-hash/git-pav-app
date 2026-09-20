import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";
import { validateBody, validateQuery } from "../middleware/validate";
import {
  registerPushTokenSchema,
  updateNotificationPreferencesSchema,
  sendNotificationSchema,
  scheduleNotificationSchema,
  notificationHistoryQuerySchema,
  sendReceiptSchema,
} from "../schemas/notifications";
import { communicationService } from "../lib/communication-service";

const router = Router();

// ─── POST /api/notifications/register-token ──────────────────────────────────
router.post("/register-token", requireAuth, validateBody(registerPushTokenSchema), async (req: AuthRequest, res: Response) => {
  const { expoPushToken, platform } = req.body;

  const userId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("register-push-token", { userId, expoPushToken });

  return withIdempotency(idempotencyKey, async () => {
    // Check if token already exists
    const existing = await prisma.pushToken.findFirst({
      where: { token: expoPushToken },
    });

    if (existing) {
      return {
        id: existing.id,
        status: "already_registered",
        platform: existing.platform,
        httpStatus: 200
      };
    }

    // Register new token
    const pushToken = await prisma.pushToken.create({
      data: {
        userId,
        token: expoPushToken,
        platform: platform || "unknown",
        active: true,
      },
    });

    return { id: pushToken.id, status: "registered", platform: pushToken.platform, httpStatus: 201 };
  }).then((result: any) => {
    if (result.error) {
      return res.status(result.httpStatus).json({ error: result.error });
    }
    const { httpStatus, ...responseData } = result;
    return res.status(httpStatus).json(responseData);
  });
});

// ─── GET /api/notifications/preferences ─────────────────────────────────────
router.get("/preferences", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;

  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences) {
    // Return default preferences
    return res.json({
      pushEnabled: true,
      emailEnabled: true,
      smsEnabled: false,
      appointmentReminders: true,
      appointmentConfirmations: true,
      marketingUpdates: false,
      quietHoursStart: "22:00",
      quietHoursEnd: "08:00",
    });
  }

  return res.json(preferences);
});

// ─── PUT /api/notifications/preferences ─────────────────────────────────────
router.put("/preferences", requireAuth, validateBody(updateNotificationPreferencesSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const {
    pushEnabled,
    emailEnabled,
    smsEnabled,
    appointmentReminders,
    appointmentConfirmations,
    marketingUpdates,
    quietHoursStart,
    quietHoursEnd,
  } = req.body;

  const preferences = await prisma.notificationPreference.upsert({
    where: { userId },
    update: {
      pushEnabled,
      emailEnabled,
      smsEnabled,
      appointmentReminders,
      appointmentConfirmations,
      marketingUpdates,
      quietHoursStart,
      quietHoursEnd,
    },
    create: {
      userId,
      pushEnabled: pushEnabled ?? true,
      emailEnabled: emailEnabled ?? true,
      smsEnabled: smsEnabled ?? false,
      appointmentReminders: appointmentReminders ?? true,
      appointmentConfirmations: appointmentConfirmations ?? true,
      marketingUpdates: marketingUpdates ?? false,
      quietHoursStart: quietHoursStart ?? "22:00",
      quietHoursEnd: quietHoursEnd ?? "08:00",
    },
  });

  return res.json(preferences);
});

// ─── POST /api/notifications/send ────────────────────────────────────────────
router.post("/send", requireAuth, validateBody(sendNotificationSchema), async (req: AuthRequest, res: Response) => {
  const { title, body, data, scheduledFor } = req.body;
  const userId = req.user!.sub;

  // Get user's notification preferences
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!preferences || !preferences.pushEnabled) {
    return res.json({ status: "skipped", reason: "Push notifications disabled" });
  }

  // Get user's push tokens
  const tokens = await prisma.pushToken.findMany({
    where: { userId, active: true },
  });

  if (tokens.length === 0) {
    return res.json({ status: "skipped", reason: "No active push tokens" });
  }

  // Check quiet hours
  if (preferences?.quietHoursStart && preferences?.quietHoursEnd) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = preferences.quietHoursStart.split(":").map(Number);
    const [endHour, endMin] = preferences.quietHoursEnd.split(":").map(Number);

    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;

    if (currentTime >= startTime || currentTime <= endTime) {
      return res.json({ status: "skipped", reason: "Quiet hours" });
    }
  }

  // Push notification payload via Expo Push API
  const messages = tokens.map((token) => ({
    to: token.token,
    sound: "default" as const,
    title: title || "Pav Dental Notification",
    body: body || "You have an update regarding your dental appointment.",
    data: (data as Record<string, unknown>) || {},
  }));

  const pushResult = await communicationService.sendExpoPushNotifications(messages);

  await prisma.notificationHistory.create({
    data: {
      userId,
      type: "push",
      title: title || "Pav Dental Notification",
      body: body || "You have an update regarding your dental appointment.",
      data: (data as any) || {},
      sentAt: new Date(),
      status: pushResult.sentCount > 0 ? "delivered" : "failed",
    },
  });

  return res.json({
    status: pushResult.sentCount > 0 ? "delivered" : "failed",
    recipientsCount: tokens.length,
    sentCount: pushResult.sentCount,
    failedCount: pushResult.failedCount,
    messages,
    sentAt: new Date().toISOString(),
  });
});

// ─── POST /api/notifications/schedule ────────────────────────────────────────
router.post("/schedule", requireAuth, validateBody(scheduleNotificationSchema), async (req: AuthRequest, res: Response) => {
  const { title, body, data, scheduledFor } = req.body;
  const userId = req.user!.sub;

  const scheduledDate = new Date(scheduledFor);
  if (scheduledDate <= new Date()) {
    return res.status(400).json({ error: "scheduledFor must be in the future" });
  }

  // Store scheduled notification
  const scheduled = await prisma.scheduledNotification.create({
    data: {
      userId,
      title,
      body,
      data: data || {},
      scheduledFor: scheduledDate,
      status: "pending",
    },
  });

  return res.status(201).json(scheduled);
});

// ─── GET /api/notifications/history ────────────────────────────────────────
router.get("/history", requireAuth, validateQuery(notificationHistoryQuerySchema), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };

  const notifications = await prisma.notificationHistory.findMany({
    where: { userId },
    orderBy: { sentAt: "desc" },
    take: limit,
    skip: offset,
  });

  return res.json(notifications);
});

// ─── POST /api/notifications/send-receipt ────────────────────────────────────
router.post("/send-receipt", requireAuth, validateBody(sendReceiptSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId, amountPence, paymentMethod } = req.body;
  const userId = req.user!.sub;

  // Get user preferences for receipt delivery
  const preferences = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  const receiptData = {
    appointmentId,
    amountPence,
    paymentMethod,
    sentAt: new Date().toISOString(),
  };

  // Send push notification if enabled
  if (preferences?.pushEnabled) {
    const tokens = await prisma.pushToken.findMany({
      where: { userId, active: true },
    });

    if (tokens.length > 0) {
      await communicationService.sendExpoPushNotifications(
        tokens.map((t) => ({
          to: t.token,
          sound: "default",
          title: "Payment Receipt",
          body: `Payment of £${(amountPence / 100).toFixed(2)} received`,
          data: receiptData,
        }))
      );

      // Queue push notification
      await prisma.notificationHistory.create({
        data: {
          userId,
          type: "receipt",
          title: "Payment Receipt",
          body: `Payment of £${(amountPence / 100).toFixed(2)} received`,
          data: receiptData,
          sentAt: new Date(),
          status: "sent",
        },
      });
    }
  }

  // Send email if enabled
  if (preferences?.emailEnabled) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (user?.email) {
      await communicationService.sendEmail({
        to: user.email,
        subject: "Pav Dental Payment Receipt",
        html: `<h2>Pav Dental Receipt</h2><p>Payment of <strong>£${(amountPence / 100).toFixed(2)}</strong> received via ${paymentMethod} for appointment ${appointmentId}.</p>`,
        text: `Pav Dental Receipt: Payment of £${(amountPence / 100).toFixed(2)} received via ${paymentMethod} for appointment ${appointmentId}.`,
      });
    }

    await prisma.notificationHistory.create({
      data: {
        userId,
        type: "receipt_email",
        title: "Payment Receipt",
        body: `Payment receipt for £${(amountPence / 100).toFixed(2)}`,
        data: receiptData,
        sentAt: new Date(),
        status: "sent",
      },
    });
  }

  return res.json({
    status: "receipt_sent",
    deliveryMethods: {
      push: preferences?.pushEnabled,
      email: preferences?.emailEnabled,
    },
  });
});

export default router;

