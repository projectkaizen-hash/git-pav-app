import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { triageCheckSchema } from "../schemas/triage";
import { checkRedFlags, validateTriageData, getEmergencyInfo } from "../lib/triage-escalation";

const router = Router();

// ─── POST /api/triage/check ───────────────────────────────────────────────────
// Check symptoms for red-flag patterns before booking
router.post("/check", requireAuth, validateBody(triageCheckSchema), async (req: AuthRequest, res: Response) => {
  const triageData = req.body;
  const userId = req.user!.sub;

  // Validate triage data
  const validation = validateTriageData(triageData);
  if (!validation.isValid) {
    return res.status(400).json({
      error: "Invalid triage data",
      errors: validation.errors,
    });
  }

  // Check for red-flag symptoms
  const redFlagCheck = checkRedFlags(triageData);

  // Get location-appropriate emergency info
  const emergencyInfo = getEmergencyInfo(triageData.location);

  const response = {
    isRedFlag: redFlagCheck.isRedFlag,
    flagType: redFlagCheck.flagType,
    shouldBlockBooking: redFlagCheck.shouldBlockBooking,
    emergencyInstructions: redFlagCheck.emergencyInstructions,
    emergencyNumber: redFlagCheck.emergencyNumber,
    reason: redFlagCheck.reason,
    emergencyInfo,
    canProceed: !redFlagCheck.shouldBlockBooking,
  };

  if (redFlagCheck.isRedFlag && redFlagCheck.shouldBlockBooking) {
    return res.status(403).json(response);
  }

  return res.json(response);
});

// ─── GET /api/triage/emergency-info ─────────────────────────────────────────────
// Get emergency information for a location
router.get("/emergency-info", async (req: AuthRequest, res: Response) => {
  const location = req.query.location as string | undefined;
  const emergencyInfo = getEmergencyInfo(location);
  return res.json(emergencyInfo);
});

export default router;
