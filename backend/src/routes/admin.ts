import crypto from "crypto";
import argon2 from "argon2";
import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { awardVisitPoints } from "../lib/rewards";
import { cancelAppointmentReminders } from "../lib/background-jobs";
import { createAuditLogWithIntegrity } from "../lib/audit-integrity";
import { pseudonymiseIp } from "../lib/audit-security";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { validateParams, validateQuery, validateBody } from "../middleware/validate";
import {
  adminUsersQuerySchema,
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  updateAppointmentStatusSchema,
  adminAuditLogsQuerySchema,
  createClinicianSchema,
  createOperatorSchema,
  createClinicSchema,
  createVanSchema,
  createServiceSchema,
  assignVanPolygonSchema,
  assignVanOperatorSchema,
  idParamsSchema,
} from "../schemas/admin";

const router = Router();

// ─── GET /api/admin/overview ──────────────────────────────────────────────────
// Returns top-level KPI metrics for the Admin Dashboard
router.get("/overview", requireAuth, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const [
    totalUsers,
    totalPatients,
    totalClinicians,
    totalAppointments,
    confirmedAppointments,
    completedAppointments,
    totalVans,
    recentAuditCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: "patient" } }),
    prisma.user.count({ where: { role: "clinician" } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { status: "confirmed" } }),
    prisma.appointment.count({ where: { status: "completed" } }),
    prisma.van.count({ where: { isActive: true } }),
    prisma.auditLog.count(),
  ]);

  // Aggregate revenue from confirmed & completed appointments
  const revenueAgg = await prisma.appointment.aggregate({
    _sum: {
      totalPricePence: true,
      depositPaidPence: true,
    },
    where: { status: { in: ["confirmed", "completed"] } },
  });

  const totalRevenuePence = revenueAgg._sum.totalPricePence || 0;
  const depositRevenuePence = revenueAgg._sum.depositPaidPence || 0;

  return res.json({
    kpis: {
      totalUsers,
      totalPatients,
      totalClinicians,
      totalAppointments,
      confirmedAppointments,
      completedAppointments,
      activeVans: totalVans,
      totalRevenueGbp: (totalRevenuePence / 100).toFixed(2),
      depositRevenueGbp: (depositRevenuePence / 100).toFixed(2),
      auditLogsRecorded: recentAuditCount,
      systemHealth: "OPTIMAL",
    },
    updatedAt: new Date().toISOString(),
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// List all users with optional role filtering and search
router.get("/users", requireAuth, requireRole("admin"), validateQuery(adminUsersQuerySchema), async (req: AuthRequest, res: Response) => {
  const { role, search, page, limit } = req.query as unknown as { role?: string; search?: string; page: number; limit: number };
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (role) whereClause.role = role;
  if (search) {
    whereClause.OR = [
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: whereClause,
      include: {
        patientProfile: { select: { firstName: true, lastName: true, city: true, postcode: true } },
        clinicianProfile: { select: { fullName: true, gdcNumber: true, roleTitle: true } },
        operatorProfile: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const formattedUsers = users.map((u) => {
    const name = u.patientProfile
      ? `${u.patientProfile.firstName} ${u.patientProfile.lastName}`.trim()
      : u.clinicianProfile?.fullName || u.operatorProfile?.fullName || u.email.split("@")[0];
    const details = u.clinicianProfile
      ? `GDC #${u.clinicianProfile.gdcNumber} · ${u.clinicianProfile.roleTitle}`
      : u.patientProfile
        ? [u.patientProfile.city, u.patientProfile.postcode].filter(Boolean).join(", ") || "Registered Patient"
        : u.operatorProfile
          ? "Mobile Van Operator"
          : "System Administrator";

    return {
      id: u.id,
      email: u.email,
      phone: u.phone,
      role: u.role,
      isActive: u.isActive,
      emailVerified: u.emailVerified,
      createdAt: u.createdAt,
      name,
      details,
    };
  });

  return res.json({ users: formattedUsers, total, page, limit });
});

// ─── GET /api/admin/appointments ──────────────────────────────────────────────
// List all appointments across clinic, van, and video channels
router.get("/appointments", requireAuth, requireRole("admin"), validateQuery(adminAppointmentsQuerySchema), async (req: AuthRequest, res: Response) => {
  const { status, channel, page, limit } = req.query as unknown as { status?: string; channel?: string; page: number; limit: number };
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (status) whereClause.status = status;
  if (channel) whereClause.channel = channel;

  const [appointments, total] = await Promise.all([
    prisma.appointment.findMany({
      where: whereClause,
      orderBy: { startTimeUtc: "desc" },
      take: limit,
      skip,
    }),
    prisma.appointment.count({ where: whereClause }),
  ]);

  const formatted = appointments.map((a) => ({
    id: a.id,
    patientId: a.patientId,
    clinicianId: a.clinicianId,
    serviceId: a.serviceId,
    channel: a.channel,
    startTimeUtc: a.startTimeUtc,
    endTimeUtc: a.endTimeUtc,
    status: a.status,
    totalPriceGbp: (a.totalPricePence / 100).toFixed(2),
    depositPaidGbp: (a.depositPaidPence / 100).toFixed(2),
    stripePaymentId: a.stripePaymentId,
  }));

  return res.json({ appointments: formatted, total, page, limit });
});

// ─── PATCH /api/admin/appointments/:id/status ─────────────────────────────────
// Admin status override
router.patch("/appointments/:id/status", requireAuth, requireRole("admin"), validateParams(appointmentIdParamsSchema), validateBody(updateAppointmentStatusSchema), async (req: AuthRequest, res: Response) => {
  const appointmentId = String(req.params.id);
  const { status } = req.body;

  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { id: true },
  });
  if (!existing) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: status as any },
  });

  // Points for a completed visit (decisions log #14); a repeat is a no-op.
  if (updated.status === "completed") await awardVisitPoints(updated.id);

  // If status changed to cancelled, cancel pending reminders
  if (updated.status === "cancelled") {
    await cancelAppointmentReminders(appointmentId).catch(() => {});
  }

  return res.json({ id: updated.id, status: updated.status, updatedAt: updated.updatedAt });
});

