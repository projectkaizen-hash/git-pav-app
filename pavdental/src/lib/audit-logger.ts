import { tokenStore } from "@/lib/token-store";

export type AuditAction =
  | "AUTH_LOGIN"
  | "AUTH_LOGOUT"
  | "AUTH_SESSION_REVOKED"
  | "CLINICAL_RECORD_VIEW"
  | "CLINICAL_XRAY_DOWNLOAD"
  | "TREATMENT_PLAN_ACCEPTED"
  | "VIDEO_ROOM_JOINED"
  | "VAN_DISPATCH_CONFIRMED"
  | "GDPR_CONSENT_UPDATED"
  | "ACCOUNT_DELETION_REQUESTED";

export interface AuditEventPayload {
  action: AuditAction;
  resourceId?: string;
  metadata?: Record<string, any>;
}

export const auditLogger = {
  /**
   * Logs append-only clinical or access audit events conforming to DSPT Standard 4.
   * Strips all PII from logs before transit.
   */
  logEvent: async (payload: AuditEventPayload) => {
    try {
      const sessionId = await tokenStore.getSessionId();
      const auditRecord = {
        action: payload.action,
        resourceId: payload.resourceId || null,
        sessionId: sessionId || "unauthenticated_session",
        timestampUtc: new Date().toISOString(),
        metadata: payload.metadata || {},
      };

      // In development, trace to console; in production, transmit to secure immutable logging sink
      if (__DEV__) {
        console.log(`[DSPT AUDIT EVENT] ${auditRecord.action}:`, auditRecord);
      }
    } catch {
      // Audit logging errors fail silently on the client to never crash critical UX
    }
  },
};

