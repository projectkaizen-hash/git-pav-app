# ADR-0003: Production topology, environment separation and recovery targets

## Status
Proposed. The owner approved a budget of roughly £60–£120 a month (D-10) and Render in Frankfurt (decision #19). Accounts and billing (C-10) come when going to production.

## Context
Only a free test stack exists (Render free web service, Supabase free, Upstash, Vercel). The free web service sleeps after 15 minutes without traffic and was found asleep on 26 Oct, so time-based jobs (ADR-0002) don't run. Supabase free has daily backups only; database backups don't include bucket objects. No restore has been tested.

Non-functional targets (architecture-designer NFR checklist, sized for one practice):

| Target | Value | Why |
|---|---|---|
| Availability | 99.5% monthly for the API | Patients can still phone the practice; no clinical decision depends on the app being up |
| RPO (data loss) | ≤ 5 minutes | Bookings, deposits and clinical notes are hard to reconstruct |
| RTO (time to restore) | ≤ 4 hours | Practice falls back to phone bookings meanwhile |
| API latency | p95 < 500 ms for reads, < 1 s for booking confirm | Mobile users on 4G |
| Load | ≤ 50 requests/second peak, ≤ 1,000 active patients in year one | Single clinic plus one van |

## Decision
Production (all UK or EU regions, separate accounts or projects from staging, separate secrets):

| Part | Choice |
|---|---|
| API | One always-on Render web service (paid instance), Frankfurt, Docker image from `backend/Dockerfile`, health check `/readyz`, pre-deploy `npx prisma migrate deploy` (ADR-0006) |
| Database | Supabase Pro in eu-west-2 (London) with the PITR add-on; PostGIS enabled; API uses the transaction pooler with `connection_limit=5`, migrations use the direct URL |
| Redis | Upstash paid plan, EU region; holds only ephemeral state (rate limits, slot holds, refresh grace) |
| Files | S3-compatible bucket in the UK/EU with server-side encryption and object versioning; lifecycle rule for old versions |
| Dashboard | Vercel (existing team), production project separate from preview |
| Monitoring | Sentry (API, app, dashboard), external uptime check on `/readyz` |

Staging keeps the free stack for demos but is not used for time-based testing; a short-lived paid staging run is used for the pre-launch soak (gate G8).

## Alternatives considered
- **Stay on free tiers**: no cost, but the job runner sleeps and there are no PITR backups. Not acceptable for patients.
- **Render Postgres instead of Supabase**: one vendor and private networking, but the test environment, PostGIS setup and runbooks are on Supabase today; switching adds migration risk now. Revisit if latency between Frankfurt and London matters (measure in BE-19).
- **AWS (ECS + RDS + S3 + KMS)**: most control, but more to operate for a one-person team and above the approved budget. Earlier docs claimed AWS hosting that never existed (V-04).
- **Two API instances for availability**: requires job leadership first (ADR-0002) and roughly doubles API cost; revisit after launch.

## Consequences
- Positive: jobs run continuously; worst-case data loss falls from a day to minutes; staging can't touch production data.
- Negative: monthly cost; four processors to list in the privacy notice and DPA tracker (LG-02); API (Frankfurt) to database (London) adds a few milliseconds per query, to be measured.
- Follow-ups: OPS-01, OPS-05 (restore drill), OPS-10, LG-02.

## References
- Render free tier behaviour, https://render.com/docs/free
- Supabase backups and PITR, https://supabase.com/docs/guides/platform/backups
- Prisma connection pool sizing, https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-pool
