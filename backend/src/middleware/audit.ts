import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { pseudonymiseIp } from "../lib/audit-security";
import { createAuditLogWithIntegrity, isCriticalAuditEvent, sendCriticalAuditAlert } from "../lib/audit-integrity";

// List of field names that may contain special-category clinical data
const CLINICAL_DATA_FIELDS = [
  "medicalHistory",
  "triageData",
  "clinicalNotes",
  "diagnosis",
  "prescription",
  "treatment",
  "symptoms",
  "condition",
  "medication",
  "allergies",
  "patientNotes",
  "chiefComplaint",
  "painLevel",
  "photos",
  "document",
  "swelling",
  "bleeding",
  "fever",
  "difficultyBreathing",
  "difficultySwallowing",
  "traumaHistory",
  "firstName",
  "lastName",
  "fullName",
  "name",
  "address",
  "phone",
  "email",
  "dob",
  "postcode",
];

function redactMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(metadata)) {
    // Skip redaction for non-object values
    if (typeof value !== "object" || value === null) {
      redacted[key] = value;
      continue;
    }

    // Recursively redact nested objects
    if (Array.isArray(value)) {
      redacted[key] = value.map(item => 
        typeof item === "object" && item !== null ? redactMetadata(item as Record<string, unknown>) : "[REDACTED_ARRAY]"
      );
    } else {
      const obj = value as Record<string, unknown>;
      const redactedObj: Record<string, unknown> = {};

      for (const [objKey, objValue] of Object.entries(obj)) {
        // Redact fields that might contain clinical data
        if (CLINICAL_DATA_FIELDS.some(field => objKey.toLowerCase().includes(field.toLowerCase()))) {
          redactedObj[objKey] = "[REDACTED]";
        } else if (typeof objValue === "object" && objValue !== null) {
          redactedObj[objKey] = redactMetadata(objValue as Record<string, unknown>);
        } else {
          redactedObj[objKey] = objValue;
        }
      }

      redacted[key] = redactedObj;
    }
  }

  return redacted;
}

export async function auditMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if ((res as any).__pavAuditAttached) {
    return next();
  }
  (res as any).__pavAuditAttached = true;

  res.on("finish", async () => {
    try {
      // AU-4: Use full router mount + route path as action
      const routePath = req.route?.path || req.path;
      const action = `${req.method} ${req.baseUrl}${routePath}`;

      // AU-4: Extract resource identifier from route parameters if present
      const resourceId =
        req.params?.id ??
        req.params?.patientId ??
        req.params?.appointmentId ??
        req.params?.requestId ??
        (req as any).resourceId ??
        null;

      // Build metadata with request details (body/params will be redacted)
      const metadata: Record<string, unknown> = {
        statusCode: res.statusCode,
        requestId: res.getHeader("x-request-id") ?? null,
        method: req.method,
        path: req.originalUrl || `${req.baseUrl}${req.path}`,
        outcome:
          res.statusCode < 400
            ? "success"
            : res.statusCode === 401 || res.statusCode === 403
            ? "denied"
            : "failed",
      };

      // Redact any clinical data from metadata before logging
      const redactedMetadata = redactMetadata(metadata);

      const log = await createAuditLogWithIntegrity({
        action,
        actorId: req.user?.sub ?? null,
        resourceId: resourceId ? String(resourceId) : null,
        sessionId: req.user?.sessionId ?? null,
        ipHash: pseudonymiseIp(req.ip || ""),
        metadata: redactedMetadata,
      });

      // AU-6: Check for critical events and send alerts (including denied attempts)
      if (isCriticalAuditEvent(action, res.statusCode)) {
        await sendCriticalAuditAlert(log);
      }
    } catch (err) {
      // Audit failures must never break the request
      console.error("[AUDIT FAILURE]", err);
    }
  });
  next();
}

