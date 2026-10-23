import { Router, Response } from "express";
import type { AuthRequest } from "../middleware/auth";

// The waitlist was removed (decisions log #13, CS-32): nothing ever offered a
// freed slot to anyone on it. Older app builds get a clear answer instead of a
// list that never moves. The waitlist_entries table is left in place; dropping
// it is a separate, reviewed migration.
const router = Router();

router.all("*", (_req: AuthRequest, res: Response) => {
  return res.status(410).json({ error: "The waitlist is no longer available. Please book an available time instead." });
});

export default router;
