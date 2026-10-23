import * as Sentry from "@sentry/node";
import type { ErrorEvent } from "@sentry/node";
import { env } from "../config/env";
import { scrubText } from "./log-safety";

// Error tracking (CS-44, decisions log #18). Sentry is outside the clinical
// boundary, so an event carries the error's type, a scrubbed message, the
// stack and a few tags (request id, method, route) and nothing else: no
// request bodies, headers, cookies, query strings, users or breadcrumbs.
// Off unless SENTRY_DSN is set.

export { scrubText };

let enabled = false;

/**
 * The last line of defence before an event leaves the server. Prisma error
 * messages can quote the values a query was called with, so they are dropped
 * entirely; other messages are pattern-scrubbed.
 */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  delete event.request;
  delete event.user;
  delete event.extra;
  delete event.breadcrumbs;
  delete event.server_name;
  if (event.contexts) {
    const { runtime, os, trace } = event.contexts;
    event.contexts = { ...(runtime && { runtime }), ...(os && { os }), ...(trace && { trace }) };
  }
  if (event.message) event.message = scrubText(event.message);
  for (const exception of event.exception?.values ?? []) {
    if (exception.type?.startsWith("PrismaClient")) exception.value = "(message withheld: may contain query values)";
    else if (exception.value) exception.value = scrubText(exception.value);
    for (const frame of exception.stacktrace?.frames ?? []) {
      delete frame.vars;
      delete frame.pre_context;
      delete frame.context_line;
      delete frame.post_context;
    }
  }
  return event;
}

export function initErrorTracking(opts: { dsn?: string; transport?: Sentry.NodeOptions["transport"] } = {}): void {
  const dsn = opts.dsn ?? env.sentryDsn;
  if (!dsn || enabled) return;
  Sentry.init({
    dsn,
    ...(opts.transport && { transport: opts.transport }),
    environment: env.sentryEnvironment,
    release: env.sentryRelease,
    sendDefaultPii: false,
    // No automatic instrumentation: it would attach request data and
    // breadcrumbs. Errors are reported explicitly through reportError.
    defaultIntegrations: false,
    integrations: [Sentry.linkedErrorsIntegration(), Sentry.dedupeIntegration()],
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    beforeSend: scrubEvent,
    beforeBreadcrumb: () => null,
  });
  enabled = true;
}

export function errorTrackingEnabled(): boolean {
  return enabled;
}

/** Reports an unexpected error with safe tags only. A no-op without a DSN. */
export function reportError(err: unknown, tags: { requestId?: string; method?: string; route?: string; source?: string } = {}): void {
  if (!enabled) return;
  Sentry.withScope((scope) => {
    for (const [key, value] of Object.entries(tags)) if (value) scope.setTag(key, value);
    Sentry.captureException(err instanceof Error ? err : new Error(`Non-error thrown: ${typeof err}`));
  });
}

/** Waits for queued events to send, e.g. before the process exits. */
export async function flushErrorTracking(timeoutMs = 2000): Promise<void> {
  if (enabled) await Sentry.flush(timeoutMs);
}
