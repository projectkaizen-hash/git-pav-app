import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import multer from "multer";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";
import { validateBody } from "../middleware/validate";
import { createVideoRoomSchema, submitTriageSchema, admitPatientSchema } from "../schemas/video";
import { dailyApiClient } from "../lib/api-client";

const router = Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY || "daily_dev_placeholder";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ─── POST /api/video/rooms ───────────────────────────────────────────────────
// Creates a Daily.co WebRTC room for tele-dentistry consultation
router.post("/rooms", requireAuth, validateBody(createVideoRoomSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId } = req.body;

  try {
    const roomName = `pav-consult-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Validate API key is configured
    if (DAILY_API_KEY === "daily_dev_placeholder" || !DAILY_API_KEY) {
      return res.status(503).json({ 
        error: "Daily.co API is not configured. Please set DAILY_API_KEY environment variable." 
      });
    }

    const roomData = await dailyApiClient.post<{ name: string; url: string; config?: { token: string } }>('/rooms', {
      name: roomName,
      properties: {
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiration
        enable_chat: true,
        enable_screenshare: true,
        start_video_off: false,
        start_audio_off: false,
      },
    }, {
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
    });

    return res.status(201).json({
      roomName: roomData.name,
      url: roomData.url,
      token: roomData.config?.token ?? null,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      isMock: false,
    });
  } catch (err: any) {
    console.error("[VIDEO ROOM ERROR]", err.message);
    return res.status(500).json({ 
      error: "Failed to create video room. Please check Daily.co API configuration." 
    });
  }
});

// ─── POST /api/video/upload-triage-photo ─────────────────────────────────────
// Upload triage photo for video consultation
router.post("/upload-triage-photo", requireAuth, upload.single("photo"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No photo file provided" });
    }

    const { appointmentId } = req.body;
    
    // In production, upload to cloud storage (S3, Cloudinary, etc.)
    // For now, return a mock URL
    const photoUrl = `https://pavdental-storage.com/triage/${appointmentId}/${Date.now()}.jpg`;

    // Store photo reference in appointment triage data
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { triageData: true },
    });
    
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        triageData: {
          ...(existingAppointment?.triageData as Record<string, unknown> || {}),
          photos: [photoUrl],
        },
      },
    });

    return res.json({ url: photoUrl });
  } catch (error) {
    console.error("[TRIAGE PHOTO UPLOAD ERROR]", error);
    return res.status(500).json({ error: "Failed to upload triage photo" });
  }
});

// ─── POST /api/video/submit-triage ───────────────────────────────────────────
// Submit triage data for video consultation
router.post("/submit-triage", requireAuth, validateBody(submitTriageSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId, chiefComplaint, painLevel, duration, symptoms, photos } = req.body;
  const userId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("submit-triage", { appointmentId, userId });

  return withIdempotency(idempotencyKey, async () => {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { patient: { include: { user: true } } },
    });

    if (!appointment) {
      return { error: "Appointment not found", status: 404 };
    }

    if (appointment.patient.user.id !== userId) {
      return { error: "Unauthorized", status: 403 };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        triageData: {
          chiefComplaint,
          painLevel,
          duration,
          symptoms,
          photos,
          submittedAt: new Date().toISOString(),
        },
      },
    });

    return { triageData: updated.triageData, status: 200 };
  }).then(result => {
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result);
  });
});

// ─── GET /api/video/clinician-queue ───────────────────────────────────────────
// Get clinician's video consultation queue (clinician only)
router.get("/clinician-queue", requireAuth, async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== "clinician") {
    return res.status(403).json({ error: "Clinician access required" });
  }

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { userId: req.user!.sub },
  });

  if (!clinician) {
    return res.status(404).json({ error: "Clinician profile not found" });
  }

  const queue = await prisma.appointment.findMany({
    where: {
      clinicianId: clinician.id,
      channel: "video",
      status: { in: ["confirmed", "in_progress"] },
      startTimeUtc: { gte: new Date() },
    },
    include: {
      patient: {
        select: { firstName: true, lastName: true },
      },
      service: { select: { name: true } },
    },
    orderBy: { startTimeUtc: "asc" },
  });

  return res.json(queue);
});

// ─── POST /api/video/admit-patient ────────────────────────────────────────────
// Admit patient to video consultation (clinician only)
router.post("/admit-patient", requireAuth, validateBody(admitPatientSchema), async (req: AuthRequest, res: Response) => {
  if (req.user!.role !== "clinician") {
    return res.status(403).json({ error: "Clinician access required" });
  }

  const { appointmentId } = req.body;
  const clinicianId = req.user!.sub;
  const idempotencyKey = generateIdempotencyKey("admit-patient", { appointmentId, clinicianId });

  return withIdempotency(idempotencyKey, async () => {
    const clinician = await prisma.clinicianProfile.findUnique({
      where: { userId: clinicianId },
    });

    if (!clinician) {
      return { error: "Clinician profile not found", status: 404 };
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return { error: "Appointment not found", status: 404 };
    }

    if (appointment.clinicianId !== clinician.id) {
      return { error: "Not assigned to this clinician", status: 403 };
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "in_progress",
        triageData: {
          ...(appointment.triageData as any || {}),
          admittedAt: new Date().toISOString(),
          admittedBy: clinician.id,
        },
      },
    });

    return { appointment: updated, status: 200 };
  }).then(result => {
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result);
  });
});

export default router;

