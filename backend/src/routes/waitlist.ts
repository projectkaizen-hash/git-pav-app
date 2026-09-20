import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

interface WaitlistEntry {
  id: string;
  userId: string;
  serviceId: string;
  preferredDate: string;
  joinedAt: string;
  claimWindowExpiresAt?: string;
}

const waitlistQueue: WaitlistEntry[] = [];

// ─── POST /api/waitlist/join ──────────────────────────────────────────────────
router.post("/join", requireAuth, async (req: AuthRequest, res: Response) => {
  const { serviceId, preferredDate } = req.body;
  if (!serviceId || !preferredDate) {
    return res.status(400).json({ error: "serviceId and preferredDate required" });
  }

  const userId = req.user!.sub;
  const existing = waitlistQueue.find(
    (e) => e.userId === userId && e.preferredDate === preferredDate && e.serviceId === serviceId
  );

  if (existing) {
    return res.status(409).json({ error: "Already on waitlist for this service and date" });
  }

  const entry: WaitlistEntry = {
    id: `wl_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    userId,
    serviceId,
    preferredDate,
    joinedAt: new Date().toISOString(),
  };

  waitlistQueue.push(entry);
  const position = waitlistQueue.filter((e) => e.preferredDate === preferredDate).length;

  return res.status(201).json({
    id: entry.id,
    position,
    serviceId: entry.serviceId,
    preferredDate: entry.preferredDate,
    message: `Added to waitlist at position #${position}. You will receive a 30-min priority alert when a slot opens up.`,
  });
});

// ─── GET /api/waitlist ────────────────────────────────────────────────────────
router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.sub;
  const userEntries = waitlistQueue.filter((e) => e.userId === userId);
  return res.json(userEntries);
});

export default router;

