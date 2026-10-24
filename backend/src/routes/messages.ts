import { Router, Response } from "express";
import type { Prisma } from "@prisma/client";
import { patientsInClinicianCare } from "../middleware/patient-access";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody, validateParams } from "../middleware/validate";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { encryptField, decryptString } from "../lib/encryption";

const router = Router();

// Patients see their own threads. Admins (the practice team) see all. A
// clinician sees threads only for patients in their care in the last 12
// months (decisions log #10, CS-08).
async function visibleThreadsWhere(req: AuthRequest): Promise<Prisma.MessageThreadWhereInput> {
  const { sub, role } = req.user!;
  if (role === "admin") return {};
  if (role === "clinician") {
    const clinician = await prisma.clinicianProfile.findUnique({ where: { userId: sub }, select: { id: true } });
    if (!clinician) return { id: { in: [] } };
    const patientIds = await patientsInClinicianCare(clinician.id);
    const patients = await prisma.patientProfile.findMany({ where: { id: { in: patientIds } }, select: { userId: true } });
    return { patientUserId: { in: patients.map((p) => p.userId) } };
  }
  return { patientUserId: sub };
}

const threadIdParamsSchema = z.object({ id: z.string().uuid() }).strict();

const createThreadSchema = z.object({
  subject: z.string().trim().min(1).max(255),
  body: z.string().trim().min(1).max(4000),
  recipientName: z.string().trim().min(1).max(150).optional(),
}).strict();

const replyMessageSchema = z.object({
  body: z.string().trim().min(1).max(4000),
}).strict();

// ─── GET /api/messages ────────────────────────────────────────────────────────
// Returns persistent message threads for the authenticated user.
// A new inbox is empty: no care-team threads are invented (CS-05).
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const threads = await prisma.messageThread.findMany({
    where: await visibleThreadsWhere(req),
    include: {
      messages: {
        orderBy: { sentAt: "asc" },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return res.json(
    await Promise.all(
      threads.map(async (t) => ({
        id: t.id,
        from: t.senderName,
        subject: t.subject,
        preview: t.preview,
        sentAtIso: t.updatedAt.toISOString(),
        isRead: t.isRead,
        hasAttachment: t.hasAttachment,
        messages: await Promise.all(
          t.messages.map(async (m) => ({
            id: m.id,
            senderRole: m.senderRole,
            senderName: m.senderName,
            body: await decryptString(m.body),
            sentAtIso: m.sentAt.toISOString(),
          }))
        ),
      }))
    )
  );
});

// ─── POST /api/messages ───────────────────────────────────────────────────────
router.post("/", requireAuth, validateBody(createThreadSchema), async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const { subject, body, recipientName } = req.body;

  // DB-3: Encrypt message body at rest
  const encrypted = await encryptField(body);
  const storedBody = JSON.stringify(encrypted);

  const thread = await prisma.messageThread.create({
    data: {
      patientUserId: userId,
      senderName: recipientName || "Pav Dental Clinical Team",
      subject,
      preview: body.slice(0, 180),
      isRead: true,
      hasAttachment: false,
      messages: {
        create: [
          {
            senderRole: req.user!.role,
            senderName: "You",
            body: storedBody,
          },
        ],
      },
    },
    include: { messages: true },
  });

  return res.status(201).json({
    id: thread.id,
    from: thread.senderName,
    subject: thread.subject,
    preview: thread.preview,
    sentAtIso: thread.updatedAt.toISOString(),
    isRead: thread.isRead,
    hasAttachment: thread.hasAttachment,
    messages: thread.messages.map((m) => ({
      ...m,
      body,
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
    const { body } = req.body;

    const thread = await prisma.messageThread.findFirst({
      where: { AND: [{ id: threadId }, await visibleThreadsWhere(req)] },
    });

    if (!thread) {
      return res.status(404).json({ error: "Message thread not found" });
    }

    // DB-3: Encrypt reply message body at rest
    const encrypted = await encryptField(body);
    const storedBody = JSON.stringify(encrypted);

    const [message, updatedThread] = await prisma.$transaction([
      prisma.message.create({
        data: {
          threadId: thread.id,
          senderRole: req.user!.role,
          senderName: "You",
          body: storedBody,
        },
      }),
      prisma.messageThread.update({
        where: { id: thread.id },
        data: {
          preview: `You: ${body.slice(0, 160)}`,
          isRead: true,
        },
        include: {
          messages: { orderBy: { sentAt: "asc" } },
        },
      }),
    ]);

    await createAuditLogWithIntegrity({
      action: "message.reply_sent",
      actorId: userId,
      resourceId: thread.id,
      sessionId: req.user!.sessionId,
      ipHash: pseudonymiseIp(req.ip || ""),
      metadata: {},
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
        subject: updatedThread.subject,
        preview: updatedThread.preview,
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

  await prisma.messageThread.delete({
    where: { id: threadId },
  });

  return res.json({ success: true, id: threadId });
});

export default router;