// ─── GET /api/admin/vans ──────────────────────────────────────────────────────
router.get("/vans", requireAuth, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const vans = await prisma.van.findMany({
    include: {
      servicePolygons: { select: { id: true, sectorName: true } },
      assignments: {
        include: { operator: { select: { fullName: true, phone: true } } },
        orderBy: { startsAt: "desc" },
        take: 5,
      },
      _count: { select: { appointments: true } },
    },
    orderBy: { name: "asc" },
  });

  return res.json(vans);
});

// ─── POST /api/admin/vans ─────────────────────────────────────────────────────
router.post("/vans", requireAuth, requireRole("admin"), validateBody(createVanSchema), async (req: AuthRequest, res: Response) => {
  const { name, registrationPlate, vehicleModel, isActive } = req.body;

  const existingPlate = await prisma.van.findUnique({ where: { registrationPlate } });
  if (existingPlate) {
    return res.status(409).json({ error: "Van with this registration plate already exists" });
  }

  const van = await prisma.van.create({
    data: {
      name,
      registrationPlate,
      vehicleModel,
      isActive: isActive ?? true,
    },
  });

  await createAuditLogWithIntegrity({
    action: "admin.van_created",
    actorId: req.user!.sub,
    resourceId: van.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { vanId: van.id, registrationPlate },
  });

  return res.status(201).json(van);
});

