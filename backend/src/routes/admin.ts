import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth, requireRole, AuthRequest } from "../middleware/auth";
import { validateParams, validateQuery, validateBody } from "../middleware/validate";
import {
  adminUsersQuerySchema,
  adminAppointmentsQuerySchema,
  appointmentIdParamsSchema,
  updateAppointmentStatusSchema,
  adminAuditLogsQuerySchema,
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
      orderBy: { createdAt: "desc" },
      take: limit,
      skip,
    }),
    prisma.user.count({ where: whereClause }),
  ]);

  const formattedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    phone: u.phone,
    role: u.role,
    isActive: u.isActive,
    emailVerified: u.emailVerified,
    createdAt: u.createdAt,
    name: "N/A",
    details: "System User",
  }));

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

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: status as any },
  });

  return res.json({ id: updated.id, status: updated.status, updatedAt: updated.updatedAt });
});

// ─── GET /api/admin/vans ──────────────────────────────────────────────────────
router.get("/vans", requireAuth, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const vans = await prisma.van.findMany({
    include: {
      servicePolygons: { select: { sectorName: true } },
      _count: { select: { appointments: true } },
    },
  });

  return res.json(vans);
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
