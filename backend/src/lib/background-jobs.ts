import { prisma } from "./prisma";
import { communicationService } from "./communication-service";
import { pseudonymiseIp } from "./audit-security";

// Interval settings
const SLOT_EXPIRY_INTERVAL_MS = 60 * 1000; // 1 minute
const NOTIFICATION_DISPATCH_INTERVAL_MS = 60 * 1000; // 1 minute
const VAN_REQUEST_EXPIRY_INTERVAL_MS = 30 * 1000; // 30 seconds

let slotExpiryTimer: NodeJS.Timeout | null = null;
let notificationDispatchTimer: NodeJS.Timeout | null = null;
let vanRequestExpiryTimer: NodeJS.Timeout | null = null;

/**
 * Sweeps expired draft_hold appointments and transitions them to cancelled.
 */
export async function processExpiredSlotHolds(): Promise<{ expiredCount: number }> {
  const now = new Date();

  try {
    // Find expired draft_hold appointments
    const expiredHolds = await prisma.appointment.findMany({
      where: {
        status: "draft_hold",
        holdExpiresAt: { lte: now },
      },
      select: {
        id: true,
        patientId: true,
      },
      take: 100, // Batch limit per cycle
    });

    if (expiredHolds.length === 0) {
      return { expiredCount: 0 };
    }

    const expiredIds = expiredHolds.map((a) => a.id);

    // Cancel expired draft holds
    const result = await prisma.appointment.updateMany({
      where: {
        id: { in: expiredIds },
        status: "draft_hold", // Ensure atomic update
      },
      data: {
        status: "cancelled",
      },
    });

    // Audit log each cancellation
    for (const appt of expiredHolds) {
      await prisma.auditLog.create({
        data: {
          action: "appointment.hold_expired",
          resourceId: appt.id,
          ipHash: pseudonymiseIp("127.0.0.1"),
          metadata: { reason: "10-minute hold window elapsed without payment" },
        },
      }).catch(() => {});
    }

    console.log(`[BACKGROUND JOBS] Expired ${result.count} draft holds`);
    return { expiredCount: result.count };
  } catch (error) {
    console.error("[BACKGROUND JOBS] Error processing expired slot holds:", error);
    return { expiredCount: 0 };
  }
}

/**
 * Dispatches due scheduled notifications via push (and records delivery history).
 */
export async function processDueScheduledNotifications(): Promise<{ dispatchedCount: number }> {
  const now = new Date();

  try {
    const dueNotifications = await prisma.scheduledNotification.findMany({
      where: {
        status: "pending",
        scheduledFor: { lte: now },
      },
      include: {
        user: {
          include: {
            pushTokens: { where: { active: true } },
            notificationPreferences: true,
          },
        },
      },
      take: 50, // Batch size
    });

    if (dueNotifications.length === 0) {
      return { dispatchedCount: 0 };
    }

    let dispatchedCount = 0;

    for (const notification of dueNotifications) {
      const { user } = notification;

      // Check user preferences
      const preferences = user.notificationPreferences;
      if (preferences && !preferences.pushEnabled) {
        await prisma.scheduledNotification.update({
          where: { id: notification.id },
          data: { status: "cancelled", sentAt: now },
        });
        continue;
      }

      const pushTokens = user.pushTokens.map((t) => t.token);

      if (pushTokens.length > 0) {
        const messages = pushTokens.map((token) => ({
          to: token,
          sound: "default" as const,
          title: notification.title,
          body: notification.body,
          data: (notification.data as Record<string, unknown>) || {},
        }));

        await communicationService.sendExpoPushNotifications(messages);
      }

      // Record in notification history
      await prisma.notificationHistory.create({
        data: {
          userId: user.id,
          type: "reminder",
          title: notification.title,
          body: notification.body,
          data: (notification.data as any) || {},
          sentAt: now,
          status: pushTokens.length > 0 ? "delivered" : "sent",
        },
      }).catch(() => {});

      // Mark scheduled notification as sent
      await prisma.scheduledNotification.update({
        where: { id: notification.id },
        data: { status: "sent", sentAt: now },
      });

      dispatchedCount++;
    }

    if (dispatchedCount > 0) {
      console.log(`[BACKGROUND JOBS] Dispatched ${dispatchedCount} scheduled notifications`);
    }

    return { dispatchedCount };
  } catch (error) {
    console.error("[BACKGROUND JOBS] Error processing scheduled notifications:", error);
    return { dispatchedCount: 0 };
  }
}

