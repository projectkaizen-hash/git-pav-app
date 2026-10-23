import { Router, Response } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";

const router = Router();

// ─── Persistence ──────────────────────────────────────────────────────────────
// The waitlist was previously an in-memory array: entries vanished on server
// restart and duplicated across instances. Entries now persist in the
// waitlist_entries table; position is assigned transactionally per
// (serviceId, preferredDate) queue so concurrent joins can't collide.
//
// Response contract is unchanged from the in-memory version (the e2e suite
// asserts on it): join → 201 { id, position, serviceId, preferredDate, message }.

const joinWaitlistSchema = z
  .object({
    serviceId: z.string().trim().min(1),
    preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "preferredDate must be YYYY-MM-DD"),
  })
  .strict();

// ─── POST /api/waitlist/join ──────────────────────────────────────────────────
router.post("/join", requireAuth, validateBody(joinWaitlistSchema), async (req: AuthRequest, res: Response) => {
  const { serviceId, preferredDate } = req.body;
  const userId = req.user!.sub;

  try {
    const entry = await prisma.$transaction(async (tx) => {
      const existing = await tx.waitlistEntry.findUnique({
        where: {
          serviceId_preferredDate_userId: {
            serviceId,
            preferredDate,
            userId,
          },
        },
      });
      if (existing) return null;

      const max = await tx.waitlistEntry.aggregate({
        where: { serviceId, preferredDate },
        _max: { position: true },
      });
      const position = (max._max.position ?? 0) + 1;

      return tx.waitlistEntry.create({
        data: { userId, serviceId, preferredDate, position },
      });
    });

    if (!entry) {
      return res.status(409).json({ error: "Already on waitlist for this service and date" });
    }

    return res.status(201).json({
      id: entry.id,
      position: entry.position,
      serviceId: entry.serviceId,
      preferredDate: entry.preferredDate,
      message: `Added to waitlist at position #${entry.position}. You will receive a 30-min priority alert when a slot opens up.`,
    });
  } catch (error) {
    console.error("[WAITLIST] join failed:", error);
    return res.status(500).json({ error: "Could not join the waitlist. Please try again." });
  }
});

// ─── GET /api/waitlist ────────────────────────────────────────────────────────
// Returns the caller's entries with a live queue position per queue.
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;

  const entries = await prisma.waitlistEntry.findMany({
    where: { userId },
    orderBy: [{ preferredDate: "asc" }, { position: "asc" }],
  });

  if (entries.length === 0) {
    return res.json([]);
  }

  // Recompute live positions with a single batch query instead of N+1 counts.
  const queueKeys = Array.from(
    new Map(
      entries.map((e) => [
        `${e.serviceId}:${e.preferredDate}`,
        { serviceId: e.serviceId, preferredDate: e.preferredDate },
      ])
    ).values()
  );

  const allQueueEntries = await prisma.waitlistEntry.findMany({
    where: { OR: queueKeys },
    select: { serviceId: true, preferredDate: true, position: true },
  });

  return res.json(
    entries.map((entry) => {
      const ahead = allQueueEntries.filter(
        (q) =>
          q.serviceId === entry.serviceId &&
          q.preferredDate === entry.preferredDate &&
          q.position < entry.position
      ).length;
      return {
        id: entry.id,
        userId: entry.userId,
        serviceId: entry.serviceId,
        preferredDate: entry.preferredDate,
        joinedAt: entry.joinedAt.toISOString(),
        position: ahead + 1,
      };
    })
  );
});

// ─── DELETE /api/waitlist/:id ─────────────────────────────────────────────────
router.delete("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  const id = String(req.params.id);
  const userId = req.user!.sub;

  const existing = await prisma.waitlistEntry.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return res.status(404).json({ error: "Waitlist entry not found" });
  }

  await prisma.waitlistEntry.delete({ where: { id } });
  return res.json({ success: true, id });
});

export default router;
