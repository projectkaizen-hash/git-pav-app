import crypto from "crypto";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import 'express-async-errors';

import authRoutes from "./routes/auth";
import authAccountRoutes from "./routes/auth-account";
import authOtpRoutes from "./routes/auth-otp";
import patientRoutes from "./routes/patients";
import patientDependantsRoutes from "./routes/patient-dependants";
import serviceRoutes from "./routes/services";
import bookingRoutes from "./routes/booking";
import vanRoutes from "./routes/van";
import publicVanRoutes from "./routes/public-van";
import vanStopsRoutes from "./routes/van-stops";
import vanQueueRoutes from "./routes/van-queue";
import auditRoutes from "./routes/audit";
import paymentRoutes from "./routes/payments";
import { stripeWebhookHandler } from "./routes/payments";
import videoRoutes from "./routes/video";
import prescriptionRoutes from "./routes/prescriptions";
import prescriptionFileRoutes from "./routes/prescription-files";
import notificationRoutes from "./routes/notifications";
import cancellationRoutes from "./routes/cancellations";
import waitlistRoutes from "./routes/waitlist";
import dsptAuditRoutes from "./routes/dspt-audit";
import adminRoutes from "./routes/admin";
import adminScheduleRoutes from "./routes/admin-schedule";
import consentRoutes from "./routes/consents";
import triageRoutes from "./routes/triage";
import messageRoutes from "./routes/messages";
import financingRoutes from "./routes/financing";
import rewardRoutes from "./routes/rewards";
import { objectStorage } from "./lib/object-storage";
import { auditMiddleware } from "./middleware/audit";
import { attachOptionalAuth, requireAuth, requireRole, AuthRequest } from "./middleware/auth";
import { errorHandler, notFoundHandler, standardResponse } from "./middleware/error-handler";
import { buildRateLimiters, parseTrustProxy } from "./middleware/rate-limits";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { env } from "./config/env";
import { startAuditMonitoring } from "./lib/audit-monitoring";
import { startBackgroundJobs } from "./lib/background-jobs";
import { getCoverageBackend } from "./lib/van-coverage";

const app = express();
const PORT = env.port;
// Behind a load balancer req.ip is the balancer unless the hop count is set.
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

// ─── Security & parsing ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Native mobile requests do not set Origin. Browser callers must be an
    // explicitly configured application origin (or local/tunnel origins in dev).
    if (
      !origin ||
      env.allowedOrigins.includes(origin) ||
      (env.isDevelopment &&
        /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/.test(origin))
    ) {
      return callback(null, true);
    }
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

// ─── Request identity attachment ─────────────────────────────────────────────
// Attach optional auth for routes that need it (public catalog endpoints). It
// runs before the limiter so signed-in traffic is limited per user.
app.use(attachOptionalAuth);

// ─── Rate limiting ───────────────────────────────────────────────────────────
// Deployed, counters live in Redis so all replicas share them. Locally they stay
// in memory so repeated test runs don't accumulate. See middleware/rate-limits.ts.
const { globalLimiter, authLimiter } = buildRateLimiters({
  production: env.isProduction,
  redis: env.isProduction || env.isStaging ? redis : undefined,
});
app.use(globalLimiter);
app.use(standardResponse);

// ─── Health Check ─────────────────────────────────────────────────────────────
const healthCheckHandler = async (_req: Request, res: Response) => {
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

  const ok = dbOk && redisOk;
  res.status(ok ? 200 : 503).json({
    status: ok ? "ok" : "degraded",
    service: "pavdental-backend-api",
    timestamp: new Date().toISOString(),
    checks: { database: dbOk ? "ok" : "error", redis: redisOk ? "ok" : "error" },
    dsptMode: "active",
  });
};

app.get("/", healthCheckHandler);
app.get("/health", healthCheckHandler);
app.get("/healthz", healthCheckHandler);
app.get("/readyz", healthCheckHandler);
app.get("/livez", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "pavdental-backend-api", timestamp: new Date().toISOString() });
});

