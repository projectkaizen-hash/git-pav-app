import { Router, Response } from "express";
import type { Prisma } from "@prisma/client";
import { patientsInClinicianCare } from "../middleware/patient-access";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../middleware/validate";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { encryptField, decryptString } from "../lib/encryption";
import { communicationService } from "../lib/communication-service";
import { env } from "../config/env";
import { safeError } from "../lib/log-safety";

const router = Router();

export const DRAFT_EMERGENCY_NOTICE =
  "If you are experiencing a dental or medical emergency (such as severe facial swelling, trauma, difficulty breathing, or uncontrollable bleeding), call 999 or attend A&E immediately. For urgent out-of-hours advice, call NHS 111. Messages are monitored during clinic hours (Mon–Fri 09:00–17:30, Sat 09:00–13:00) with response typically within 1 business day.";

export const CLINIC_MESSAGING_SLA = {
  operatingHours: "Mon–Fri 09:00–17:30, Sat 09:00–13:00",
  typicalResponseTime: "1 business day",
  emergencyAdvice: DRAFT_EMERGENCY_NOTICE,
};

// Returns user display name and title based on role
async function getSenderDisplayName(userId: string, role: string): Promise<string> {
  if (role === "clinician") {
    const clinician = await prisma.clinicianProfile.findUnique({
      where: { userId },
      select: { fullName: true, roleTitle: true },
    });
    if (clinician?.fullName) {
      return clinician.fullName.startsWith("Dr.") ? clinician.fullName : `Dr. ${clinician.fullName}`;
    }
  }
  if (role === "admin") {
    return "Pav Dental Practice Team";
  }
  const profile = await prisma.patientProfile.findUnique({
    where: { userId },
    select: { firstName: true, lastName: true },
  });
  if (profile) {
    const name = `${profile.firstName} ${profile.lastName}`.trim();
    if (name) return name;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return user?.email ? user.email.split("@")[0] : "Patient";
}

// Patients see their own threads. Admins (the practice team) see all. A
// clinician sees threads for patients in their care in the last 12 months,
// OR threads explicitly assigned/routed to them (decisions log #10, CS-08, MS-3).
async function visibleThreadsWhere(req: AuthRequest): Promise<Prisma.MessageThreadWhereInput> {
  const { sub, role } = req.user!;
  if (role === "admin") return {};
  if (role === "clinician") {
    const clinician = await prisma.clinicianProfile.findUnique({ where: { userId: sub }, select: { id: true } });
    if (!clinician) return { id: { in: [] } };
    const patientIds = await patientsInClinicianCare(clinician.id);
    const patients = await prisma.patientProfile.findMany({ where: { id: { in: patientIds } }, select: { userId: true } });
    return {
      OR: [
        { patientUserId: { in: patients.map((p) => p.userId) } },
        { assignedClinicianId: clinician.id },
      ],
    };
  }
  return { patientUserId: sub };
}

const threadIdParamsSchema = z.object({ id: z.string().uuid() }).strict();
// Newest threads first, a page at a time (CS-09).
const listThreadsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
}).strict();

const createThreadSchema = z
  .object({
    subject: z.string().trim().min(1).max(255),
    body: z.string().trim().min(1).max(4000),
    recipientType: z.enum(["practice", "care_team", "clinician"]).optional(),
    recipientClinicianId: z.string().uuid().optional(),
    recipientName: z.string().trim().min(1).max(150).optional(),
  })
  .strict();

const replyMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(4000),
  })
  .strict();

// ─── GET /api/messages/meta ───────────────────────────────────────────────────
// SLA and clinical emergency guidance banner info
router.get("/meta", requireAuth, (_req: AuthRequest, res: Response) => {
  return res.json(CLINIC_MESSAGING_SLA);
});

