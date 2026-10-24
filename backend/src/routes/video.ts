import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import multer from "multer";
import { withIdempotency, generateIdempotencyKey } from "../lib/idempotency";
import { validateBody } from "../middleware/validate";
import { HttpError } from "../middleware/error-handler";
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
      cb(new HttpError(400, "Only JPEG, PNG, and WebP image files are allowed"));
    }
  },
});

// ─── POST /api/video/rooms ───────────────────────────────────────────────────
// Joins the private Daily room for one video appointment. There is one room
// per appointment, and only that appointment's clinician and patient get a
// meeting token for it; the patient only once the clinician has admitted them.
// A room URL on its own lets nobody in.
const ROOM_GRACE_SECONDS = 30 * 60;
const ROOM_LATE_LIMIT_MS = 2 * 60 * 60 * 1000;

const roomNameFor = (appointmentId: string) => `pav-${appointmentId}`;

async function getOrCreatePrivateRoom(name: string, expSeconds: number) {
  const headers = { Authorization: `Bearer ${DAILY_API_KEY}` };
  try {
    return await dailyApiClient.get<{ name: string; url: string; privacy?: string }>(`/rooms/${name}`, { headers });
  } catch (err: any) {
    if (err?.statusCode !== 404) throw err;
  }
  return dailyApiClient.post<{ name: string; url: string; privacy?: string }>(
    "/rooms",
    {
      name,
      privacy: "private",
      properties: {
        exp: expSeconds,
        eject_at_room_exp: true,
        enable_chat: true,
        enable_screenshare: false,
        enable_prejoin_ui: false,
        start_video_off: false,
        start_audio_off: false,
      },
    },
    { headers }
  );
}

router.post("/rooms", requireAuth, validateBody(createVideoRoomSchema), async (req: AuthRequest, res: Response) => {
  const { appointmentId } = req.body as { appointmentId: string };

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: { select: { userId: true, firstName: true } },
      clinician: { select: { userId: true, fullName: true } },
    },
  });
  const isPatient = !!appointment && req.user!.sub === appointment.patient.userId;
  const isClinician = !!appointment && !!appointment.clinician && req.user!.sub === appointment.clinician.userId;
  // Same answer for "no such appointment" and "not yours".
  if (!appointment || (!isPatient && !isClinician)) {
    return res.status(404).json({ error: "Appointment not found" });
  }
  if (appointment.channel !== "video") {
    return res.status(409).json({ error: "This appointment isn't a video consultation" });
  }
  if (appointment.status !== "confirmed" && appointment.status !== "in_progress") {
    return res.status(409).json({ error: "This consultation isn't open" });
  }
  if (Date.now() > appointment.endTimeUtc.getTime() + ROOM_LATE_LIMIT_MS) {
    return res.status(409).json({ error: "This consultation has ended" });
  }
  const triage = (appointment.triageData as Record<string, unknown>) || {};
  const admitted = appointment.status === "in_progress" || Boolean(triage.admittedAt);
  if (isPatient && !admitted) {
    return res.status(409).json({ error: "Your clinician hasn't let you in yet. Please wait in the waiting room." });
  }

  if (DAILY_API_KEY === "daily_dev_placeholder" || !DAILY_API_KEY) {
    return res.status(503).json({ error: "Video consultations aren't set up yet. Please contact the practice." });
  }

  const expSeconds = Math.floor(Math.max(Date.now(), appointment.endTimeUtc.getTime()) / 1000) + ROOM_GRACE_SECONDS;
  try {
    const room = await getOrCreatePrivateRoom(roomNameFor(appointment.id), expSeconds);
    const { token } = await dailyApiClient.post<{ token: string }>(
      "/meeting-tokens",
      {
        properties: {
          room_name: room.name,
          is_owner: isClinician,
          // First name for the patient, full name for the clinician: what the
          // other person sees in the call.
          user_name: isClinician ? appointment.clinician!.fullName : appointment.patient.firstName,
          exp: expSeconds,
          eject_at_token_exp: true,
        },
      },
      { headers: { Authorization: `Bearer ${DAILY_API_KEY}` } }
    );

    await prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        accessDetails: {
          ...((appointment.accessDetails as Record<string, unknown>) || {}),
          roomName: room.name,
          roomUrl: room.url,
        },
      },
    });

    return res.status(201).json({
      roomName: room.name,
      url: room.url,
      token,
      isOwner: isClinician,
      expiresAt: new Date(expSeconds * 1000).toISOString(),
      isMock: false,
    });
  } catch (err: any) {
    console.error("[VIDEO ROOM ERROR]", err?.statusCode ?? "network", err?.message);
    return res.status(502).json({ error: "The video service didn't respond. Please try again." });
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

    if (appointment.channel !== "video" || (appointment.status !== "confirmed" && appointment.status !== "in_progress")) {
      return { error: "Only an open video consultation can be joined", status: 409 };
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
