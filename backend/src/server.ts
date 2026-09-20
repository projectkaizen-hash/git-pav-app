import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth";
import patientRoutes from "./routes/patients";
import serviceRoutes from "./routes/services";
import bookingRoutes from "./routes/booking";
import vanRoutes from "./routes/van";
import auditRoutes from "./routes/audit";
import paymentRoutes from "./routes/payments";
import { stripeWebhookHandler } from "./routes/payments";
import videoRoutes from "./routes/video";
import prescriptionRoutes from "./routes/prescriptions";
import notificationRoutes from "./routes/notifications";
import cancellationRoutes from "./routes/cancellations";
import waitlistRoutes from "./routes/waitlist";
import dsptAuditRoutes from "./routes/dspt-audit";
import adminRoutes from "./routes/admin";
import consentRoutes from "./routes/consents";
import triageRoutes from "./routes/triage";
import { auditMiddleware } from "./middleware/audit";
import { attachOptionalAuth, requireAuth, requireRole, AuthRequest } from "./middleware/auth";
import { errorHandler, notFoundHandler, standardResponse } from "./middleware/error-handler";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { env } from "./config/env";
import { startAuditMonitoring } from "./lib/audit-monitoring";
import { startBackgroundJobs } from "./lib/background-jobs";

const app = express();
const PORT = env.port;

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Native mobile requests do not set Origin. Browser callers must be an
    // explicitly configured application origin.
    if (!origin || env.allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  credentials: true,
}));
// Stripe signs the raw request body, so this route must be registered before
// express.json() parses API requests.
app.post("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.use(express.json({ limit: "2mb" }));
app.use((_req, res, next) => {
  res.setHeader("x-request-id", crypto.randomUUID());
  next();
});

// ─── Global rate limiter ──────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Auth endpoints get a tighter limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many auth attempts, try again in 15 minutes" },
});

// ─── Request identity attachment ─────────────────────────────────────────────
// Attach optional auth for routes that need it (public catalog endpoints)
app.use(attachOptionalAuth);
app.use(standardResponse);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
  let dbOk = false;
  let redisOk = false;

  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {}

  try {
    await redis.ping();
    redisOk = true;
  } catch {}

  res.json({
    status: dbOk && redisOk ? "ok" : "degraded",
    service: "pavdental-backend-api",
    timestamp: new Date().toISOString(),
    checks: { database: dbOk ? "ok" : "error", redis: redisOk ? "ok" : "error" },
    dsptMode: "active",
  });
});

// ─── Audit Integrity Health Check ─────────────────────────────────────────────
app.get("/health/audit-integrity", requireAuth, requireRole("admin"), async (_req: AuthRequest, res: Response) => {
  const { manualIntegrityCheck } = await import("./lib/audit-monitoring.js");
  const result = await manualIntegrityCheck();

  res.json({
    status: result.verified ? "ok" : "error",
    checkedCount: result.checkedCount,
    issues: result.issues,
    timestamp: new Date().toISOString(),
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
// Public catalog endpoints (no auth required, no audit)
app.use("/api/services", serviceRoutes);
app.use("/api/clinicians", serviceRoutes);

// Protected routes with audit logging
app.use("/api/auth", authLimiter, auditMiddleware, authRoutes);
app.use("/api/patients", requireAuth, auditMiddleware, patientRoutes);
app.use("/api/booking", requireAuth, auditMiddleware, bookingRoutes);
app.use("/api/booking/appointments", requireAuth, auditMiddleware, cancellationRoutes);
app.use("/api/van", requireAuth, auditMiddleware, vanRoutes);
app.use("/api/audit", requireAuth, auditMiddleware, auditRoutes);
app.use("/api/payments", requireAuth, auditMiddleware, paymentRoutes);
app.use("/api/video", requireAuth, auditMiddleware, videoRoutes);
app.use("/api/prescriptions", requireAuth, auditMiddleware, prescriptionRoutes);
app.use("/api/notifications", requireAuth, auditMiddleware, notificationRoutes);
app.use("/api/waitlist", requireAuth, auditMiddleware, waitlistRoutes);
app.use("/api/dspt", requireAuth, auditMiddleware, dsptAuditRoutes);
app.use("/api/admin", requireAuth, auditMiddleware, adminRoutes);
app.use("/api/consents", requireAuth, auditMiddleware, consentRoutes);
app.use("/api/triage", requireAuth, auditMiddleware, triageRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Startup ──────────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`🏥 Pav Dental API running on port ${PORT}`);
    try {
      await redis.connect();
    } catch {
      console.warn("[Redis] Could not connect on startup — will retry lazily");
    }

    // Start audit monitoring services
    startAuditMonitoring();

    // Start background jobs (slot hold sweeper and notification dispatcher)
    startBackgroundJobs();
  });
}

export default app;