// ─── GET /api/messages ────────────────────────────────────────────────────────
// Returns persistent message threads for the authenticated user.
router.get("/", requireAuth, validateQuery(listThreadsQuerySchema), async (req: AuthRequest, res: Response) => {
  const isStaff = req.user!.role === "clinician" || req.user!.role === "admin";
  const { limit, offset } = req.query as unknown as { limit: number; offset: number };
  const threads = await prisma.messageThread.findMany({
    where: await visibleThreadsWhere(req),
    include: {
      patientUser: {
        include: {
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
    // id breaks ties so a page boundary never repeats or skips a thread.
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: limit,
    skip: offset,
  });

  return res.json(
    await Promise.all(
      threads.map(async (t) => {
        const profile = t.patientUser?.patientProfile;
        const patientName = profile
          ? `${profile.firstName} ${profile.lastName}`.trim()
          : (t.patientUser?.email ? t.patientUser.email.split("@")[0] : "Patient");
        // Staff seeing their inbox see the patient as 'from'; patients see the clinician or practice team name
        const displayFrom = isStaff ? (patientName || "Patient") : t.senderName;
        const decryptedSubject = await decryptString(t.subject);
        const lastMsg = t.messages[t.messages.length - 1];
        const lastBody = lastMsg ? await decryptString(lastMsg.body) : "";
        const preview = lastBody ? `${lastMsg.senderName || displayFrom}: ${lastBody.slice(0, 160)}` : "[Secure message]";

        return {
          id: t.id,
          from: displayFrom,
          subject: decryptedSubject,
          preview,
          sentAtIso: t.updatedAt.toISOString(),
          isRead: t.isRead,
          hasAttachment: t.hasAttachment,
          recipientType: t.recipientType,
          assignedClinicianId: t.assignedClinicianId,
          patientName,
          patientUserId: t.patientUserId,
          messages: await Promise.all(
            t.messages.map(async (m) => ({
              id: m.id,
              senderRole: m.senderRole,
              senderName: m.senderName,
              body: await decryptString(m.body),
              sentAtIso: m.sentAt.toISOString(),
            }))
          ),
        };
      })
    )
  );
});

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ─── POST /api/messages ───────────────────────────────────────────────────────
router.post("/", requireAuth, validateBody(createThreadSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const userRole = req.user!.role;
  const { subject, body, recipientType, recipientClinicianId, recipientName } = req.body;

  // Resolve routing
  let resolvedAssignedClinicianId: string | null = null;
  let resolvedRecipientType = recipientType || "practice";
  let resolvedRecipientName = recipientName || "Pav Dental Clinical Team";
  let clinicianUserEmail: string | null = null;

  if (recipientClinicianId) {
    const clinician = await prisma.clinicianProfile.findUnique({
      where: { id: recipientClinicianId },
      include: { user: true },
    });
    if (clinician) {
      resolvedAssignedClinicianId = clinician.id;
      resolvedRecipientType = "clinician";
      resolvedRecipientName = clinician.fullName.startsWith("Dr.") ? clinician.fullName : `Dr. ${clinician.fullName}`;
      clinicianUserEmail = clinician.user?.email || null;
    }
  } else if (resolvedRecipientType === "care_team") {
    // Try to find patient's most recent clinician
    const patientProfile = await prisma.patientProfile.findUnique({ where: { userId } });
    if (patientProfile) {
      const recentAppt = await prisma.appointment.findFirst({
        where: { patientId: patientProfile.id },
        orderBy: { startTimeUtc: "desc" },
        include: { clinician: { include: { user: true } } },
      });
      if (recentAppt?.clinician) {
        resolvedAssignedClinicianId = recentAppt.clinician.id;
        resolvedRecipientType = "care_team";
        resolvedRecipientName = recentAppt.clinician.fullName.startsWith("Dr.")
          ? recentAppt.clinician.fullName
          : `Dr. ${recentAppt.clinician.fullName}`;
        clinicianUserEmail = recentAppt.clinician.user?.email || null;
      }
    }
  }

  // Get sender's real display name
  const senderDisplayName = await getSenderDisplayName(userId, userRole);

  // DB-3: Encrypt message body and subject at rest
  const encrypted = await encryptField(body);
  const storedBody = JSON.stringify(encrypted);
  const encryptedSubject = JSON.stringify(await encryptField(subject));

  const thread = await prisma.messageThread.create({
    data: {
      patientUserId: userId,
      senderName: resolvedRecipientName,
      subject: encryptedSubject,
      preview: "[Secure message]",
      isRead: false, // Unread for the receiving staff / recipient
      hasAttachment: false,
      recipientType: resolvedRecipientType,
      assignedClinicianId: resolvedAssignedClinicianId,
      messages: {
        create: [
          {
            senderRole: userRole,
            senderName: senderDisplayName,
            body: storedBody,
          },
        ],
      },
    },
    include: { messages: true },
  });

  const safeSender = escapeHtml(senderDisplayName);
  const safeSubject = escapeHtml(subject);

  // MS-3: Notify recipient staff (care team clinician or practice inbox)
  if (resolvedAssignedClinicianId && clinicianUserEmail) {
    communicationService
      .sendEmail({
        to: clinicianUserEmail,
        subject: `[Pav Dental] New message from ${safeSender}: ${safeSubject}`,
        text: `You have received a new patient message from ${senderDisplayName} regarding: "${subject}".\n\nPlease log into the Clinician Portal to review and reply.`,
        html: `<p>You have received a new patient message from <strong>${safeSender}</strong> regarding: <em>${safeSubject}</em>.</p><p>Please log into the Clinician Portal to review and reply.</p>`,
      })
      .catch((err) => console.error("[Messages] Failed to dispatch clinician notification:", safeError(err)));
  } else {
    // Notify practice inbox
    const practiceEmail = env.opsAlertEmail || "practice@pavdental.com";
    communicationService
      .sendEmail({
        to: practiceEmail,
        subject: `[Practice Inbox] New message from ${safeSender}: ${safeSubject}`,
        text: `A new patient message was submitted to the practice inbox by ${senderDisplayName} regarding: "${subject}".\n\nPlease review in the Admin Dashboard.`,
        html: `<p>A new patient message was submitted to the practice inbox by <strong>${safeSender}</strong> regarding: <em>${safeSubject}</em>.</p>`,
      })
      .catch((err) => console.error("[Messages] Failed to dispatch practice notification:", safeError(err)));
  }

  await createAuditLogWithIntegrity({
    action: "message.thread_created",
    actorId: userId,
    resourceId: thread.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: {
      recipientType: resolvedRecipientType,
      assignedClinicianId: resolvedAssignedClinicianId,
    },
  });

  return res.status(201).json({
    id: thread.id,
    from: thread.senderName,
    subject: thread.subject,
    preview: thread.preview,
    sentAtIso: thread.updatedAt.toISOString(),
    isRead: thread.isRead,
    hasAttachment: thread.hasAttachment,
    recipientType: thread.recipientType,
    assignedClinicianId: thread.assignedClinicianId,
    messages: thread.messages.map((m) => ({
      id: m.id,
      senderRole: m.senderRole,
      senderName: m.senderName,
      body,
      sentAtIso: m.sentAt.toISOString(),
    })),
  });
});

// ─── POST /api/messages/:id/reply ─────────────────────────────────────────────
router.post(
  "/:id/reply",
  requireAuth,
  validateParams(threadIdParamsSchema),
  validateBody(replyMessageSchema),
  async (req: AuthRequest, res: Response) => {
    const threadId = String(req.params.id);
    const userId = req.user!.sub;
    const userRole = req.user!.role;
    const { body } = req.body;

    const thread = await prisma.messageThread.findFirst({
      where: { AND: [{ id: threadId }, await visibleThreadsWhere(req)] },
      include: {
        patientUser: true,
      },
    });

    if (!thread) {
      return res.status(404).json({ error: "Message thread not found" });
    }

    // Determine sender display name (real staff name or patient name, MS-3)
    const senderDisplayName = await getSenderDisplayName(userId, userRole);

    // DB-3: Encrypt reply message body at rest
    const encrypted = await encryptField(body);
    const storedBody = JSON.stringify(encrypted);

    const isStaff = userRole === "clinician" || userRole === "admin";

    const [message, updatedThread] = await prisma.$transaction([
      prisma.message.create({
        data: {
          threadId: thread.id,
          senderRole: userRole,
          senderName: senderDisplayName, // MS-3: real clinician/staff name, never hardcoded "You"
          body: storedBody,
        },
      }),
      prisma.messageThread.update({
        where: { id: thread.id },
        data: {
          preview: "[Secure message]",
          isRead: isStaff ? true : false,
        },
        include: {
          messages: { orderBy: { sentAt: "asc" } },
        },
      }),
    ]);

    const decryptedSubject = await decryptString(thread.subject);
    const safeSender = escapeHtml(senderDisplayName);
    const safeSubject = escapeHtml(decryptedSubject);

    // MS-3: Notifications on reply
    if (isStaff) {
      // Staff replied -> notify patient
      const patientEmail = thread.patientUser?.email;
      if (patientEmail) {
        communicationService
          .sendEmail({
            to: patientEmail,
            subject: `[Pav Dental] Reply from ${safeSender}: ${safeSubject}`,
            text: `${senderDisplayName} has replied to your message thread: "${decryptedSubject}".\n\nPlease open the Pav Dental app to view.`,
            html: `<p><strong>${safeSender}</strong> has replied to your message thread: <em>${safeSubject}</em>.</p><p>Please open the Pav Dental app to read and reply.</p>`,
          })
          .catch((err) => console.error("[Messages] Failed to notify patient of staff reply:", safeError(err)));
      }
    } else {
      // Patient replied -> notify care team / clinician or practice inbox
      if (thread.assignedClinicianId) {
        const clinician = await prisma.clinicianProfile.findUnique({
          where: { id: thread.assignedClinicianId },
          include: { user: true },
        });
        if (clinician?.user?.email) {
          communicationService
            .sendEmail({
              to: clinician.user.email,
              subject: `[Pav Dental] Patient reply from ${safeSender}: ${safeSubject}`,
              text: `${senderDisplayName} has replied to thread: "${decryptedSubject}".\n\nPlease log into the Clinician Portal to review.`,
              html: `<p><strong>${safeSender}</strong> has replied to: <em>${safeSubject}</em>.</p><p>Please log into the Clinician Portal to review.</p>`,
            })
            .catch(() => {});
        }
      } else {
        const practiceEmail = env.opsAlertEmail || "practice@pavdental.com";
        communicationService
          .sendEmail({
            to: practiceEmail,
            subject: `[Practice Inbox] Patient reply from ${safeSender}: ${safeSubject}`,
            text: `${senderDisplayName} replied to "${decryptedSubject}".\n\nPlease review in the Admin Dashboard.`,
            html: `<p><strong>${safeSender}</strong> replied to <em>${safeSubject}</em>.</p><p>Please review in the Admin Dashboard.</p>`,
          })
          .catch(() => {});
      }
    }

    await createAuditLogWithIntegrity({
      action: "message.reply_sent",
      actorId: userId,
      resourceId: thread.id,
      sessionId: req.user!.sessionId,
      ipHash: pseudonymiseIp(req.ip || ""),
      metadata: {
        senderRole: userRole,
        senderName: senderDisplayName,
      },
    });

    return res.status(201).json({
      message: {
        id: message.id,
        senderRole: message.senderRole,
        senderName: message.senderName,
        body,
        sentAtIso: message.sentAt.toISOString(),
      },
      thread: {
        id: updatedThread.id,
        from: updatedThread.senderName,
        subject: decryptedSubject,
        preview: `${senderDisplayName}: ${body.slice(0, 160)}`,
        sentAtIso: updatedThread.updatedAt.toISOString(),
        isRead: updatedThread.isRead,
        hasAttachment: updatedThread.hasAttachment,
      },
    });
  }
);

// ─── PATCH /api/messages/:id/read ─────────────────────────────────────────────
router.patch("/:id/read", requireAuth, validateParams(threadIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const threadId = String(req.params.id);
  const existing = await prisma.messageThread.findFirst({
    where: { AND: [{ id: threadId }, await visibleThreadsWhere(req)] },
  });

  if (!existing) {
    return res.status(404).json({ error: "Message thread not found" });
  }

  const updated = await prisma.messageThread.update({
    where: { id: threadId },
    data: { isRead: true },
  });

  return res.json({ id: updated.id, isRead: updated.isRead });
});

// ─── DELETE /api/messages/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuth, validateParams(threadIdParamsSchema), async (req: AuthRequest, res: Response) => {
  const threadId = String(req.params.id);
  const userId = req.user!.sub;

  const existing = await prisma.messageThread.findFirst({
    where: { id: threadId, patientUserId: userId },
  });

  if (!existing) {
    return res.status(404).json({ error: "Message thread not found" });
  }

  const messageCount = await prisma.message.count({ where: { threadId } });

  await prisma.messageThread.delete({
    where: { id: threadId },
  });

  // CS-29: the thread is gone for good, so record who removed it and its shape.
  await createAuditLogWithIntegrity({
    action: "message.thread_deleted",
    actorId: userId,
    resourceId: threadId,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: {
      recipientType: existing.recipientType,
      assignedClinicianId: existing.assignedClinicianId,
      messageCount,
    },
  });

  return res.json({ success: true, id: threadId });
});

export default router;
