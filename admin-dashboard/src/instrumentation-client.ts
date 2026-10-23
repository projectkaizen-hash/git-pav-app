import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/error-scrub";

// Browser error reporting (CS-44). Same scrubbing as the server; no session
// replay, breadcrumbs or traces, as the screens show patient data. Off
// unless NEXT_PUBLIC_SENTRY_DSN is set.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    sendDefaultPii: false,
    defaultIntegrations: false,
    integrations: [
      Sentry.globalHandlersIntegration(),
      Sentry.linkedErrorsIntegration(),
      Sentry.dedupeIntegration(),
      Sentry.browserApiErrorsIntegration(),
    ],
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeBreadcrumb: () => null,
    beforeSend: scrubEvent,
  });
}
