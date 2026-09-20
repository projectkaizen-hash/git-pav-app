import { prisma } from "../lib/prisma";
import {
  processExpiredSlotHolds,
  processDueScheduledNotifications,
  scheduleAppointmentReminderLadder,
} from "../lib/background-jobs";

describe("Background Jobs Integration Tests", () => {
  let testUserId: string;
  let patientProfileId: string;
  let testServiceId: string;
  let testAppointmentId: string;

  beforeAll(async () => {
    // 1. Setup test user & patient profile
    const timestamp = Date.now();
    const user = await prisma.user.create({
      data: {
        email: `bg_test_${timestamp}@pavdental.co.uk`,
        passwordHash: "argon2id_mock_hash",
        role: "patient",
        patientProfile: {
          create: {
            firstName: "Background",
            lastName: "Tester",
          },
        },
      },
      include: { patientProfile: true },
    });

    testUserId = user.id;
    patientProfileId = user.patientProfile!.id;

    // Get an existing service or create one
    let service = await prisma.service.findFirst();
    if (!service) {
      service = await prisma.service.create({
        data: {
          id: "srv_test_bg",
          name: "Test BG Service",
          category: "checkup",
          description: "Testing",
          durationMinutes: 30,
          pricePence: 5000,
          depositPence: 1500,
          supportedChannels: ["clinic"],
        },
      });
    }
    testServiceId = service.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await prisma.scheduledNotification.deleteMany({ where: { userId: testUserId } });
    await prisma.notificationHistory.deleteMany({ where: { userId: testUserId } });
    await prisma.appointment.deleteMany({ where: { patientId: patientProfileId } });
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });

  describe("processExpiredSlotHolds", () => {
    it("should cancel expired draft holds and leave active ones alone", async () => {
      // Create an expired draft hold (expired 5 minutes ago)
      const expiredAppt = await prisma.appointment.create({
        data: {
          patientId: patientProfileId,
          serviceId: testServiceId,
          channel: "clinic",
          startTimeUtc: new Date(Date.now() + 86400000),
          endTimeUtc: new Date(Date.now() + 86400000 + 1800000),
          status: "draft_hold",
          holdExpiresAt: new Date(Date.now() - 5 * 60 * 1000),
          totalPricePence: 5000,
          depositPaidPence: 0,
        },
      });

      // Create an active draft hold (expires in 10 minutes)
      const activeAppt = await prisma.appointment.create({
        data: {
          patientId: patientProfileId,
          serviceId: testServiceId,
          channel: "clinic",
          startTimeUtc: new Date(Date.now() + 172800000),
          endTimeUtc: new Date(Date.now() + 172800000 + 1800000),
          status: "draft_hold",
          holdExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
          totalPricePence: 5000,
          depositPaidPence: 0,
        },
      });

      // Run sweeper
      const result = await processExpiredSlotHolds();
      expect(result.expiredCount).toBeGreaterThanOrEqual(1);

      // Verify expired appointment is now cancelled
      const checkedExpired = await prisma.appointment.findUnique({
        where: { id: expiredAppt.id },
      });
      expect(checkedExpired?.status).toBe("cancelled");

      // Verify active appointment is still draft_hold
      const checkedActive = await prisma.appointment.findUnique({
        where: { id: activeAppt.id },
      });
      expect(checkedActive?.status).toBe("draft_hold");

      // Verify audit log entry
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          resourceId: expiredAppt.id,
          action: "appointment.hold_expired",
        },
      });
      expect(auditLog).not.toBeNull();
    });
  });

  describe("scheduleAppointmentReminderLadder", () => {
    it("should schedule 48h, 24h, and 2h reminder notifications for future appointments", async () => {
      // Create confirmed appointment 3 days in the future (72 hours)
      const futureAppt = await prisma.appointment.create({
        data: {
          patientId: patientProfileId,
          serviceId: testServiceId,
          channel: "clinic",
          startTimeUtc: new Date(Date.now() + 72 * 60 * 60 * 1000),
          endTimeUtc: new Date(Date.now() + 72 * 60 * 60 * 1000 + 1800000),
          status: "confirmed",
          totalPricePence: 5000,
          depositPaidPence: 1500,
        },
      });
      testAppointmentId = futureAppt.id;

      await scheduleAppointmentReminderLadder(futureAppt.id);

      // Verify scheduled notifications created
      const scheduled = await prisma.scheduledNotification.findMany({
        where: {
          userId: testUserId,
          status: "pending",
        },
      });

      // Since appointment is 72h away, all 3 reminders (48h, 24h, 2h before) are in the future
      expect(scheduled.length).toBe(3);

      const hoursBeforeList = scheduled.map((s) => (s.data as any)?.hoursBefore).sort((a, b) => b - a);
      expect(hoursBeforeList).toEqual([48, 24, 2]);
    });
  });

  describe("processDueScheduledNotifications", () => {
    it("should process due pending notifications and mark them as sent", async () => {
      // Insert a notification scheduled in the past (due now)
      const dueNotif = await prisma.scheduledNotification.create({
        data: {
          userId: testUserId,
          title: "Due Reminder",
          body: "Your appointment is right now!",
          scheduledFor: new Date(Date.now() - 1000),
          status: "pending",
        },
      });

      const { dispatchedCount } = await processDueScheduledNotifications();
      expect(dispatchedCount).toBeGreaterThanOrEqual(1);

      // Verify updated status
      const updated = await prisma.scheduledNotification.findUnique({
        where: { id: dueNotif.id },
      });
      expect(updated?.status).toBe("sent");
      expect(updated?.sentAt).not.toBeNull();
    });
  });
});