// ─── POST /api/admin/vans/:id/polygons ────────────────────────────────────────
router.post("/vans/:id/polygons", requireAuth, requireRole("admin"), validateParams(idParamsSchema), validateBody(assignVanPolygonSchema), async (req: AuthRequest, res: Response) => {
  const vanId = String(req.params.id);
  const { sectorName, polygonGeoJson } = req.body;

  const van = await prisma.van.findUnique({ where: { id: vanId } });
  if (!van) {
    return res.status(404).json({ error: "Van not found" });
  }

  const defaultGeoJson = {
    type: "Polygon",
    coordinates: [
      [
        [-0.15, 51.48],
        [-0.15, 51.55],
        [-0.05, 51.55],
        [-0.05, 51.48],
        [-0.15, 51.48],
      ],
    ],
  };

  const polygon = await prisma.vanServicePolygon.create({
    data: {
      vanId,
      sectorName,
      polygonGeoJson: (polygonGeoJson ?? defaultGeoJson) as any,
    },
  });

  await createAuditLogWithIntegrity({
    action: "admin.van_polygon_assigned",
    actorId: req.user!.sub,
    resourceId: polygon.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { vanId, sectorName, polygonId: polygon.id },
  });

  return res.status(201).json(polygon);
});

// ─── POST /api/admin/vans/:id/assignments ─────────────────────────────────────
router.post("/vans/:id/assignments", requireAuth, requireRole("admin"), validateParams(idParamsSchema), validateBody(assignVanOperatorSchema), async (req: AuthRequest, res: Response) => {
  const vanId = String(req.params.id);
  const { operatorId, startsAt, endsAt } = req.body;

  const [van, operator] = await Promise.all([
    prisma.van.findUnique({ where: { id: vanId } }),
    prisma.operatorProfile.findUnique({ where: { id: operatorId } }),
  ]);

  if (!van) return res.status(404).json({ error: "Van not found" });
  if (!operator) return res.status(404).json({ error: "Operator not found" });

  const assignment = await prisma.vanOperatorAssignment.create({
    data: {
      vanId,
      operatorId,
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      endsAt: endsAt ? new Date(endsAt) : null,
    },
  });

  await createAuditLogWithIntegrity({
    action: "admin.van_operator_assigned",
    actorId: req.user!.sub,
    resourceId: assignment.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { vanId, operatorId, assignmentId: assignment.id },
  });

  return res.status(201).json(assignment);
});

// ─── POST /api/admin/clinicians ───────────────────────────────────────────────
// Onboards a clinician without direct SQL
router.post("/clinicians", requireAuth, requireRole("admin"), validateBody(createClinicianSchema), async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, gdcNumber, roleTitle, specialisms, bio, photoUrl, isTelehealthActive } = req.body;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return res.status(409).json({ error: "User with this email already exists" });
  }

  const existingGdc = await prisma.clinicianProfile.findUnique({ where: { gdcNumber } });
  if (existingGdc) {
    return res.status(409).json({ error: "Clinician with this GDC number already exists" });
  }

  const pwd = password || crypto.randomUUID();
  const passwordHash = await argon2.hash(pwd);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "clinician",
        emailVerified: true,
      },
    });
    const profile = await tx.clinicianProfile.create({
      data: {
        userId: user.id,
        fullName,
        gdcNumber,
        roleTitle,
        specialisms,
        bio: bio ?? null,
        photoUrl: photoUrl ?? null,
        isTelehealthActive: isTelehealthActive ?? true,
      },
    });
    return { user, profile };
  });

  await createAuditLogWithIntegrity({
    action: "admin.clinician_created",
    actorId: req.user!.sub,
    resourceId: result.profile.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { clinicianId: result.profile.id, gdcNumber, email },
  });

  return res.status(201).json({
    id: result.profile.id,
    userId: result.user.id,
    email: result.user.email,
    fullName: result.profile.fullName,
    gdcNumber: result.profile.gdcNumber,
    roleTitle: result.profile.roleTitle,
    specialisms: result.profile.specialisms,
    bio: result.profile.bio,
    photoUrl: result.profile.photoUrl,
    isTelehealthActive: result.profile.isTelehealthActive,
    createdAt: result.profile.createdAt,
  });
});