// ─── Signed Document Stream Endpoint ──────────────────────────────────────────
app.get("/api/patients/documents/stream/*", async (req: Request, res: Response) => {
  const key = (req.params as Record<string, string>)[0] || "";
  const expires = Number(req.query.expires || 0);
  const sig = String(req.query.sig || "");
  if (!key || !objectStorage.verifySignedUrl(key, expires, sig)) {
    res.status(403).json({ error: "Invalid or expired document signature" });
    return;
  }
  try {
    const file = await objectStorage.download(key);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop() || "document"}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.send(file.buffer);
  } catch {
    res.status(404).json({ error: "Document not found" });
  }
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
app.use("/api/public/van", publicVanRoutes);

// Protected routes with audit logging
// NOTE: the more specific /api/auth/* sub-routers must be mounted BEFORE the
// generic /api/auth mount — Express matches prefixes in registration order,
// so a later-mounted sub-router would still pass through the earlier mount's
// middleware (authLimiter running twice for OTP; account actions burning the
// login bucket — see routes/auth-account.ts header).
// Account sub-router: global limiter only (change-password/deletion are
// one-off authed actions, not auth attempts).
app.use("/api/auth/account", auditMiddleware, authAccountRoutes);
// Phone-OTP login (see routes/auth-otp.ts) — strict limiter, applied once.
app.use("/api/auth/otp", authLimiter, auditMiddleware, authOtpRoutes);
app.use("/api/auth", authLimiter, auditMiddleware, authRoutes);
// Mount specific /api/patients/dependants before generic /api/patients/:id
app.use("/api/patients/dependants", auditMiddleware, patientDependantsRoutes);
app.use("/api/patients", requireAuth, auditMiddleware, patientRoutes);
app.use("/api/booking/appointments", requireAuth, auditMiddleware, cancellationRoutes);
app.use("/api/booking", requireAuth, auditMiddleware, bookingRoutes);
app.use("/api/van", requireAuth, auditMiddleware, vanRoutes);
// Operator stop check-in (see routes/van-stops.ts) — scoped to active shift.
app.use("/api/van/stops", requireAuth, auditMiddleware, vanStopsRoutes);
// Queue optimization / manual reorder (see routes/van-queue.ts).
app.use("/api/van/shift", requireAuth, auditMiddleware, vanQueueRoutes);
app.use("/api/audit", requireAuth, auditMiddleware, auditRoutes);
app.use("/api/payments", requireAuth, auditMiddleware, paymentRoutes);
app.use("/api/video", requireAuth, auditMiddleware, videoRoutes);
app.use("/api/prescriptions", requireAuth, auditMiddleware, prescriptionRoutes);
// Short-lived signed links to prescription PDFs (no bearer token; see the route).
app.use("/api/prescription-files", prescriptionFileRoutes);
app.use("/api/notifications", requireAuth, auditMiddleware, notificationRoutes);
app.use("/api/waitlist", requireAuth, auditMiddleware, waitlistRoutes);
app.use("/api/dspt", requireAuth, auditMiddleware, dsptAuditRoutes);
app.use("/api/admin", requireAuth, auditMiddleware, adminRoutes, adminScheduleRoutes);
app.use("/api/consents", requireAuth, auditMiddleware, consentRoutes);
app.use("/api/triage", requireAuth, auditMiddleware, triageRoutes);
app.use("/api/messages", requireAuth, auditMiddleware, messageRoutes);
app.use("/api/financing", requireAuth, auditMiddleware, financingRoutes);
app.use("/api/rewards", requireAuth, auditMiddleware, rewardRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use(notFoundHandler);

// ─── Global error handler ─────────────────────────────────────────────────────
app.use(errorHandler);

// ─── Process-level error handlers ─────────────────────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // In production, you might want to use a proper error tracking service
  // For now, we log it but don't crash the process
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Uncaught exceptions can leave the application in an undefined state
  // It's generally safer to exit and let the process manager restart
  process.exit(1);
});

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

    // Probe the van-coverage backend (PostGIS vs JS fallback), backfill
    // polygon geometry when PostGIS is available, and defuse the derived-
    // geometry trigger when it is not.
    getCoverageBackend().catch((err) =>
      console.warn("[VAN COVERAGE] Startup probe failed:", err)
    );
  });
}

export default app;
