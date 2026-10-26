# Architecture decision records

One file per significant decision, in the format from the architecture-designer skill (context, decision, alternatives, consequences, status). Statuses: **Proposed** (needs the owner or isn't built yet), **Accepted** (in force), **Superseded**.

Owner decisions that are product or policy choices stay in [`../completion/04-decisions.md`](../completion/04-decisions.md); ADRs record the technical decisions that follow from them.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-modular-monolith-api.md) | Keep one modular-monolith API as the only owner of app data | Accepted |
| [0002](0002-postgres-backed-jobs.md) | Background work runs in the API process, using Postgres tables as queues | Accepted (lease part: Accepted with the fixes PR) |
| [0003](0003-production-topology-and-recovery.md) | Production topology, environment separation and recovery targets | Proposed |
| [0004](0004-node-runtime.md) | Run the backend on a supported Node LTS (22 now, 24 by April 2027) | Accepted |
| [0005](0005-mobile-ota-updates.md) | Add EAS Update before the first store build | Proposed |
| [0006](0006-release-gating.md) | Gate deploys on CI and run migrations as a pre-deploy step | Proposed |