/**
 * Schedules the 48h / 24h / 2h reminder notification ladder for a confirmed appointment.
 */
export async function scheduleAppointmentReminderLadder(appointmentId: string): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: { select: { userId: true, firstName: true } },
        service: { select: { name: true } },
        clinic: { select: { name: true, address: true } },
        clinician: { select: { fullName: true } },
      },
    });

    if (!appointment || !appointment.patient?.userId) return;

    const userId = appointment.patient.userId;
    const startTime = new Date(appointment.startTimeUtc);
    const serviceName = appointment.service?.name || "Dental Appointment";
    const clinicName = appointment.clinic?.name || "Pav Dental";
    const timeFormatted = startTime.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    const dateFormatted = startTime.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

    const ladder = [
      {
        hoursBefore: 48,
        title: "Appointment in 48 Hours - Pav Dental",
        body: `Reminder: Your ${serviceName} is scheduled for ${dateFormatted} at ${timeFormatted}. Free cancellations available up to 48 hours prior.`,
      },
      {
        hoursBefore: 24,
        title: "Appointment Tomorrow - Pav Dental",
        body: `Your visit is tomorrow at ${timeFormatted} with ${appointment.clinician?.fullName || clinicName}. Please remember to arrive 10 minutes early.`,
      },
      {
        hoursBefore: 2,
        title: "Appointment in 2 Hours - Pav Dental",
        body: `See you soon! Your ${serviceName} is at ${timeFormatted} at ${clinicName}. Tap for directions and check-in info.`,
      },
    ];

    const now = Date.now();

    for (const step of ladder) {
      const scheduledFor = new Date(startTime.getTime() - step.hoursBefore * 60 * 60 * 1000);

      // Only schedule if the reminder time is in the future
      if (scheduledFor.getTime() > now) {
        await prisma.scheduledNotification.create({
          data: {
            userId,
            title: step.title,
            body: step.body,
            data: {
              appointmentId: appointment.id,
              type: "appointment_reminder",
              hoursBefore: step.hoursBefore,
              startTimeUtc: appointment.startTimeUtc.toISOString(),
            },
            scheduledFor,
            status: "pending",
          },
        });
      }
    }

    console.log(`[BACKGROUND JOBS] Scheduled reminder ladder for appointment ${appointmentId}`);
  } catch (error) {
    console.error(`[BACKGROUND JOBS] Failed to schedule reminder ladder for ${appointmentId}:`, error);
  }
}

/**
 * Sweeps pending van service requests that have passed their expiresAt TTL and sets them to expired.
 */
export async function processExpiredVanRequests(): Promise<{ expiredCount: number }> {
  const now = new Date();
  try {
    const result = await prisma.vanServiceRequest.updateMany({
      where: {
        status: "pending",
        expiresAt: { lte: now },
      },
      data: { status: "expired" },
    });
    return { expiredCount: result.count };
  } catch (error) {
    console.error("[BACKGROUND JOBS] Error expiring van requests:", error);
    return { expiredCount: 0 };
  }
}

/**
 * Starts all background job workers.
 */
export function startBackgroundJobs(): void {
  console.log("[BACKGROUND JOBS] Starting background workers (slot expiry, notification dispatcher & van request expiry)");

  // Run immediately on boot
  processExpiredSlotHolds().catch(() => {});
  processDueScheduledNotifications().catch(() => {});
  processExpiredVanRequests().catch(() => {});

  // Recurring timers
  slotExpiryTimer = setInterval(() => {
    processExpiredSlotHolds().catch(() => {});
  }, SLOT_EXPIRY_INTERVAL_MS);

  notificationDispatchTimer = setInterval(() => {
    processDueScheduledNotifications().catch(() => {});
  }, NOTIFICATION_DISPATCH_INTERVAL_MS);

  vanRequestExpiryTimer = setInterval(() => {
    processExpiredVanRequests().catch(() => {});
  }, VAN_REQUEST_EXPIRY_INTERVAL_MS);
}

/**
 * Stops all background job workers (for graceful shutdown and tests).
 */
export function stopBackgroundJobs(): void {
  if (slotExpiryTimer) {
    clearInterval(slotExpiryTimer);
    slotExpiryTimer = null;
  }
  if (notificationDispatchTimer) {
    clearInterval(notificationDispatchTimer);
    notificationDispatchTimer = null;
  }
  if (vanRequestExpiryTimer) {
    clearInterval(vanRequestExpiryTimer);
    vanRequestExpiryTimer = null;
  }
  console.log("[BACKGROUND JOBS] Stopped background workers");
}

