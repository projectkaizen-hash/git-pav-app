// backend/src/lib/patient-push.ts
// Shared push-notification helper for van dispatch events.
//
// Extracted from routes/van.ts so background jobs (the van-request expiry
// sweeper) can send the same patient notifications without importing route
// modules. Respects the patient's push preferences and records delivery in
// NotificationHistory. Never throws — notification failure must not break
// dispatch flow.

import { prisma } from "./prisma";
import { communicationService } from "./communication-service";

export async function sendPatientNotification(
  patientId: string,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  try {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      include: { user: { select: { id: true } } },
    });

    if (!patient) return;

    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: patient.userId },
    });

    // PP-1: Missing preferences row defaults to pushEnabled: true
    const pushEnabled = preferences ? preferences.pushEnabled : true;
    if (!pushEnabled) return;

    const tokens = await prisma.pushToken.findMany({
      where: { userId: patient.userId, active: true },
    });

    if (tokens.length === 0) return;

    const messages = tokens.map((token) => ({
      to: token.token,
      sound: "default" as const,
      title,
      body,
      data,
    }));

    await communicationService.sendExpoPushNotifications(messages);

    await prisma.notificationHistory.create({
      data: {
        userId: patient.userId,
        type: "push",
        title,
        body,
        data: data as any,
        sentAt: new Date(),
        status: "sent",
      },
    });
  } catch (error) {
    console.error("Failed to send patient notification:", error);
  }
}
