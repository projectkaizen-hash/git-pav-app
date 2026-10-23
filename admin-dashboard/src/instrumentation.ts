import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/error-scrub";

// Server-side error reporting (CS-44, decisions log #18). The dashboard shows
// patient data, so an event carries only the error type, a scrubbed message,
// the stack and the route: no request data, users, breadcrumbs or traces.
// Off unless SENTRY_DSN is set.
export function register() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn || process.env.NEXT_RUNTIME !== "nodejs") return;
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [Sentry.linkedErrorsIntegration(), Sentry.dedupeIntegration()],
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
  });
}

export const onRequestError = Sentry.captureRequestError;
