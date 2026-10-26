# ADR-0001: Keep one modular-monolith API as the only owner of app data

## Status
Accepted (records the existing design, 26 Oct 2026).

## Context
Pav Dental is one private practice (Bradford) with a small number of clinicians, one van and patients booking a few times a year. The API (`backend/`) is one Express process with 29 route modules over one Postgres database. The mobile app and the staff dashboard both call it; the dashboard calls `/api/admin/*` as the signed-in staff member (`AGENTS.md`). Expected load is tens of requests per minute, with peaks when reminders go out or a van shift starts.

Health data is special category data under UK GDPR, so the fewer places it is stored and the fewer processors see it, the smaller the DPIA and the attack surface.

## Decision
Keep a single API service as the only owner of patient and clinical data. Organise it by feature modules (routes + `lib/` services) rather than by deployable services. The dashboard keeps no copy of app data and has no database connection to it.

## Alternatives considered
- **Microservices** (booking, payments, van, video as separate services): independent scaling and deploys, but needs service-to-service auth, distributed transactions for deposits and bookings, and more processors. No load or team-size reason justifies it.
- **Backend-as-a-service** (Supabase auth, row-level security, edge functions): less code, but would move authorisation into SQL policies and away from the tested Express middleware, and would mean a rewrite.
- **Dashboard with its own replica of app data**: faster dashboard queries, but two sources of truth for health data. Rejected by `AGENTS.md`.

## Consequences
- Positive: one place to enforce authorisation, auditing and encryption; ACID transactions across booking, payment and audit; one deploy.
- Negative: a bad deploy takes everything down at once, so release gating (ADR-0006) and rollback matter more; long files (`routes/van.ts` 1,425 lines, `routes/booking.ts` 1,079) need splitting as they grow.
- Neutral: horizontal scaling is possible later (stateless HTTP, Redis-backed rate limits) once background jobs have leadership (ADR-0002).

## Trade-offs
Simplicity and data-protection scope are prioritised over independent scaling of features.

## References
- `backend/src/server.ts`, `AGENTS.md`
- review-with-blocks assessment in `docs/completion/07-architecture-audit.md` section 2
