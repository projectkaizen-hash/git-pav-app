import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import multer from "multer";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";
import { validateBody } from "../middleware/validate";
import { createVideoRoomSchema, submitTriageSchema, admitPatientSchema } from "../schemas/video";
import { dailyApiClient } from "../lib/api-client";
import { objectStorage } from "../lib/object-storage";

const router = Router();

const DAILY_API_KEY = process.env.DAILY_API_KEY || "daily_dev_placeholder";

const ALLOWED_IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, and WebP image files are allowed"));
    }
  },
});

// ─── POST /api/video/rooms ───────────────────────────────────────────────────
// Creates a Daily.co WebRTC room for tele-dentistry consultation
router.post("/rooms", requireAuth, validateBody(createVideoRoomSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId } = req.body;

  try {
    let existingAppointment: {
      id: string;
      accessDetails: unknown;
      patient: { userId: string };
      clinician: { userId: string } | null;
    } | null = null;

    if (appointmentId) {
      existingAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true, clinician: true },
      });

      if (!existingAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      const isAuthorized =
        req.user!.sub === existingAppointment.patient.userId ||
        req.user!.sub === existingAppointment.clinician?.userId ||
        req.user!.role === "admin";

      if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const roomName = `pav-consult-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    if (DAILY_API_KEY === "daily_dev_placeholder" || !DAILY_API_KEY) {
      return res.status(503).json({
        error: "Daily.co API is not configured. Please set DAILY_API_KEY environment variable.",
      });
    }

    const roomData = await dailyApiClient.post<{ name: string; url: string; config?: { token: string } }>(
      "/rooms",
      {
        name: roomName,
        properties: {
          exp: Math.floor(Date.now() / 1000) + 3600,
          enable_chat: true,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
      }
    );

    if (existingAppointment) {
      await prisma.appointment.update({
        where: { id: existingAppointment.id },
        data: {
          accessDetails: {
            ...((existingAppointment.accessDetails as Record<string, unknown>) || {}),
            roomName: roomData.name,
            roomUrl: roomData.url,
            createdAt: new Date().toISOString(),
          },
        },
      });
    }

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
      error: "Failed to create video room. Please check Daily.co API configuration.",
    });
  }
});

// ─── POST /api/video/upload-triage-photo ─────────────────────────────────────
// Persists binary triage photo to ObjectStorage (S3 / durable encrypted disk)
// and records metadata in DocumentVault & Appointment.
router.post("/upload-triage-photo", requireAuth, upload.single("photo"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file || !req.file.buffer || req.file.buffer.length === 0) {
      return res.status(400).json({ error: "No valid photo file provided" });
    }

    const { appointmentId, slotLabel } = req.body as { appointmentId?: string; slotLabel?: string };

    let existingAppointment: {
      id: string;
      triageData: unknown;
      intraoralPhotos: string[];
      patient: { id: string; userId: string };
      clinician: { userId: string } | null;
    } | null = null;

    if (appointmentId) {
      existingAppointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { patient: true, clinician: true },
      });

      if (!existingAppointment) {
        return res.status(404).json({ error: "Appointment not found" });
      }

      const isAuthorized =
        req.user!.sub === existingAppointment.patient.userId ||
        req.user!.sub === existingAppointment.clinician?.userId ||
        req.user!.role === "admin";

      if (!isAuthorized) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const ext = req.file.mimetype === "image/png" ? "png" : req.file.mimetype === "image/webp" ? "webp" : "jpg";
    const keyScope = appointmentId || req.user!.sub;
    const fileKey = `triage/${keyScope}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploaded = await objectStorage.upload(fileKey, req.file.buffer, req.file.mimetype, {
      uploadedBy: req.user!.sub,
      appointmentId: appointmentId || "unlinked",
      slotLabel: slotLabel || "intraoral",
    });

    // Record in patient's DocumentVault if patient profile exists
    const targetPatientId =
      existingAppointment?.patient.id ??
      (
        await prisma.patientProfile.findUnique({
          where: { userId: req.user!.sub },
          select: { id: true },
        })
      )?.id;

    if (targetPatientId) {
      await prisma.documentVault.create({
        data: {
          patientId: targetPatientId,
          docType: "intraoral_photo",
          title: slotLabel ? `Triage Photo — ${slotLabel}` : "Telehealth Triage Photo",
          fileKey: uploaded.key,
          fileSizeBytes: String(uploaded.size),
        },
      });
    }

    if (existingAppointment) {
      const currentTriage = (existingAppointment.triageData as Record<string, unknown>) || {};
      const existingPhotos = Array.isArray(currentTriage.photos) ? (currentTriage.photos as string[]) : [];
      await prisma.appointment.update({
        where: { id: existingAppointment.id },
        data: {
          intraoralPhotos: [...(existingAppointment.intraoralPhotos || []), uploaded.key],
          triageData: {
            ...currentTriage,
            photos: [...existingPhotos, uploaded.url],
          },
        },
      });
    }

    return res.status(201).json({
      url: uploaded.url,
      key: uploaded.key,
      size: uploaded.size,
      sha256: uploaded.sha256,
    });
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
  }).then((result) => {
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result);
  });
});

// ─── GET /api/video/status/:appointmentId ────────────────────────────────────
// Real-time room admission check for telehealth waiting room
router.get("/status/:appointmentId", requireAuth, async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.appointmentId);
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      clinician: { select: { userId: true, fullName: true, gdcNumber: true } },
      patient: { select: { userId: true } },
    },
  });

  if (!appointment) {
    return res.status(404).json({ error: "Consultation appointment not found" });
  }

  const isAuthorized =
    req.user!.sub === appointment.patient.userId ||
    req.user!.sub === appointment.clinician?.userId ||
    req.user!.role === "admin";

  if (!isAuthorized) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const triageData = (appointment.triageData as Record<string, unknown>) || {};
  const accessDetails = (appointment.accessDetails as Record<string, unknown>) || {};
  const isAdmitted = appointment.status === "in_progress" || Boolean(triageData.admittedAt);

  return res.json({
    appointmentId: appointment.id,
    status: appointment.status,
    admitted: isAdmitted,
    admittedAt: triageData.admittedAt || null,
    clinicianName: appointment.clinician?.fullName || "On-Call Dental Clinician",
    roomUrl: accessDetails.roomUrl || null,
    roomName: accessDetails.roomName || null,
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
          ...((appointment.triageData as Record<string, unknown>) || {}),
          admittedAt: new Date().toISOString(),
          admittedBy: clinician.id,
        },
      },
    });

    return { appointment: updated, status: 200 };
  }).then((result) => {
    if (result.error) {
      return res.status(result.status).json({ error: result.error });
    }
    return res.status(result.status).json(result);
  });
});

export default router;