// ─── POST /api/admin/operators ────────────────────────────────────────────────
// Onboards a van operator without direct SQL
router.post("/operators", requireAuth, requireRole("admin"), validateBody(createOperatorSchema), async (req: AuthRequest, res: Response) => {
  const { email, password, fullName, phone } = req.body;

  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return res.status(409).json({ error: "User with this email already exists" });
  }

  const pwd = password || crypto.randomUUID();
  const passwordHash = await argon2.hash(pwd);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "operator",
        emailVerified: true,
      },
    });
    const profile = await tx.operatorProfile.create({
      data: {
        userId: user.id,
        fullName,
        phone: phone ?? null,
      },
    });
    return { user, profile };
  });

  await createAuditLogWithIntegrity({
    action: "admin.operator_created",
    actorId: req.user!.sub,
    resourceId: result.profile.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { operatorId: result.profile.id, email },
  });

  return res.status(201).json({
    id: result.profile.id,
    userId: result.user.id,
    email: result.user.email,
    fullName: result.profile.fullName,
    phone: result.profile.phone,
    createdAt: result.profile.createdAt,
  });
});

// ─── POST /api/admin/clinics ──────────────────────────────────────────────────
router.post("/clinics", requireAuth, requireRole("admin"), validateBody(createClinicSchema), async (req: AuthRequest, res: Response) => {
  const { name, address, postcode, city, phone, operatingHours, isActive } = req.body;

  const clinic = await prisma.clinic.create({
    data: {
      name,
      address,
      postcode,
      city,
      phone,
      operatingHours,
      isActive: isActive ?? true,
    },
  });

  await createAuditLogWithIntegrity({
    action: "admin.clinic_created",
    actorId: req.user!.sub,
    resourceId: clinic.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { clinicId: clinic.id, name, postcode },
  });

  return res.status(201).json(clinic);
});

// ─── Services ─────────────────────────────────────────────────────────────────
router.get("/services", requireAuth, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const services = await prisma.service.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(services);
});

router.post("/services", requireAuth, requireRole("admin"), validateBody(createServiceSchema), async (req: AuthRequest, res: Response) => {
  const {
    name,
    description,
    category,
    durationMinutes,
    pricePence,
    depositPence,
    supportedChannels,
    prepInstructions,
    requiresPriorConsult,
    isActive,
  } = req.body;

  const id = `srv_${crypto.randomUUID().slice(0, 8)}`;
  const service = await prisma.service.create({
    data: {
      id,
      name,
      description,
      category: category ?? "checkup",
      durationMinutes,
      pricePence,
      depositPence,
      supportedChannels: supportedChannels ?? ["clinic", "van", "video"],
      prepInstructions: prepInstructions ?? [],
      requiresPriorConsult: requiresPriorConsult ?? false,
      isActive: isActive ?? true,
    },
  });

  await createAuditLogWithIntegrity({
    action: "admin.service_created",
    actorId: req.user!.sub,
    resourceId: service.id,
    sessionId: req.user!.sessionId,
    ipHash: pseudonymiseIp(req.ip || ""),
    metadata: { serviceId: service.id, name, pricePence },
  });

  return res.status(201).json(service);
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
router.get("/audit-logs", requireAuth, requireRole("admin"), validateQuery(adminAuditLogsQuerySchema), async (req: AuthRequest, res: Response) => {
  const { page, limit } = req.query as unknown as { page: number; limit: number };
  const skip = (page - 1) * limit;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { timestampUtc: "desc" },
      take: limit,
      skip,
    }),
    prisma.auditLog.count(),
  ]);

  const formattedLogs = logs.map((log) => ({
    ...log,
    id: log.id.toString(),
  }));

  return res.json({ logs: formattedLogs, total, page, limit });
});

export default router;
